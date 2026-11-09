/**
 * [MODEL] Model de pets
 *
 * O QUE FAZ: lê, grava, altera e remove os pets de um cliente.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: essa responsabilidade é
 * do service.
 *
 * As operações de escrita exigem o `tx` explicitamente, sem valor padrão,
 * para que nenhuma escape da transação por esquecimento.
 *
 * ATENDE: RF0028, RF0029, RN0029
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Especie, Pet, PorteSigla } from '../types/pets/types';
import { Executor } from '../utils/transacao';

type LinhaPet = Prisma.PetGetPayload<Record<string, never>>;

/** Dados já normalizados pelo service, prontos para gravar. */
export interface DadosPet {
  nome: string;
  especie: Especie;
  raca: string;
  porte: PorteSigla;
  peso: number;
}

const paraPet = (linha: LinhaPet): Pet => ({
  id: linha.id,
  clienteId: linha.clienteId,
  nome: linha.nome,
  especie: linha.especie as Especie,
  raca: linha.raca,
  porte: linha.porte as PorteSigla,
  peso: linha.peso.toNumber(),
});

export const petsModel = {
  async listarDoCliente(clienteId: number, tx: Executor = prisma): Promise<Pet[]> {
    const linhas = await tx.pet.findMany({
      where: { clienteId },
      orderBy: { id: 'asc' },
    });

    return linhas.map(paraPet);
  },

  /** Filtrar pelo cliente é o que garante que ninguém alcance pet alheio. */
  async buscarDoCliente(
    clienteId: number,
    id: number,
    tx: Executor = prisma,
  ): Promise<Pet | null> {
    const linha = await tx.pet.findFirst({ where: { id, clienteId } });

    return linha ? paraPet(linha) : null;
  },

  async criar(clienteId: number, dados: DadosPet, tx: Executor): Promise<Pet> {
    return paraPet(await tx.pet.create({ data: { clienteId, ...dados } }));
  },

  async atualizar(id: number, dados: DadosPet, tx: Executor): Promise<Pet> {
    return paraPet(await tx.pet.update({ where: { id }, data: dados }));
  },

  async remover(id: number, tx: Executor): Promise<void> {
    await tx.pet.delete({ where: { id } });
  },
};
