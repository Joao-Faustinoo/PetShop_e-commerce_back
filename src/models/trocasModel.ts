/**
 * [MODEL] Model de trocas
 *
 * O QUE FAZ: lê os pedidos de troca, grava a solicitação e muda o status
 * da troca ao longo do ciclo.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: quem decide se a compra
 * pode ser trocada, quanto de cada item ainda está disponível e se a troca
 * cobre a compra inteira é o service.
 *
 * As operações de escrita exigem o `tx` explicitamente: cada passo da
 * troca muda a troca e o pedido juntos, e os dois precisam valer ou falhar
 * como um só.
 *
 * ATENDE: RF0041, RF0042, RF0043, RF0044, RN0041, RN0042, RN0043
 */

import { Prisma, SituacaoPedido, StatusTroca } from '@prisma/client';

import { prisma } from '../config/prisma';
import { ItemTroca, PedidoTroca, TrocaFiltros } from '../types/trocas/types';
import { Executor } from '../utils/transacao';

const comTudo = {
  itens: { orderBy: { id: 'asc' } },
  pedido: { select: { numero: true } },
  cliente: { select: { nome: true } },
  cupomGerado: { select: { id: true, codigo: true } },
} as const satisfies Prisma.TrocaInclude;

type Linha = Prisma.TrocaGetPayload<{ include: typeof comTudo }>;

/** Um item da compra, do jeito que o service precisa para conferir a troca. */
export interface ItemComprado {
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  valorUnitario: number;
}

/** A compra e o que dela já foi pedido em trocas anteriores. */
export interface CompraParaTroca {
  id: number;
  clienteId: number;
  situacao: SituacaoPedido;
  itens: ItemComprado[];
  jaPedidos: { produtoId: number; quantidade: number }[];
}

/** O que a autorização e o recebimento precisam saber da troca. */
export interface TrocaEmCurso {
  id: number;
  pedidoId: number;
  pedidoNumero: string;
  clienteId: number;
  status: StatusTroca;
  valorTotal: number;
  itens: { produtoId: number; quantidade: number }[];
}

/** Dados da solicitação, já conferidos pelo service. */
export interface DadosTroca {
  pedidoId: number;
  clienteId: number;
  motivo: string;
  trocaTotal: boolean;
  valorTotal: number;
  itens: ItemTroca[];
}

const paraItem = (linha: Linha['itens'][number]): ItemTroca => ({
  produtoId: linha.produtoId,
  produtoNome: linha.produtoNome,
  quantidade: linha.quantidade,
  valorUnitario: linha.valorUnitario.toNumber(),
  subtotal: linha.subtotal.toNumber(),
});

const paraTroca = (linha: Linha): PedidoTroca => ({
  id: linha.id,
  pedidoId: linha.pedidoId,
  pedidoNumero: linha.pedido.numero,
  clienteId: linha.clienteId,
  clienteNome: linha.cliente.nome,
  itens: linha.itens.map(paraItem),
  motivo: linha.motivo,
  status: linha.status,
  dataSolicitacao: linha.dataSolicitacao.toISOString(),
  valorTotal: linha.valorTotal.toNumber(),
  cupomGeradoId: linha.cupomGerado?.id,
  cupomGeradoCodigo: linha.cupomGerado?.codigo,
  retornouAoEstoque: linha.retornouAoEstoque ?? undefined,
  trocaTotal: linha.trocaTotal,
});

/** RNF0035, no mesmo formato do cliente e do pedido: TRC-0000. */
const numeroDe = (id: number): string => `TRC-${String(id).padStart(4, '0')}`;

export const trocasModel = {
  async listar(filtros: TrocaFiltros, tx: Executor = prisma): Promise<PedidoTroca[]> {
    const linhas = await tx.troca.findMany({
      where: {
        ...(filtros.status && { status: filtros.status as StatusTroca }),
        ...(filtros.clienteId && { clienteId: filtros.clienteId }),
      },
      include: comTudo,
      orderBy: { dataSolicitacao: 'desc' },
    });

    return linhas.map(paraTroca);
  },

  async buscarPorId(id: number, tx: Executor = prisma): Promise<PedidoTroca | null> {
    const linha = await tx.troca.findUnique({ where: { id }, include: comTudo });

    return linha ? paraTroca(linha) : null;
  },

  /** A compra e o histórico de trocas dela, base do que ainda pode ser pedido. */
  async compraParaTroca(
    pedidoId: number,
    tx: Executor,
  ): Promise<CompraParaTroca | null> {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true, trocas: { include: { itens: true } } },
    });

    if (!pedido) return null;

    return {
      id: pedido.id,
      clienteId: pedido.clienteId,
      situacao: pedido.situacao,
      itens: pedido.itens.map(i => ({
        produtoId: i.produtoId,
        produtoNome: i.produtoNome,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario.toNumber(),
      })),
      jaPedidos: pedido.trocas.flatMap(t =>
        t.itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
      ),
    };
  },

  async buscarEmCurso(id: number, tx: Executor): Promise<TrocaEmCurso | null> {
    const troca = await tx.troca.findUnique({
      where: { id },
      include: { itens: true, pedido: { select: { numero: true } } },
    });

    if (!troca) return null;

    return {
      id: troca.id,
      pedidoId: troca.pedidoId,
      pedidoNumero: troca.pedido.numero,
      clienteId: troca.clienteId,
      status: troca.status,
      valorTotal: troca.valorTotal.toNumber(),
      itens: troca.itens.map(i => ({
        produtoId: i.produtoId,
        quantidade: i.quantidade,
      })),
    };
  },

  /**
   * O número deriva do id, como em cliente e pedido: a linha nasce com um
   * provisório e é corrigida na mesma transação, porque o id só existe
   * depois da inserção. Contar linhas daria número repetido sob concorrência.
   */
  async criar(dados: DadosTroca, tx: Executor): Promise<number> {
    const { itens, ...resto } = dados;

    const criada = await tx.troca.create({
      data: {
        ...resto,
        numero: `TMP-${Date.now().toString(36)}`,
        status: StatusTroca.EM_TROCA,
        itens: { create: itens },
      },
      select: { id: true },
    });

    await tx.troca.update({
      where: { id: criada.id },
      data: { numero: numeroDe(criada.id) },
    });

    return criada.id;
  },

  async atualizarStatus(
    id: number,
    status: StatusTroca,
    tx: Executor,
    extras?: { retornouAoEstoque?: boolean; cupomGeradoId?: number },
  ): Promise<void> {
    await tx.troca.update({ where: { id }, data: { status, ...extras } });
  },
};
