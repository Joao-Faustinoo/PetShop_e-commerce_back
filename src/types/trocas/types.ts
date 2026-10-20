/**
 * [MODEL] Tipos de trocas
 *
 * O QUE FAZ: define o contrato de dados de trocas.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads e os filtros
 * de consulta. Só interfaces, sem lógica — é o mesmo contrato que o
 * front consome, para as duas pontas não divergirem. Portado de `../e-commerce/src/types/trocas/types.ts`, onde já está
 * definido.
 *
 * ATENDE: RF0041-RF0045, RN0038-RN0043, RN0046
 */

export type StatusTroca = 'EM_TROCA' | 'TROCA_AUTORIZADA' | 'TROCADO';

export interface ItemTroca {
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export interface PedidoTroca {
  id: number;
  pedidoId: number;
  pedidoNumero: string;
  clienteId: number;
  clienteNome: string;
  itens: ItemTroca[];
  motivo: string;
  status: StatusTroca;
  dataSolicitacao: string;
  valorTotal: number;
  /** RF0045: cupom de troca gerado na confirmação de recebimento. */
  cupomGeradoId?: number;
  cupomGeradoCodigo?: string;
  /** RF0044: o admin informa se os itens voltam ao estoque. */
  retornouAoEstoque?: boolean;
  /** True quando a solicitação cobre a compra inteira (RN0041). */
  trocaTotal: boolean;
}

export interface SolicitarTrocaPayload {
  pedidoId: number;
  itens: { produtoId: number; quantidade: number }[];
  motivo: string;
}

export interface ReceberTrocaPayload {
  trocaId: number;
  /** RF0044: em caso positivo, dá-se entrada no estoque dos itens. */
  retornarAoEstoque: boolean;
}

export interface TrocaFiltros {
  status?: StatusTroca;
  clienteId?: number;
}
