/**
 * [MODEL] Model de produtos
 *
 * O QUE FAZ: consulta o catálogo com filtros e entrega o produto no
 * formato que o front já consome.
 *
 * COMO FARÁ: usa o cliente do Prisma e converte a linha do banco no tipo
 * do domínio — as dimensões viram um objeto, as categorias viram uma
 * lista de ids e `quantidadeEstoque` passa a ser o que está DISPONÍVEL,
 * porque é esse número que a RN0031 compara ao validar o carrinho.
 *
 * ATENDE: RF0017, RN0012, RN0031, RNF0021
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Paginacao } from '../types/common/types';
import { Produto, ProdutoFiltros } from '../types/produtos/types';
import { recorte } from '../utils/paginacao';
import { estoqueModel } from './estoqueModel';

const comCategorias = {
  categorias: { select: { categoriaId: true } },
} as const satisfies Prisma.ProdutoInclude;

type Linha = Prisma.ProdutoGetPayload<{ include: typeof comCategorias }>;

/** Decimal preserva a precisão no banco; o contrato do front é number. */
const paraProduto = (linha: Linha, disponivel: number): Produto => ({
  id: linha.id,
  sku: linha.sku,
  nome: linha.nome,
  descricao: linha.descricao,
  marcaId: linha.marcaId,
  categoriaIds: linha.categorias.map(c => c.categoriaId),
  especie: linha.especie,
  porte: linha.porte,
  corId: linha.corId,
  materialId: linha.materialId,
  dimensoes: {
    altura: linha.altura.toNumber(),
    largura: linha.largura.toNumber(),
    profundidade: linha.profundidade.toNumber(),
    peso: linha.peso.toNumber(),
  },
  codigoBarras: linha.codigoBarras,
  grupoPrecificacaoId: linha.grupoPrecificacaoId,
  valorCusto: linha.valorCusto.toNumber(),
  valorVenda: linha.valorVenda.toNumber(),
  // RN0031: o que a tela mostra como "em estoque" é o que dá para comprar.
  quantidadeEstoque: disponivel,
  ativo: linha.ativo,
  imagem: linha.imagem ?? undefined,
  totalVendido: linha.totalVendido,
});

/** RF0017: cada campo preenchido acrescenta uma condição, todas com AND. */
const montarWhere = (filtros: ProdutoFiltros): Prisma.ProdutoWhereInput => {
  const where: Prisma.ProdutoWhereInput = {};

  if (filtros.nome) {
    where.OR = [
      { nome: { contains: filtros.nome, mode: 'insensitive' } },
      { sku: { contains: filtros.nome, mode: 'insensitive' } },
    ];
  }
  if (filtros.especie) where.especie = filtros.especie;
  if (filtros.porte) where.porte = filtros.porte;
  if (filtros.marcaId) where.marcaId = filtros.marcaId;
  if (filtros.corId) where.corId = filtros.corId;
  if (filtros.materialId) where.materialId = filtros.materialId;
  if (filtros.categoriaId) {
    where.categorias = { some: { categoriaId: filtros.categoriaId } };
  }
  if (filtros.precoMinimo !== undefined || filtros.precoMaximo !== undefined) {
    where.valorVenda = {
      ...(filtros.precoMinimo !== undefined && { gte: filtros.precoMinimo }),
      ...(filtros.precoMaximo !== undefined && { lte: filtros.precoMaximo }),
    };
  }
  if (filtros.ativo !== undefined) where.ativo = filtros.ativo;

  return where;
};

export const produtosModel = {
  async listar(
    filtros: ProdutoFiltros,
    paginacao: Paginacao,
  ): Promise<{ itens: Produto[]; total: number }> {
    const where = montarWhere(filtros);

    const [linhas, total] = await prisma.$transaction([
      prisma.produto.findMany({
        where,
        include: comCategorias,
        orderBy: { nome: 'asc' },
        ...recorte(paginacao),
      }),
      prisma.produto.count({ where }),
    ]);

    // Um saldo para todos os produtos da página, em vez de um por produto.
    const saldos = await estoqueModel.saldos(linhas.map(l => l.id));

    return {
      itens: linhas.map(l => paraProduto(l, saldos.get(l.id)?.disponivel ?? 0)),
      total,
    };
  },

  async buscarPorId(id: number): Promise<Produto | null> {
    const linha = await prisma.produto.findUnique({
      where: { id },
      include: comCategorias,
    });

    if (!linha) return null;

    const saldo = await estoqueModel.saldo(id);

    return paraProduto(linha, saldo.disponivel);
  },
};
