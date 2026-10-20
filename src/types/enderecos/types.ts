/**
 * [MODEL] Tipos de enderecos
 *
 * O QUE FAZ: define o contrato de dados de enderecos.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads e os filtros
 * de consulta. Só interfaces, sem lógica — é o mesmo contrato que o
 * front consome, para as duas pontas não divergirem. Portado de
 * `../e-commerce/src/types/enderecos/types.ts`, onde já está definido.
 *
 * ATENDE: RF0026, RF0035, RN0021, RN0022, RN0023, RNF0034
 */

export type TipoEndereco = 'ENTREGA' | 'COBRANCA';

export interface Endereco {
  id: number;
  clienteId: number;
  /** RF0026: frase curta que identifica o endereço (ex.: "Casa"). */
  apelido: string;
  tipo: TipoEndereco;
  tipoResidenciaId: number;
  tipoLogradouroId: number;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  pais: string;
  /** Único campo não obrigatório da RN0023. */
  observacoes?: string;
}

export interface CriarEnderecoPayload extends Omit<Endereco, 'id'> {}

export interface AlterarEnderecoPayload extends Endereco {}
