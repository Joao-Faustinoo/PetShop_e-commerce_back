/**
 * [MODEL] Tipos de carrinho
 *
 * O QUE FAZ: define o contrato de dados de carrinho.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads e os filtros
 * de consulta. Só interfaces, sem lógica — é o mesmo contrato que o
 * front consome, para as duas pontas não divergirem. Portado de `../e-commerce/src/types/carrinho/types.ts`, onde já está
 * definido.
 *
 * ATENDE: RF0031, RF0032, RN0044, RN0045, RNF0042
 */

import { Produto } from '../produtos/types';

export interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
  /** RN0044: instante em que o bloqueio do item expira (ISO). */
  bloqueadoAte: string;
  expirado: boolean;
}

export interface Carrinho {
  itens: ItemCarrinho[];
  /** RNF0042: itens retirados por expiração, ainda exibidos na listagem. */
  itensRemovidos: ItemCarrinho[];
  subtotal: number;
  total: number;
}

export interface AdicionarItemPayload {
  produtoId: number;
  quantidade: number;
}

export interface AlterarQuantidadePayload {
  produtoId: number;
  quantidade: number;
}

/** RN0044: ambos os prazos são parâmetros do sistema. */
export interface ParametrosBloqueio {
  minutosLimite: number;
  minutosAviso: number;
}

/** RN0032: mudanças de disponibilidade detectadas na finalização. */
export interface AlertaDisponibilidade {
  produtoId: number;
  produtoNome: string;
  tipo: 'QUANTIDADE_AJUSTADA' | 'ITEM_REMOVIDO';
  quantidadeAnterior: number;
  quantidadeAtual: number;
}
