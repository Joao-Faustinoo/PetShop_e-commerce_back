/**
 * [MODEL] Tipos de cartoes
 *
 * O QUE FAZ: define o contrato de dados de cartoes.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads e os filtros
 * de consulta. Só interfaces, sem lógica — é o mesmo contrato que o
 * front consome, para as duas pontas não divergirem. Portado de
 * `../e-commerce/src/types/cartoes/types.ts`, onde já está definido.
 *
 * ATENDE: RF0027, RF0036, RN0024, RN0025
 */

export interface Cartao {
  id: number;
  clienteId: number;
  numero: string;
  nomeImpresso: string;
  /** RN0025: só bandeiras registradas na tabela de domínio. */
  bandeiraId: number;
  codigoSeguranca: string;
  /** RF0027: exatamente um cartão do cliente é o preferencial. */
  preferencial: boolean;
}

export interface CriarCartaoPayload extends Omit<Cartao, 'id'> {}

export interface AlterarCartaoPayload extends Cartao {}
