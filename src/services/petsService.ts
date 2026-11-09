/**
 * [MODEL] Service de pets
 *
 * O QUE FAZ: mantém os pets do perfil do cliente, que a recomendação da
 * RNF0047 usa para sugerir o tamanho certo.
 *
 * COMO FARÁ: aplica as regras do DRS sobre o `petsModel`, sem conhecer o
 * Prisma nem `req`/`res`. O cadastro e a alteração correm em transação e
 * deixam registro no log (RNF0012).
 *
 * ATENDE: RF0028, RF0029, RN0029, RNF0012
 */

import { logModel } from '../models/logModel';
import { DadosPet, petsModel } from '../models/petsModel';
import { AlterarPetPayload, CriarPetPayload, Pet } from '../types/pets/types';
import { ApiError } from '../utils/ApiError';
import { executarEmTransacao } from '../utils/transacao';

const ENTIDADE = 'Pet';

/** RN0029: nome, espécie, raça e porte são o mínimo de todo pet. */
const normalizar = (payload: CriarPetPayload): DadosPet => ({
  nome: payload.nome.trim(),
  especie: payload.especie,
  raca: payload.raca.trim(),
  porte: payload.porte,
  peso: payload.peso,
});

/** O pet precisa ser do cliente da sessão; se não for, não existe. */
const exigirPet = async (clienteId: number, id: number): Promise<Pet> => {
  const pet = await petsModel.buscarDoCliente(clienteId, id);

  if (!pet) throw ApiError.naoEncontrado('Pet não encontrado.');

  return pet;
};

export const petsService = {
  async listar(clienteId: number): Promise<Pet[]> {
    return petsModel.listarDoCliente(clienteId);
  },

  /** RF0028: o cliente cadastra um ou mais pets no seu perfil. */
  async criar(
    clienteId: number,
    usuarioId: number,
    payload: CriarPetPayload,
  ): Promise<Pet> {
    const dados = normalizar(payload);

    return executarEmTransacao(async tx => {
      const pet = await petsModel.criar(clienteId, dados, tx);

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'INSERCAO',
          entidade: ENTIDADE,
          entidadeId: pet.id,
          depois: pet,
        },
        tx,
      );

      return pet;
    });
  },

  /** RF0029: alterar os dados de um pet já cadastrado. */
  async alterar(
    clienteId: number,
    usuarioId: number,
    id: number,
    payload: AlterarPetPayload,
  ): Promise<Pet> {
    const antes = await exigirPet(clienteId, id);
    const dados = normalizar(payload);

    return executarEmTransacao(async tx => {
      const depois = await petsModel.atualizar(id, dados, tx);

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: ENTIDADE,
          entidadeId: id,
          antes,
          depois,
        },
        tx,
      );

      return depois;
    });
  },

  /**
   * RF0029: remover o pet. É exclusão mesmo, e não inativação: ao
   * contrário do cliente (RF0023), o DRS não manda preservar o cadastro de
   * um pet, e o histórico de compras não aponta para ele.
   */
  async remover(clienteId: number, id: number): Promise<void> {
    await exigirPet(clienteId, id);

    await executarEmTransacao(tx => petsModel.remover(id, tx));
  },
};
