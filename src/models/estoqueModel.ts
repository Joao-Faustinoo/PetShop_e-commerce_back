/**
 * [MODEL] Model de estoque
 *
 * O QUE FAZ: diz quanto há de cada produto, quanto está preso em carrinho,
 * e movimenta o saldo na venda e na troca.
 *
 * COMO FARÁ: o saldo de um produto é a soma dos lotes em `item_estoque`.
 * O bloqueio não tem coluna própria: ele é derivado dos carrinhos cujo
 * prazo ainda não expirou (RN0044), porque "item bloqueado" é exatamente
 * "item que está no carrinho de alguém". Disponível = saldo − bloqueado.
 *
 * ATENDE: RF0053, RF0054, RN0028, RN0031, RN0044
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { env } from '../config/env';

/** Transação ou cliente normal: as operações servem aos dois. */
type Executor = Prisma.TransactionClient | typeof prisma;

/**
 * RN0044: o prazo corre a partir do último item incluído, e o carrinho
 * registra isso em `atualizadoEm`. Antes deste instante, o carrinho ainda
 * segura os itens; depois, eles voltam a ficar livres.
 */
export const limiteDeBloqueio = (): Date =>
  new Date(Date.now() - env.minutosBloqueioCarrinho * 60 * 1000);

export interface SaldoProduto {
  produtoId: number;
  /** Soma dos lotes, sem descontar nada. */
  emEstoque: number;
  /** RN0044: preso em carrinhos que ainda não expiraram. */
  bloqueado: number;
  /** O que a loja pode vender agora. */
  disponivel: number;
}

const zerado = (produtoId: number): SaldoProduto => ({
  produtoId,
  emEstoque: 0,
  bloqueado: 0,
  disponivel: 0,
});

export const estoqueModel = {
  /**
   * Saldo de vários produtos de uma vez. Duas consultas agregadas em vez
   * de duas por produto: a listagem do catálogo pede isso de 20 produtos
   * ao mesmo tempo, e a RNF0011 dá 1 segundo para a resposta.
   */
  async saldos(produtoIds: number[], tx: Executor = prisma): Promise<Map<number, SaldoProduto>> {
    if (produtoIds.length === 0) return new Map();

    const [lotes, bloqueios] = await Promise.all([
      tx.itemEstoque.groupBy({
        by: ['produtoId'],
        where: { produtoId: { in: produtoIds } },
        _sum: { quantidade: true },
      }),
      tx.itemCarrinho.groupBy({
        by: ['produtoId'],
        where: {
          produtoId: { in: produtoIds },
          // Item já colhido pela expiração não bloqueia mais nada.
          expiradoEm: null,
          carrinho: { atualizadoEm: { gt: limiteDeBloqueio() } },
        },
        _sum: { quantidade: true },
      }),
    ]);

    const saldos = new Map<number, SaldoProduto>(
      produtoIds.map(id => [id, zerado(id)]),
    );

    lotes.forEach(l => {
      const saldo = saldos.get(l.produtoId);
      if (saldo) saldo.emEstoque = l._sum.quantidade ?? 0;
    });

    bloqueios.forEach(b => {
      const saldo = saldos.get(b.produtoId);
      if (saldo) saldo.bloqueado = b._sum.quantidade ?? 0;
    });

    saldos.forEach(saldo => {
      saldo.disponivel = Math.max(saldo.emEstoque - saldo.bloqueado, 0);
    });

    return saldos;
  },

  async saldo(produtoId: number, tx: Executor = prisma): Promise<SaldoProduto> {
    const saldos = await this.saldos([produtoId], tx);

    return saldos.get(produtoId) ?? zerado(produtoId);
  },

  /**
   * RN0044 vista do outro lado: quanto este cliente já tem deste produto no
   * próprio carrinho. Serve para não contar o bloqueio dele contra ele
   * mesmo ao validar a RN0031.
   */
  async bloqueadoPeloCliente(
    clienteId: number,
    produtoId: number,
    tx: Executor = prisma,
  ): Promise<number> {
    const item = await tx.itemCarrinho.findFirst({
      where: {
        produtoId,
        expiradoEm: null,
        carrinho: { clienteId, atualizadoEm: { gt: limiteDeBloqueio() } },
      },
      select: { quantidade: true },
    });

    return item?.quantidade ?? 0;
  },

  /**
   * RF0053: baixa do que foi vendido, consumindo os lotes mais antigos
   * primeiro. O lote zerado some, para o saldo continuar sendo a soma
   * simples das linhas.
   */
  async darBaixa(
    produtoId: number,
    quantidade: number,
    tx: Executor = prisma,
  ): Promise<void> {
    let restante = quantidade;

    const lotes = await tx.itemEstoque.findMany({
      where: { produtoId, quantidade: { gt: 0 } },
      orderBy: { dataEntrada: 'asc' },
    });

    for (const lote of lotes) {
      if (restante <= 0) break;

      const consumir = Math.min(lote.quantidade, restante);
      restante -= consumir;

      if (consumir === lote.quantidade) {
        await tx.itemEstoque.delete({ where: { id: lote.id } });
      } else {
        await tx.itemEstoque.update({
          where: { id: lote.id },
          data: { quantidade: lote.quantidade - consumir },
        });
      }
    }
  },

  /**
   * RF0054: o item devolvido na troca volta como um lote novo, datado de
   * hoje. Entra como lote em vez de somar a um existente para o histórico
   * mostrar de onde o saldo veio.
   */
  async darReentrada(
    produtoId: number,
    quantidade: number,
    tx: Executor = prisma,
  ): Promise<void> {
    const referencia = await tx.itemEstoque.findFirst({
      where: { produtoId },
      orderBy: { dataEntrada: 'desc' },
    });

    const produto = await tx.produto.findUniqueOrThrow({
      where: { id: produtoId },
      select: { valorCusto: true },
    });

    const fornecedorId =
      referencia?.fornecedorId ??
      (await tx.fornecedor.findFirstOrThrow({ select: { id: true } })).id;

    await tx.itemEstoque.create({
      data: {
        produtoId,
        quantidade,
        valorCusto: referencia?.valorCusto ?? produto.valorCusto,
        fornecedorId,
        dataEntrada: new Date(),
      },
    });
  },
};
