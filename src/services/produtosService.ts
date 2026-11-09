/**
 * [MODEL] Service de produtos
 *
 * O QUE FAZ: entrega o catálogo consultável e o detalhe de um produto.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`.
 *
 * ESTADO: a fatia de leitura, que é a que a venda precisa. O cadastro e a
 * precificação de produto (RF0011-RF0016) seguem no front com dados
 * mockados e entram quando essa fatia for portada.
 *
 * ATENDE: RF0017, RN0012, RN0031
 */

import { produtosModel } from '../models/produtosModel';
import { Pagina, Paginacao } from '../types/common/types';
import { Produto, ProdutoFiltros } from '../types/produtos/types';
import { ApiError } from '../utils/ApiError';
import { montarPagina } from '../utils/paginacao';

/**
 * RF0052 e RN0013: o valor de venda é o custo acrescido do percentual do
 * grupo de precificação. É função pura, fora do objeto do service, porque
 * o estoque também a usa ao recalcular o preço pela RN0051 — e porque
 * assim ela pode ser conferida sem banco.
 */
export const calcularValorVenda = (
  valorCusto: number,
  margemPercentual: number,
): number => Number((valorCusto * (1 + margemPercentual / 100)).toFixed(2));

export const produtosService = {
  /** RF0017: consulta por qualquer campo, isolado ou combinado. */
  async listar(
    filtros: ProdutoFiltros,
    paginacao: Paginacao,
  ): Promise<Pagina<Produto>> {
    const { itens, total } = await produtosModel.listar(filtros, paginacao);

    return montarPagina(itens, total, paginacao);
  },

  async buscarPorId(id: number): Promise<Produto> {
    const produto = await produtosModel.buscarPorId(id);

    if (!produto) throw ApiError.naoEncontrado('Produto não encontrado.');

    return produto;
  },
};
