/**
 * [MODEL] Model de pedidos
 *
 * O QUE FAZ: lê pedidos com itens, pagamentos e endereço, e grava as
 * mudanças de situação.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. O item do pedido carrega o nome e o SKU congelados na
 * compra — se o produto mudar depois, a nota não muda. Não aplica regra de
 * negócio: isso é do service.
 *
 * ATENDE: RF0033, RF0038, RF0039, RF0040, RNF0035
 */

import { FormaPagamento, Prisma, SituacaoPedido } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Executor } from '../utils/transacao';
import { Endereco, TipoEndereco } from '../types/enderecos/types';
import {
  ItemPedido,
  Pagamento,
  Pedido,
  PedidoFiltros,
  StatusPedido,
} from '../types/pedidos/types';
import { Paginacao } from '../types/common/types';
import { recorte } from '../utils/paginacao';
import { logModel } from './logModel';

/** Um item da compra, já com o produto copiado pelo service. */
export interface ItemParaGravar {
  produtoId: number;
  produtoNome: string;
  produtoSku: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

/** Dados da compra, já conferidos e calculados pelo service. */
export interface DadosPedido {
  clienteId: number;
  enderecoEntregaId: number;
  frete: number;
  subtotal: number;
  total: number;
  itens: ItemParaGravar[];
}

/** Uma parcela do pagamento: um cartão ou um cupom. */
export interface DadosPagamento {
  pedidoId: number;
  forma: FormaPagamento;
  valor: number;
  cartaoId?: number;
  cupomId?: number;
}

const comTudo = {
  cliente: { select: { nome: true } },
  enderecoEntrega: true,
  itens: {
    include: { produto: { select: { categorias: { select: { categoriaId: true } } } } },
    orderBy: { id: 'asc' },
  },
  pagamentos: {
    include: {
      cartao: { select: { numero: true } },
      cupom: { select: { codigo: true } },
    },
  },
  trocas: { include: { itens: true } },
} as const satisfies Prisma.PedidoInclude;

type Linha = Prisma.PedidoGetPayload<{ include: typeof comTudo }>;

const paraEndereco = (linha: Linha['enderecoEntrega']): Endereco => ({
  id: linha.id,
  clienteId: linha.clienteId,
  apelido: linha.apelido,
  tipo: linha.tipo as TipoEndereco,
  tipoResidenciaId: linha.tipoResidenciaId,
  tipoLogradouroId: linha.tipoLogradouroId,
  logradouro: linha.logradouro,
  numero: linha.numero,
  bairro: linha.bairro,
  cep: linha.cep,
  cidade: linha.cidade,
  estado: linha.estado,
  pais: linha.pais,
  observacoes: linha.observacoes ?? undefined,
});

const paraPagamento = (linha: Linha['pagamentos'][number]): Pagamento => ({
  forma: linha.forma,
  valor: linha.valor.toNumber(),
  cartaoId: linha.cartaoId ?? undefined,
  // Só os quatro últimos dígitos saem da API.
  cartaoFinal: linha.cartao ? linha.cartao.numero.slice(-4) : undefined,
  cupomCodigo: linha.cupom?.codigo,
});

/**
 * RF0041: o item mostra em que pé está a troca. A informação vem das
 * solicitações do pedido, somando as quantidades já pedidas por produto.
 */
const paraItem = (linha: Linha['itens'][number], trocas: Linha['trocas']): ItemPedido => {
  const pedidosDoItem = trocas.flatMap(t =>
    t.itens
      .filter(i => i.produtoId === linha.produtoId)
      .map(i => ({ status: t.status, quantidade: i.quantidade })),
  );

  const quantidadeTrocada = pedidosDoItem.reduce((s, i) => s + i.quantidade, 0);

  return {
    produtoId: linha.produtoId,
    produtoNome: linha.produtoNome,
    produtoSku: linha.produtoSku,
    categoriaIds: linha.produto.categorias.map(c => c.categoriaId),
    quantidade: linha.quantidade,
    valorUnitario: linha.valorUnitario.toNumber(),
    subtotal: linha.subtotal.toNumber(),
    statusTroca: pedidosDoItem.at(-1)?.status,
    quantidadeTrocada: quantidadeTrocada || undefined,
  };
};

const paraPedido = (linha: Linha, historico: Pedido['historico']): Pedido => ({
  id: linha.id,
  numero: linha.numero,
  clienteId: linha.clienteId,
  clienteNome: linha.cliente.nome,
  itens: linha.itens.map(i => paraItem(i, linha.trocas)),
  enderecoEntrega: paraEndereco(linha.enderecoEntrega),
  pagamentos: linha.pagamentos.map(paraPagamento),
  frete: linha.frete.toNumber(),
  subtotal: linha.subtotal.toNumber(),
  total: linha.total.toNumber(),
  status: linha.situacao as StatusPedido,
  dataCompra: linha.dataCompra.toISOString(),
  historico,
  cupomTrocoCodigo: linha.cupomTrocoCodigo ?? undefined,
});

const montarWhere = (filtros: PedidoFiltros): Prisma.PedidoWhereInput => {
  const where: Prisma.PedidoWhereInput = {};

  if (filtros.status) where.situacao = filtros.status as SituacaoPedido;
  if (filtros.clienteId) where.clienteId = filtros.clienteId;
  if (filtros.numero) {
    where.numero = { contains: filtros.numero, mode: 'insensitive' };
  }
  if (filtros.dataInicio || filtros.dataFim) {
    where.dataCompra = {
      ...(filtros.dataInicio && { gte: new Date(filtros.dataInicio) }),
      ...(filtros.dataFim && { lte: new Date(`${filtros.dataFim}T23:59:59`) }),
    };
  }

  return where;
};

export const pedidosModel = {
  async listar(
    filtros: PedidoFiltros,
    paginacao: Paginacao,
  ): Promise<{ itens: Pedido[]; total: number }> {
    const where = montarWhere(filtros);

    const [linhas, total] = await prisma.$transaction([
      prisma.pedido.findMany({
        where,
        include: comTudo,
        orderBy: { dataCompra: 'desc' },
        ...recorte(paginacao),
      }),
      prisma.pedido.count({ where }),
    ]);

    // A listagem não carrega histórico: ele é detalhe de uma compra só.
    return { itens: linhas.map(l => paraPedido(l, [])), total };
  },

  async buscarPorId(id: number): Promise<Pedido | null> {
    const linha = await prisma.pedido.findUnique({ where: { id }, include: comTudo });

    if (!linha) return null;

    return paraPedido(linha, await logModel.historicoDoPedido(id));
  },

  /** RNF0035 aplicada ao pedido: código único derivado do id. */
  numeroDe(id: number): string {
    return `PED-${String(id).padStart(4, '0')}`;
  },

  /** Troca a situação e devolve o pedido já convertido. */
  async alterarSituacao(
    id: number,
    situacao: SituacaoPedido,
    tx: Executor = prisma,
  ): Promise<void> {
    await tx.pedido.update({ where: { id }, data: { situacao } });
  },

  async situacaoAtual(id: number, tx: Executor = prisma): Promise<SituacaoPedido | null> {
    const linha = await tx.pedido.findUnique({
      where: { id },
      select: { situacao: true },
    });

    return linha?.situacao ?? null;
  },

  /**
   * RF0038 e RNF0035: a compra nasce EM PROCESSAMENTO e o número sai do
   * id, no mesmo molde do CLI-0000 e do TRC-0000 — a linha é criada com um
   * provisório e corrigida na mesma transação, porque o id só existe
   * depois da inserção.
   */
  async criar(dados: DadosPedido, tx: Executor): Promise<number> {
    const { itens, ...resto } = dados;

    const criado = await tx.pedido.create({
      data: {
        ...resto,
        numero: `TMP-${Date.now().toString(36)}`,
        situacao: SituacaoPedido.EM_PROCESSAMENTO,
        itens: { create: itens },
      },
      select: { id: true },
    });

    await tx.pedido.update({
      where: { id: criado.id },
      data: { numero: this.numeroDe(criado.id) },
    });

    return criado.id;
  },

  /** RF0037 e RN0034: cada parcela da compra é uma linha de pagamento. */
  async registrarPagamento(dados: DadosPagamento, tx: Executor): Promise<void> {
    await tx.pagamento.create({ data: dados });
  },

  /** Os cartões que pagaram a compra, para a simulação da RN0037. */
  async cartoesDoPagamento(
    pedidoId: number,
    tx: Executor,
  ): Promise<{ numero: string }[]> {
    const linhas = await tx.pagamento.findMany({
      where: { pedidoId, forma: 'CARTAO' },
      include: { cartao: { select: { numero: true } } },
    });

    return linhas
      .map(l => l.cartao)
      .filter((c): c is { numero: string } => c !== null);
  },

  /** RN0036: registra no pedido o cupom emitido com a sobra dos cupons. */
  async definirCupomTroco(
    id: number,
    codigo: string,
    tx: Executor,
  ): Promise<void> {
    await tx.pedido.update({ where: { id }, data: { cupomTrocoCodigo: codigo } });
  },
};
