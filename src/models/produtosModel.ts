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
import { Especie, PorteSigla } from '../types/dominios/types';
import { Produto, ProdutoFiltros } from '../types/produtos/types';

/** Dados já conferidos e precificados pelo service, prontos para gravar. */
export interface DadosProduto {
  nome: string;
  descricao: string;
  marcaId: number;
  categoriaIds: number[];
  especie: Especie;
  porte: PorteSigla;
  corId: number;
  materialId: number;
  altura: number;
  largura: number;
  profundidade: number;
  peso: number;
  codigoBarras: string;
  grupoPrecificacaoId: number;
  valorCusto: number;
  valorVenda: number;
  imagem?: string;
}
import { recorte } from '../utils/paginacao';
import { Executor } from '../utils/transacao';
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

  /**
   * RF0011 e RNF0021: o produto nasce com SKU derivado do id, no mesmo
   * molde do CLI-0000 e do PED-0000 — linha criada com um provisório e
   * corrigida na mesma transação, porque o id só existe depois da
   * inserção. RN0012: as categorias entram junto.
   */
  async criar(dados: DadosProduto, tx: Executor): Promise<number> {
    const { categoriaIds, ...resto } = dados;

    const criado = await tx.produto.create({
      data: {
        ...resto,
        sku: `TMP-${Date.now().toString(36)}`,
        categorias: { create: categoriaIds.map(categoriaId => ({ categoriaId })) },
      },
      select: { id: true },
    });

    await tx.produto.update({
      where: { id: criado.id },
      data: { sku: this.skuDe(criado.id) },
    });

    return criado.id;
  },

  /** RNF0021 aplicada ao produto: código único derivado do id. */
  skuDe(id: number): string {
    return `PET-${String(id).padStart(4, '0')}`;
  },

  /**
   * RF0014. As categorias são reescritas por inteiro, e não acrescentadas:
   * alterar um produto para menos categorias precisa remover as que saíram.
   */
  async atualizar(
    id: number,
    dados: DadosProduto,
    tx: Executor,
  ): Promise<void> {
    const { categoriaIds, ...resto } = dados;

    await tx.produto.update({ where: { id }, data: resto });
    await tx.produtoCategoria.deleteMany({ where: { produtoId: id } });
    await tx.produtoCategoria.createMany({
      data: categoriaIds.map(categoriaId => ({ produtoId: id, categoriaId })),
    });
  },

  /** RF0012, RF0016, RN0015 e RN0017: a situação muda com motivo e justificativa. */
  async alterarSituacao(
    id: number,
    dados: {
      ativo: boolean;
      motivoInativacaoId: number | null;
      motivoAtivacaoId: number | null;
      justificativaSituacao: string;
    },
    tx: Executor,
  ): Promise<void> {
    await tx.produto.update({ where: { id }, data: dados });
  },

  /** RN0011: marca, cor, material e grupo precisam existir. */
  async dominiosExistem(
    dados: Pick<
      DadosProduto,
      'marcaId' | 'corId' | 'materialId' | 'grupoPrecificacaoId'
    >,
    categoriaIds: number[],
    tx: Executor = prisma,
  ): Promise<string | null> {
    const [marca, cor, material, grupo, categorias] = await Promise.all([
      tx.marca.findUnique({ where: { id: dados.marcaId } }),
      tx.cor.findUnique({ where: { id: dados.corId } }),
      tx.material.findUnique({ where: { id: dados.materialId } }),
      tx.grupoPrecificacao.findUnique({ where: { id: dados.grupoPrecificacaoId } }),
      tx.categoria.findMany({ where: { id: { in: categoriaIds } }, select: { id: true } }),
    ]);

    if (!marca) return 'Marca não registrada.';
    if (!cor) return 'Cor não registrada.';
    if (!material) return 'Material não registrado.';
    if (!grupo) return 'Grupo de precificação não registrado.';
    if (categorias.length !== categoriaIds.length) {
      return 'Uma das categorias não está registrada.';
    }

    return null;
  },

  /** RN0015 e RN0017: o motivo precisa existir na tabela do seu sentido. */
  async motivoExiste(
    ativacao: boolean,
    motivoId: number,
    tx: Executor = prisma,
  ): Promise<boolean> {
    const motivo = ativacao
      ? await tx.motivoAtivacao.findUnique({ where: { id: motivoId } })
      : await tx.motivoInativacao.findUnique({ where: { id: motivoId } });

    return motivo !== null;
  },

  /** RNF0021: o código de barras também é único no cadastro. */
  async codigoBarrasEmUso(
    codigoBarras: string,
    exceto: number | undefined,
    tx: Executor = prisma,
  ): Promise<boolean> {
    const linha = await tx.produto.findUnique({
      where: { codigoBarras },
      select: { id: true },
    });

    return linha !== null && linha.id !== exceto;
  },

  /** RN0013: a margem do grupo é o que transforma custo em preço. */
  async margemDoGrupo(grupoId: number, tx: Executor = prisma): Promise<number | null> {
    const grupo = await tx.grupoPrecificacao.findUnique({
      where: { id: grupoId },
      select: { margemLucro: true },
    });

    return grupo ? grupo.margemLucro.toNumber() : null;
  },

  /** RN0051: o custo e o preço mudam juntos quando entra um lote mais caro. */
  async atualizarPrecificacao(
    produtoId: number,
    valorCusto: number,
    valorVenda: number,
    tx: Executor,
  ): Promise<void> {
    await tx.produto.update({
      where: { id: produtoId },
      data: { valorCusto, valorVenda },
    });
  },

  /**
   * Acompanha a venda efetivada. Alimenta a ordenação por mais vendidos e
   * é o número de que a RF0013 precisará para decidir a inativação
   * automática por falta de saída.
   */
  async incrementarTotalVendido(
    produtoId: number,
    quantidade: number,
    tx: Executor,
  ): Promise<void> {
    await tx.produto.update({
      where: { id: produtoId },
      data: { totalVendido: { increment: quantidade } },
    });
  },
};
