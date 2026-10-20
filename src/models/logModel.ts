/**
 * [MODEL] Model de log de transações
 *
 * O QUE FAZ: grava quem alterou o quê, quando, e como o dado estava antes.
 *
 * COMO FARÁ: uma linha por operação de escrita, com os dados anteriores e
 * os novos em JSON. Recebe o executor por parâmetro para poder ser
 * chamado de dentro da transação do checkout: o registro só existe se a
 * operação existir.
 *
 * O histórico de status de um pedido é lido daqui, em vez de ter tabela
 * própria — a informação é a mesma, e assim não há dois lugares para
 * desencontrar.
 *
 * ATENDE: RNF0012
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { HistoricoStatus, StatusPedido } from '../types/pedidos/types';

type Executor = Prisma.TransactionClient | typeof prisma;

export type Operacao = 'INSERCAO' | 'ALTERACAO';

interface RegistroLog {
  usuarioId: number;
  operacao: Operacao;
  entidade: string;
  entidadeId: string | number;
  antes?: unknown;
  depois?: unknown;
}

/** JSON do Prisma não aceita `undefined`; vira ausência de valor. */
const paraJson = (valor: unknown): Prisma.InputJsonValue | undefined =>
  valor === undefined ? undefined : (JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue);

export const logModel = {
  async registrar(
    { usuarioId, operacao, entidade, entidadeId, antes, depois }: RegistroLog,
    tx: Executor = prisma,
  ): Promise<void> {
    await tx.logTransacao.create({
      data: {
        usuarioId,
        operacao,
        entidade,
        entidadeId: String(entidadeId),
        dadosAnteriores: paraJson(antes),
        dadosNovos: paraJson(depois),
      },
    });
  },

  /**
   * O caminho de um pedido entre os status, montado a partir do que foi
   * registrado. A primeira linha é a criação; as seguintes, as mudanças.
   */
  async historicoDoPedido(pedidoId: number): Promise<HistoricoStatus[]> {
    const linhas = await prisma.logTransacao.findMany({
      where: { entidade: 'Pedido', entidadeId: String(pedidoId) },
      orderBy: { dataHora: 'asc' },
    });

    return linhas
      .map(linha => {
        const novos = linha.dadosNovos as { status?: StatusPedido } | null;

        return novos?.status
          ? {
              status: novos.status,
              dataHora: linha.dataHora.toISOString(),
              usuarioId: linha.usuarioId,
            }
          : null;
      })
      .filter((h): h is HistoricoStatus => h !== null);
  },
};
