/**
 * [MODEL] Tipos de produtos
 *
 * O QUE FAZ: define o contrato de dados de produtos.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads e os filtros
 * de consulta. Só interfaces, sem lógica — é o mesmo contrato que o
 * front consome, para as duas pontas não divergirem. Portado de `../e-commerce/src/types/produtos/types.ts`, onde já está
 * definido.
 *
 * ATENDE: RF0011-RF0016, RN0012, RN0013, RN0015-RN0017, RNF0021
 */

import { Especie, PorteSigla } from '../dominios/types';

/** RN0011: dimensões são dado obrigatório do cadastro. */
export interface Dimensoes {
  altura: number;
  largura: number;
  peso: number;
  profundidade: number;
}

export interface Produto {
  id: number;
  /** RNF0021: código único do produto no sistema. */
  sku: string;
  nome: string;
  descricao: string;
  marcaId: number;
  /** RN0012: um produto pode estar associado a mais de uma categoria. */
  categoriaIds: number[];
  especie: Especie;
  porte: PorteSigla;
  corId: number;
  materialId: number;
  dimensoes: Dimensoes;
  codigoBarras: string;
  grupoPrecificacaoId: number;
  valorCusto: number;
  valorVenda: number;
  quantidadeEstoque: number;
  ativo: boolean;
  imagem?: string;
  /** RN0015-RN0017: rastro da última mudança de situação. */
  motivoSituacaoId?: number;
  justificativaSituacao?: string;
  /** Alimenta a inativação automática da RF0013. */
  totalVendido: number;
}

/** RF0015: todos os campos podem filtrar, isolados ou combinados (AND). */
export interface ProdutoFiltros {
  nome?: string;
  especie?: Especie;
  porte?: PorteSigla;
  marcaId?: number;
  categoriaId?: number;
  corId?: number;
  materialId?: number;
  precoMinimo?: number;
  precoMaximo?: number;
  ativo?: boolean;
}

export interface CriarProdutoPayload {
  nome: string;
  descricao: string;
  marcaId: number;
  categoriaIds: number[];
  especie: Especie;
  porte: PorteSigla;
  corId: number;
  materialId: number;
  dimensoes: Dimensoes;
  codigoBarras: string;
  grupoPrecificacaoId: number;
  valorCusto: number;
  imagem?: string;
}

export interface AlterarProdutoPayload extends CriarProdutoPayload {
  id: number;
  /** RN0014: só é aceito abaixo da margem com autorização do gerente. */
  valorVenda?: number;
  autorizacaoGerente?: boolean;
}

export interface InativarProdutoPayload {
  id: number;
  motivoId: number;
  justificativa: string;
}

export interface AtivarProdutoPayload {
  id: number;
  motivoId: number;
  justificativa: string;
}
