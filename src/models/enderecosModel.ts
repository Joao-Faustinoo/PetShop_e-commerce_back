/**
 * [MODEL] Model de endereços
 *
 * O QUE FAZ: lê, grava, altera e remove os endereços de um cliente.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: essa responsabilidade é
 * do service.
 *
 * As operações de escrita exigem o `tx` explicitamente, sem valor padrão,
 * para que nenhuma escape da transação por esquecimento.
 *
 * ATENDE: RF0026, RF0035, RN0021, RN0022, RN0023, RNF0034
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Endereco, TipoEndereco } from '../types/enderecos/types';
import { Executor } from '../utils/transacao';

type LinhaEndereco = Prisma.EnderecoGetPayload<Record<string, never>>;

/** Dados já normalizados pelo service, prontos para gravar. */
export interface DadosEndereco {
  salvoNoPerfil: boolean;
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
  observacoes: string | null;
}

const paraEndereco = (linha: LinhaEndereco): Endereco => ({
  id: linha.id,
  clienteId: linha.clienteId,
  apelido: linha.apelido,
  tipo: linha.tipo as TipoEndereco,
  tipoResidenciaId: linha.tipoResidenciaId,
  tipoLogradouroId: linha.tipoLogradouroId,
  logradouro: linha.logradouro,
  numero: linha.numero,
  bairro: linha.bairro,
  cep: linha.cep,
  cidade: linha.cidade,
  estado: linha.estado,
  pais: linha.pais,
  observacoes: linha.observacoes ?? undefined,
});

export const enderecosModel = {
  /**
   * RF0035: por padrão só os endereços do perfil. O checkout pede também
   * os não salvos, porque um endereço criado para aquela compra precisa
   * continuar selecionável enquanto ela não fecha.
   */
  async listarDoCliente(
    clienteId: number,
    tipo?: TipoEndereco,
    incluirNaoSalvos = false,
    tx: Executor = prisma,
  ): Promise<Endereco[]> {
    const linhas = await tx.endereco.findMany({
      where: {
        clienteId,
        ...(tipo && { tipo }),
        ...(incluirNaoSalvos ? {} : { salvoNoPerfil: true }),
      },
      orderBy: { id: 'asc' },
    });

    return linhas.map(paraEndereco);
  },

  /** Filtrar pelo cliente é o que garante que ninguém alcance o alheio. */
  async buscarDoCliente(
    clienteId: number,
    id: number,
    tx: Executor = prisma,
  ): Promise<Endereco | null> {
    const linha = await tx.endereco.findFirst({ where: { id, clienteId } });

    return linha ? paraEndereco(linha) : null;
  },

  /** RN0021 e RN0022: quantos restam de cada tipo no cadastro. */
  async contarDoTipo(
    clienteId: number,
    tipo: TipoEndereco,
    tx: Executor = prisma,
  ): Promise<number> {
    return tx.endereco.count({ where: { clienteId, tipo } });
  },

  /** O endereço de uma entrega já feita está preso ao histórico dela. */
  async usadoEmPedido(id: number, tx: Executor = prisma): Promise<boolean> {
    return (await tx.pedido.count({ where: { enderecoEntregaId: id } })) > 0;
  },

  /** RN0023: os tipos escolhidos precisam existir nas tabelas de domínio. */
  async dominiosExistem(
    tipoResidenciaId: number,
    tipoLogradouroId: number,
    tx: Executor = prisma,
  ): Promise<{ residencia: boolean; logradouro: boolean }> {
    const [residencia, logradouro] = await Promise.all([
      tx.tipoResidencia.findUnique({ where: { id: tipoResidenciaId } }),
      tx.tipoLogradouro.findUnique({ where: { id: tipoLogradouroId } }),
    ]);

    return { residencia: residencia !== null, logradouro: logradouro !== null };
  },

  async criar(
    clienteId: number,
    dados: DadosEndereco,
    tx: Executor,
  ): Promise<Endereco> {
    return paraEndereco(await tx.endereco.create({ data: { clienteId, ...dados } }));
  },

  async atualizar(id: number, dados: DadosEndereco, tx: Executor): Promise<Endereco> {
    return paraEndereco(await tx.endereco.update({ where: { id }, data: dados }));
  },

  async remover(id: number, tx: Executor): Promise<void> {
    await tx.endereco.delete({ where: { id } });
  },
};
