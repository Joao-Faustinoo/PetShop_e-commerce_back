/**
 * [MODEL] Model de notificações
 *
 * O QUE FAZ: lê os avisos de um cliente, marca um como lido e grava o
 * aviso que o sistema gera ao autorizar ou concluir uma troca.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato que
 * a tela consome. Não aplica regra de negócio: quem decide que um aviso
 * deve existir é o service da troca.
 *
 * A gravação exige o `tx` explicitamente: ela acontece dentro da mesma
 * transação que muda o status da troca, e um aviso que sobrevivesse a uma
 * transação desfeita avisaria o cliente de algo que não aconteceu.
 *
 * ATENDE: RNF0046
 */

import { prisma } from '../config/prisma';
import { Executor } from '../utils/transacao';

export interface Notificacao {
  id: number;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  pedidoId?: number;
}

/** Dados do aviso, já redigidos pelo service. */
export interface DadosNotificacao {
  clienteId: number;
  pedidoId: number;
  mensagem: string;
}

export const notificacoesModel = {
  async listarDoCliente(
    clienteId: number,
    limite = 50,
    tx: Executor = prisma,
  ): Promise<Notificacao[]> {
    const linhas = await tx.notificacao.findMany({
      where: { clienteId },
      orderBy: { criadoEm: 'desc' },
      take: limite,
    });

    return linhas.map(n => ({
      id: n.id,
      mensagem: n.mensagem,
      lida: n.lida,
      criadoEm: n.criadoEm.toISOString(),
      pedidoId: n.pedidoId ?? undefined,
    }));
  },

  /**
   * O `clienteId` no filtro é o que impede marcar aviso alheio: sem ele, o
   * id sozinho alcançaria a notificação de qualquer cliente.
   */
  async marcarLida(
    clienteId: number,
    id: number,
    tx: Executor = prisma,
  ): Promise<boolean> {
    const { count } = await tx.notificacao.updateMany({
      where: { id, clienteId },
      data: { lida: true },
    });

    return count > 0;
  },

  async criar(dados: DadosNotificacao, tx: Executor): Promise<void> {
    await tx.notificacao.create({ data: dados });
  },
};
