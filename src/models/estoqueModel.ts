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
import { Paginacao } from '../types/common/types';
import {
  EstoqueFiltros,
  ItemEstoque,
  MovimentacaoEstoque,
  TipoMovimentacao,
} from '../types/estoque/types';
import { recorte } from '../utils/paginacao';
import { Executor } from '../utils/transacao';

/** De onde veio a movimentação: a venda, a troca, ou a entrada manual. */
export interface OrigemMovimentacao {
  pedidoId?: number;
  trocaId?: number;
  usuarioId?: number;
  observacao?: string;
}

export interface DadosMovimentacao extends OrigemMovimentacao {
  produtoId: number;
  tipo: TipoMovimentacao;
  quantidade: number;
  valorCusto?: number;
  fornecedorId?: number;
}

/** RN0050: produto, quantidade, custo, fornecedor e data, todos exigidos. */
export interface DadosEntrada {
  produtoId: number;
  quantidade: number;
  valorCusto: number;
  fornecedorId: number;
  dataEntrada: Date;
  usuarioId: number;
}

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
    origem: OrigemMovimentacao = {},
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

    // RF0053: a saída precisa deixar rastro. Os lotes consumidos são
    // apagados, então sem este registro a unidade vendida desapareceria
    // sem deixar como saber que saiu.
    await this.registrarMovimentacao(
      { produtoId, tipo: 'BAIXA', quantidade, ...origem },
      tx,
    );
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
    origem: OrigemMovimentacao = {},
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

    const valorCusto = referencia?.valorCusto ?? produto.valorCusto;

    await tx.itemEstoque.create({
      data: {
        produtoId,
        quantidade,
        valorCusto,
        fornecedorId,
        dataEntrada: new Date(),
      },
    });

    await this.registrarMovimentacao(
      {
        produtoId,
        tipo: 'REENTRADA',
        quantidade,
        valorCusto: valorCusto.toNumber(),
        fornecedorId,
        ...origem,
      },
      tx,
    );
  },

  /** RN0050: o fornecedor da entrada precisa estar registrado. */
  async fornecedorExiste(id: number, tx: Executor = prisma): Promise<boolean> {
    return (await tx.fornecedor.findUnique({ where: { id } })) !== null;
  },

  /** A posição do estoque por produto, como a tela do admin a exibe. */
  async posicao(filtros: EstoqueFiltros): Promise<ItemEstoque[]> {
    const produtos = await prisma.produto.findMany({
      where: filtros.produtoNome
        ? {
            OR: [
              { nome: { contains: filtros.produtoNome, mode: 'insensitive' } },
              { sku: { contains: filtros.produtoNome, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, sku: true },
    });

    const saldos = await this.saldos(produtos.map(p => p.id));

    const custos = await prisma.itemEstoque.groupBy({
      by: ['produtoId'],
      where: { produtoId: { in: produtos.map(p => p.id) }, quantidade: { gt: 0 } },
      _max: { valorCusto: true },
    });
    const maiorCusto = new Map(
      custos.map(c => [c.produtoId, c._max.valorCusto?.toNumber() ?? 0]),
    );

    const itens = produtos.map(p => {
      const saldo = saldos.get(p.id);

      return {
        produtoId: p.id,
        produtoNome: p.nome,
        produtoSku: p.sku,
        quantidadeDisponivel: saldo?.disponivel ?? 0,
        quantidadeBloqueada: saldo?.bloqueado ?? 0,
        maiorValorCusto: maiorCusto.get(p.id) ?? 0,
      };
    });

    return filtros.apenasSemEstoque
      ? itens.filter(i => i.quantidadeDisponivel === 0)
      : itens;
  },

  /** O registro de uma entrada, saída ou devolução (RF0053, RF0054). */
  async registrarMovimentacao(
    dados: DadosMovimentacao,
    tx: Executor,
  ): Promise<void> {
    await tx.movimentacaoEstoque.create({
      data: { ...dados, usuarioId: dados.usuarioId ?? 0 },
    });
  },

  /** RF0051: o lote novo, com fornecedor e data que a RN0050 exige. */
  async registrarEntrada(
    dados: DadosEntrada,
    tx: Executor,
  ): Promise<void> {
    await tx.itemEstoque.create({
      data: {
        produtoId: dados.produtoId,
        quantidade: dados.quantidade,
        valorCusto: dados.valorCusto,
        fornecedorId: dados.fornecedorId,
        dataEntrada: dados.dataEntrada,
      },
    });

    await this.registrarMovimentacao(
      {
        produtoId: dados.produtoId,
        tipo: 'ENTRADA',
        quantidade: dados.quantidade,
        valorCusto: dados.valorCusto,
        fornecedorId: dados.fornecedorId,
        usuarioId: dados.usuarioId,
      },
      tx,
    );
  },

  /**
   * RN0051: o maior custo entre os lotes **com saldo** daquele produto.
   * Filtrar pelo saldo importa: um lote antigo e já vendido inflaria o
   * preço para sempre, mesmo sem nenhuma unidade dele no depósito.
   */
  async maiorCustoComSaldo(
    produtoId: number,
    tx: Executor = prisma,
  ): Promise<number | null> {
    const lote = await tx.itemEstoque.findFirst({
      where: { produtoId, quantidade: { gt: 0 } },
      orderBy: { valorCusto: 'desc' },
      select: { valorCusto: true },
    });

    return lote ? lote.valorCusto.toNumber() : null;
  },

  async listarMovimentacoes(
    produtoId: number | undefined,
    paginacao: Paginacao,
  ): Promise<{ itens: MovimentacaoEstoque[]; total: number }> {
    const where = produtoId ? { produtoId } : {};

    const [linhas, total] = await prisma.$transaction([
      prisma.movimentacaoEstoque.findMany({
        where,
        include: { produto: { select: { nome: true } } },
        orderBy: [{ dataHora: 'desc' }, { id: 'desc' }],
        ...recorte(paginacao),
      }),
      prisma.movimentacaoEstoque.count({ where }),
    ]);

    return {
      itens: linhas.map(l => ({
        id: l.id,
        tipo: l.tipo as TipoMovimentacao,
        produtoId: l.produtoId,
        produtoNome: l.produto.nome,
        quantidade: l.quantidade,
        valorCusto: l.valorCusto?.toNumber() ?? 0,
        fornecedorId: l.fornecedorId ?? undefined,
        dataEntrada: l.dataHora.toISOString(),
        usuarioId: l.usuarioId,
        observacao: l.observacao ?? undefined,
      })),
      total,
    };
  },
};
