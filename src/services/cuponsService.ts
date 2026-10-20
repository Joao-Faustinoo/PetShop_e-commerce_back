/**
 * [MODEL] Service de cupons
 *
 * O QUE FAZ: valida cupons, escolhe quanto de cada um será consumido numa
 * compra e emite o cupom de troco.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`.
 *
 * ATENDE: RF0037, RN0033, RN0035, RN0036
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Cupom, TipoCupom, ValidacaoCupom } from '../types/cupons/types';
import { ApiError } from '../utils/ApiError';

type Executor = Prisma.TransactionClient | typeof prisma;

const duasCasas = (valor: number): number => Number(valor.toFixed(2));

type LinhaCupom = Prisma.CupomGetPayload<Record<string, never>>;

const paraCupom = (linha: LinhaCupom): Cupom => ({
  id: linha.id,
  codigo: linha.codigo,
  tipo: linha.tipo as TipoCupom,
  valor: linha.valor.toNumber(),
  validade: linha.validade.toISOString().slice(0, 10),
  utilizado: linha.utilizado,
  clienteId: linha.clienteId ?? undefined,
});

/** Hoje às 00:00, para a validade do dia ainda valer. */
const hoje = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  return d;
};

export const cuponsService = {
  /** RF0044: os cupons que o cliente tem para usar. */
  async listarDoCliente(clienteId: number): Promise<Cupom[]> {
    const linhas = await prisma.cupom.findMany({
      where: {
        utilizado: false,
        validade: { gte: hoje() },
        // Promocional vale para qualquer cliente; o de troca é nominal.
        OR: [{ clienteId }, { clienteId: null }],
      },
      orderBy: [{ tipo: 'asc' }, { validade: 'asc' }],
    });

    return linhas.map(paraCupom);
  },

  /**
   * RN0037: a veracidade e a validade de um cupom, conferidas antes de ele
   * entrar no pagamento.
   */
  async validar(codigo: string, clienteId: number): Promise<ValidacaoCupom> {
    const linha = await prisma.cupom.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
    });

    if (!linha) return { valido: false, motivo: 'Cupom não encontrado.' };
    if (linha.utilizado) return { valido: false, motivo: 'Este cupom já foi utilizado.' };
    if (linha.validade < hoje()) return { valido: false, motivo: 'Este cupom está vencido.' };
    if (linha.clienteId !== null && linha.clienteId !== clienteId) {
      return { valido: false, motivo: 'Este cupom pertence a outro cliente.' };
    }

    return { valido: true, cupom: paraCupom(linha) };
  },

  /**
   * RN0033 e RN0036: confere o conjunto de cupons escolhido para uma
   * compra. Recusa mais de um promocional e recusa cupom que não precisava
   * entrar — se os cupons já cobrem a compra sem ele, ele sobra.
   *
   * Devolve quanto cada cupom será consumido e quanto virou troco.
   */
  async conferirConjunto(
    codigos: string[],
    clienteId: number,
    valorDaCompra: number,
  ): Promise<{ cupons: Cupom[]; consumido: number; troco: number }> {
    const cupons: Cupom[] = [];

    for (const codigo of codigos) {
      const { valido, motivo, cupom } = await this.validar(codigo, clienteId);

      if (!valido || !cupom) {
        throw ApiError.requisicaoInvalida(`${codigo}: ${motivo}`);
      }
      if (cupons.some(c => c.id === cupom.id)) {
        throw ApiError.requisicaoInvalida(
          `O cupom ${cupom.codigo} foi informado duas vezes.`,
        );
      }

      cupons.push(cupom);
    }

    // RN0033: apenas um promocional por compra.
    const promocionais = cupons.filter(c => c.tipo === 'PROMOCIONAL');

    if (promocionais.length > 1) {
      throw ApiError.requisicaoInvalida(
        'Apenas um cupom promocional pode ser usado por compra.',
      );
    }

    const somaCupons = duasCasas(cupons.reduce((s, c) => s + c.valor, 0));

    // RN0036: nenhum cupom pode ser dispensável. Se a compra fecha sem um
    // deles, ele não deveria estar aqui — o DRS proíbe o uso desnecessário.
    for (const cupom of cupons) {
      const semEle = duasCasas(somaCupons - cupom.valor);

      if (semEle >= valorDaCompra) {
        throw ApiError.requisicaoInvalida(
          `O cupom ${cupom.codigo} não é necessário: os demais já cobrem a compra.`,
        );
      }
    }

    const consumido = Math.min(somaCupons, valorDaCompra);

    return {
      cupons,
      consumido: duasCasas(consumido),
      troco: duasCasas(Math.max(somaCupons - valorDaCompra, 0)),
    };
  },

  /** Marca como usados os cupons que entraram no pagamento. */
  async marcarUtilizados(ids: number[], tx: Executor = prisma): Promise<void> {
    if (ids.length === 0) return;

    await tx.cupom.updateMany({
      where: { id: { in: ids } },
      data: { utilizado: true },
    });
  },

  /** Devolve ao cliente os cupons de uma compra que não foi aprovada. */
  async devolver(ids: number[], tx: Executor = prisma): Promise<void> {
    if (ids.length === 0) return;

    await tx.cupom.updateMany({
      where: { id: { in: ids } },
      data: { utilizado: false },
    });
  },

  /**
   * RN0036 e RF0044: emite um cupom de troca nominal, usado tanto para o
   * troco da compra quanto para devolver o valor de uma troca recebida.
   */
  async emitir(
    clienteId: number,
    valor: number,
    tx: Executor = prisma,
    diasValidade = 365,
  ): Promise<Cupom> {
    const validade = new Date();
    validade.setDate(validade.getDate() + diasValidade);

    const codigo = `TRC-${Date.now().toString(36).toUpperCase()}${Math.floor(
      Math.random() * 100,
    )
      .toString()
      .padStart(2, '0')}`;

    const linha = await tx.cupom.create({
      data: {
        codigo,
        tipo: 'TROCA',
        valor: duasCasas(valor),
        validade,
        clienteId,
      },
    });

    return paraCupom(linha);
  },
};
