/**
 * [MODEL] Tipos de cupons
 *
 * O QUE FAZ: define o contrato de dados de cupons.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads e os filtros
 * de consulta. Só interfaces, sem lógica — é o mesmo contrato que o
 * front consome, para as duas pontas não divergirem. Portado de `../e-commerce/src/types/cupons/types.ts`, onde já está
 * definido.
 *
 * ATENDE: RF0037, RF0045, RN0033, RN0036, RN0037
 */

export type TipoCupom = 'TROCA' | 'PROMOCIONAL';

export interface Cupom {
  id: number;
  codigo: string;
  tipo: TipoCupom;
  valor: number;
  /** Data de validade em ISO (AAAA-MM-DD). */
  validade: string;
  utilizado: boolean;
  /** Cupons de TROCA são nominais; promocionais valem para qualquer cliente. */
  clienteId?: number;
  /** Preenchido quando o cupom nasce de um pedido de troca (RF0045). */
  trocaId?: number;
}

export interface CupomAplicado {
  cupom: Cupom;
  /** RN0035/RN0036: pode ser menor que o valor do cupom (gera troco). */
  valorConsumido: number;
}

export interface ValidacaoCupom {
  valido: boolean;
  motivo?: string;
  cupom?: Cupom;
}
