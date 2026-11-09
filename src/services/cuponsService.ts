/**
 * [MODEL] Service de cupons
 *
 * O QUE FAZ: valida cupons, escolhe quanto de cada um será consumido numa
 * compra e emite o cupom de troco.
 *
 * COMO FARÁ: aplica as regras do DRS sobre o `cuponsModel`, lançando
 * ApiError quando uma delas é violada. Não conhece o Prisma, nem `req`,
 * nem `res`.
 *
 * ATENDE: RF0037, RF0044, RF0045, RN0033, RN0035, RN0036
 */

import { cuponsModel } from '../models/cuponsModel';
import { Cupom, ValidacaoCupom } from '../types/cupons/types';
import { ApiError } from '../utils/ApiError';
import { Executor } from '../utils/transacao';

const duasCasas = (valor: number): number => Number(valor.toFixed(2));

/**
 * A data de hoje no fuso de quem usa o sistema, no formato da coluna de
 * validade. Comparar como texto evita o engano de medir uma coluna `date`
 * — que o Prisma devolve à meia-noite UTC — contra um horário local: num
 * fuso atrás de UTC, o cupom que vence hoje pareceria vencido o dia todo.
 */
const hoje = (): string => {
  const agora = new Date();

  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

/** A mesma data, como `Date`, para comparar com a coluna no banco. */
const inicioDeHoje = (): Date => new Date(`${hoje()}T00:00:00.000Z`);

export const cuponsService = {
  /** RF0044: os cupons que o cliente tem para usar. */
  async listarDoCliente(clienteId: number): Promise<Cupom[]> {
    return cuponsModel.listarDisponiveis(clienteId, inicioDeHoje());
  },

  /**
   * RN0037: a veracidade e a validade de um cupom, conferidas antes de ele
   * entrar no pagamento.
   */
  async validar(codigo: string, clienteId: number): Promise<ValidacaoCupom> {
    const cupom = await cuponsModel.buscarPorCodigo(codigo.trim().toUpperCase());

    if (!cupom) return { valido: false, motivo: 'Cupom não encontrado.' };
    if (cupom.utilizado) return { valido: false, motivo: 'Este cupom já foi utilizado.' };
    // O cupom que vence hoje ainda vale hoje.
    if (cupom.validade < hoje()) return { valido: false, motivo: 'Este cupom está vencido.' };
    if (cupom.clienteId !== undefined && cupom.clienteId !== clienteId) {
      return { valido: false, motivo: 'Este cupom pertence a outro cliente.' };
    }

    return { valido: true, cupom };
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
  async marcarUtilizados(ids: number[], tx: Executor): Promise<void> {
    await cuponsModel.definirUtilizado(ids, true, tx);
  },

  /** Devolve ao cliente os cupons de uma compra que não foi aprovada. */
  async devolver(ids: number[], tx: Executor): Promise<void> {
    await cuponsModel.definirUtilizado(ids, false, tx);
  },

  /**
   * RN0036 e RF0045: emite um cupom de troca nominal, usado tanto para o
   * troco da compra quanto para devolver o valor de uma troca recebida.
   */
  async emitir(
    clienteId: number,
    valor: number,
    tx: Executor,
    diasValidade = 365,
  ): Promise<Cupom> {
    const validade = new Date();
    validade.setDate(validade.getDate() + diasValidade);

    const codigo = `TRC-${Date.now().toString(36).toUpperCase()}${Math.floor(
      Math.random() * 100,
    )
      .toString()
      .padStart(2, '0')}`;

    return cuponsModel.criarDeTroca(
      { codigo, valor: duasCasas(valor), validade, clienteId },
      tx,
    );
  },
};
