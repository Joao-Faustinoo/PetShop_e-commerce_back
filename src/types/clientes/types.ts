/**
 * [MODEL] Tipos de clientes
 *
 * O QUE FAZ: define o contrato de dados de clientes.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads de criação e
 * alteração e os filtros de consulta. Só interfaces, sem lógica. Portado de
 * `../e-commerce/src/types/clientes/types.ts`, onde já está definido.
 *
 * ATENDE: RF0021-RF0025, RNF0035
 */

import { Cartao } from '../cartoes/types';
import { Endereco } from '../enderecos/types';
import { Pet } from '../pets/types';

export type Genero = 'MASCULINO' | 'FEMININO' | 'OUTRO';

/** RN0026: o telefone é composto por tipo, DDD e número. */
export interface Telefone {
  tipoId: number;
  ddd: string;
  numero: string;
}

export interface Cliente {
  id: number;
  /** RNF0035: código único do cliente no sistema. */
  codigo: string;
  nome: string;
  genero: Genero;
  dataNascimento: string;
  cpf: string;
  email: string;
  telefone: Telefone;
  /** RN0027: ranking numérico calculado a partir do perfil de compras. */
  ranking: number;
  ativo: boolean;
  /** RN0021/RN0022: ao menos um de cobrança e um de entrega. */
  enderecos: Endereco[];
  cartoes: Cartao[];
  pets: Pet[];
  justificativaInativacao?: string;
}

/**
 * Registro-base do cliente, sem as coleções. É o formato devolvido pela
 * consulta em lista, onde carregar endereços, cartões e pets de cada linha
 * seria desperdício.
 */
export type ClienteBase = Omit<Cliente, 'enderecos' | 'cartoes' | 'pets'>;

/** RF0024: qualquer campo identificador pode filtrar, isolado ou combinado. */
export interface ClienteFiltros {
  nome?: string;
  codigo?: string;
  cpf?: string;
  email?: string;
  genero?: Genero;
  rankingMinimo?: number;
  ativo?: boolean;
}

export interface CriarClientePayload {
  nome: string;
  genero: Genero;
  dataNascimento: string;
  cpf: string;
  email: string;
  telefone: Telefone;
  /** RN0021/RN0022: enviados juntos no cadastro inicial. */
  enderecoCobranca: Omit<Endereco, 'id' | 'clienteId' | 'tipo'>;
  enderecoEntrega: Omit<Endereco, 'id' | 'clienteId' | 'tipo'>;
}

export interface AlterarClientePayload {
  nome: string;
  genero: Genero;
  dataNascimento: string;
  cpf: string;
  email: string;
  telefone: Telefone;
}

/**
 * RF0023: a mudança de situação carrega sempre a justificativa — tanto ao
 * inativar quanto ao reativar o cadastro.
 */
export interface AlterarSituacaoPayload {
  ativo: boolean;
  justificativa: string;
}
