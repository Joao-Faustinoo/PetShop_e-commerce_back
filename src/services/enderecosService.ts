/**
 * [MODEL] Service de endereços
 *
 * O QUE FAZ: lista os endereços do cliente e incorpora um novo ao perfil.
 *
 * COMO FARÁ: orquestra o Prisma e aplica as regras do DRS. O endereço
 * usado numa compra precisa existir no cadastro, porque o pedido aponta
 * para ele — é por isso que o endereço informado na finalização é gravado
 * antes de a compra fechar.
 *
 * ATENDE: RF0026, RF0035, RN0021, RN0022, RN0023, RNF0034
 */

import { prisma } from '../config/prisma';
import {
  CriarEnderecoPayload,
  Endereco,
  TipoEndereco,
} from '../types/enderecos/types';
import { ApiError } from '../utils/ApiError';

type LinhaEndereco = {
  id: number;
  clienteId: number;
  apelido: string;
  tipo: string;
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
};

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

export const enderecosService = {
  /** RF0035: os endereços que o cliente pode escolher na entrega. */
  async listar(clienteId: number, tipo?: TipoEndereco): Promise<Endereco[]> {
    const linhas = await prisma.endereco.findMany({
      where: { clienteId, ...(tipo && { tipo }) },
      orderBy: { id: 'asc' },
    });

    return linhas.map(paraEndereco);
  },

  /**
   * RF0035 e RNF0034: acrescenta um endereço sem mexer no resto do
   * cadastro. É o caminho do "cadastrar novo endereço" do checkout.
   */
  async criar(
    clienteId: number,
    payload: CriarEnderecoPayload,
  ): Promise<Endereco> {
    // RN0023: as tabelas de domínio precisam conhecer o que foi escolhido.
    const [residencia, logradouro] = await Promise.all([
      prisma.tipoResidencia.findUnique({ where: { id: payload.tipoResidenciaId } }),
      prisma.tipoLogradouro.findUnique({ where: { id: payload.tipoLogradouroId } }),
    ]);

    if (!residencia) {
      throw ApiError.requisicaoInvalida('Tipo de residência não registrado.');
    }
    if (!logradouro) {
      throw ApiError.requisicaoInvalida('Tipo de logradouro não registrado.');
    }

    const linha = await prisma.endereco.create({
      data: {
        clienteId,
        apelido: payload.apelido.trim(),
        tipo: payload.tipo,
        tipoResidenciaId: payload.tipoResidenciaId,
        tipoLogradouroId: payload.tipoLogradouroId,
        logradouro: payload.logradouro.trim(),
        numero: payload.numero.trim(),
        bairro: payload.bairro.trim(),
        cep: payload.cep.replace(/\D/g, ''),
        cidade: payload.cidade.trim(),
        estado: payload.estado.trim().toUpperCase(),
        pais: payload.pais.trim(),
        observacoes: payload.observacoes?.trim() || null,
      },
    });

    return paraEndereco(linha);
  },

  /** RNF0034: altera o endereço sem tocar no resto do cadastro. */
  async alterar(
    clienteId: number,
    id: number,
    payload: CriarEnderecoPayload,
  ): Promise<Endereco> {
    const existente = await prisma.endereco.findFirst({ where: { id, clienteId } });

    if (!existente) throw ApiError.naoEncontrado('Endereço não encontrado.');

    const linha = await prisma.endereco.update({
      where: { id },
      data: {
        apelido: payload.apelido.trim(),
        tipo: payload.tipo,
        tipoResidenciaId: payload.tipoResidenciaId,
        tipoLogradouroId: payload.tipoLogradouroId,
        logradouro: payload.logradouro.trim(),
        numero: payload.numero.trim(),
        bairro: payload.bairro.trim(),
        cep: payload.cep.replace(/\D/g, ''),
        cidade: payload.cidade.trim(),
        estado: payload.estado.trim().toUpperCase(),
        pais: payload.pais.trim(),
        observacoes: payload.observacoes?.trim() || null,
      },
    });

    return paraEndereco(linha);
  },

  /**
   * RN0021 e RN0022: o cadastro precisa manter ao menos um endereço de
   * cada tipo, e o endereço de uma entrega já feita não pode sumir.
   */
  async remover(clienteId: number, id: number): Promise<void> {
    const existente = await prisma.endereco.findFirst({ where: { id, clienteId } });

    if (!existente) throw ApiError.naoEncontrado('Endereço não encontrado.');

    const usado = await prisma.pedido.count({ where: { enderecoEntregaId: id } });

    if (usado > 0) {
      throw ApiError.requisicaoInvalida(
        'Este endereço foi usado em uma compra e não pode ser excluído.',
      );
    }

    const doMesmoTipo = await prisma.endereco.count({
      where: { clienteId, tipo: existente.tipo },
    });

    if (doMesmoTipo <= 1) {
      throw ApiError.requisicaoInvalida(
        existente.tipo === 'COBRANCA'
          ? 'É obrigatório manter ao menos um endereço de cobrança.'
          : 'É obrigatório manter ao menos um endereço de entrega.',
      );
    }

    await prisma.endereco.delete({ where: { id } });
  },
};
