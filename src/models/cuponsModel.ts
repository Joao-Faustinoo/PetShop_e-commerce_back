/**
 * [MODEL] Model de cupons
 *
 * O QUE FAZ: lê os cupons disponíveis, grava o cupom emitido e marca os
 * que entraram ou saíram de um pagamento.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: quem decide se um cupom
 * vale, quanto dele é consumido e se ele era necessário é o service.
 *
 * As operações de escrita exigem o `tx` explicitamente, sem valor padrão:
 * todas acontecem dentro da finalização da compra ou do recebimento de uma
 * troca, e nenhuma pode escapar da transação que as cerca.
 *
 * ATENDE: RF0037, RF0044, RF0045, RN0036
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Cupom, TipoCupom } from '../types/cupons/types';
import { Executor } from '../utils/transacao';

type LinhaCupom = Prisma.CupomGetPayload<Record<string, never>>;

/** Dados já decididos pelo service, prontos para gravar. */
export interface DadosCupom {
  codigo: string;
  valor: number;
  validade: Date;
  clienteId: number;
}

const paraCupom = (linha: LinhaCupom): Cupom => ({
  id: linha.id,
  codigo: linha.codigo,
  tipo: linha.tipo as TipoCupom,
  valor: linha.valor.toNumber(),
  validade: linha.validade.toISOString().slice(0, 10),
  utilizado: linha.utilizado,
  clienteId: linha.clienteId ?? undefined,
});

export const cuponsModel = {
  /**
   * Os cupons que o cliente pode usar. O promocional vale para qualquer
   * cliente; o de troca é nominal de quem o recebeu.
   */
  async listarDisponiveis(
    clienteId: number,
    validoDe: Date,
    tx: Executor = prisma,
  ): Promise<Cupom[]> {
    const linhas = await tx.cupom.findMany({
      where: {
        utilizado: false,
        validade: { gte: validoDe },
        OR: [{ clienteId }, { clienteId: null }],
      },
      orderBy: [{ tipo: 'asc' }, { validade: 'asc' }],
    });

    return linhas.map(paraCupom);
  },

  async buscarPorCodigo(codigo: string, tx: Executor = prisma): Promise<Cupom | null> {
    const linha = await tx.cupom.findUnique({ where: { codigo } });

    return linha ? paraCupom(linha) : null;
  },

  async definirUtilizado(
    ids: number[],
    utilizado: boolean,
    tx: Executor,
  ): Promise<void> {
    if (ids.length === 0) return;

    await tx.cupom.updateMany({ where: { id: { in: ids } }, data: { utilizado } });
  },

  async criarDeTroca(dados: DadosCupom, tx: Executor): Promise<Cupom> {
    return paraCupom(await tx.cupom.create({ data: { ...dados, tipo: 'TROCA' } }));
  },
};
