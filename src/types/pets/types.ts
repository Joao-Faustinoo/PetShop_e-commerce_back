/**
 * [MODEL] Tipos de pets
 *
 * O QUE FAZ: define o contrato de dados de pets.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads de criação e
 * alteração e os filtros de consulta. Só interfaces, sem lógica. Portado de
 * `../e-commerce/src/types/pets/types.ts`, onde já está definido.
 *
 * ATENDE: RF0028, RF0029, RN0029, RNF0047
 */

export type Especie = 'CAO' | 'GATO' | 'OUTRO';

export type PorteSigla = 'PP' | 'P' | 'M' | 'G' | 'GG';

export interface Pet {
  id: number;
  /** RN0029: todo pet pertence obrigatoriamente a um cliente. */
  clienteId: number;
  nome: string;
  especie: Especie;
  raca: string;
  porte: PorteSigla;
  peso: number;
}

export interface CriarPetPayload extends Omit<Pet, 'id'> {}

export interface AlterarPetPayload extends Pet {}
