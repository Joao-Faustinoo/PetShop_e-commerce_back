/**
 * [MODEL] Service de endereços
 *
 * O QUE FAZ: lista os endereços do cliente e incorpora um novo ao perfil.
 *
 * COMO FARÁ: aplica as regras do DRS sobre o `enderecosModel`, sem
 * conhecer o Prisma nem `req`/`res`. Toda escrita corre dentro de uma
 * transação e deixa registro no log (RNF0012). O endereço usado numa
 * compra precisa existir no cadastro, porque o pedido aponta para ele — é
 * por isso que o informado na finalização é gravado antes de a compra
 * fechar.
 *
 * ATENDE: RF0026, RF0035, RN0021, RN0022, RN0023, RNF0012, RNF0034
 */

import { DadosEndereco, enderecosModel } from '../models/enderecosModel';
import { logModel } from '../models/logModel';
import {
  CriarEnderecoPayload,
  Endereco,
  TipoEndereco,
} from '../types/enderecos/types';
import { ApiError } from '../utils/ApiError';
import { executarEmTransacao } from '../utils/transacao';

const ENTIDADE = 'Endereco';

/** RN0023: o cadastro guarda os campos já aparados e padronizados. */
const normalizar = (payload: CriarEnderecoPayload): DadosEndereco => ({
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
});

/** RN0023: as tabelas de domínio precisam conhecer o que foi escolhido. */
const exigirDominios = async (dados: DadosEndereco): Promise<void> => {
  const { residencia, logradouro } = await enderecosModel.dominiosExistem(
    dados.tipoResidenciaId,
    dados.tipoLogradouroId,
  );

  if (!residencia) {
    throw ApiError.requisicaoInvalida('Tipo de residência não registrado.');
  }
  if (!logradouro) {
    throw ApiError.requisicaoInvalida('Tipo de logradouro não registrado.');
  }
};

/** O endereço precisa ser do cliente da sessão; se não for, não existe. */
const exigirEndereco = async (clienteId: number, id: number): Promise<Endereco> => {
  const endereco = await enderecosModel.buscarDoCliente(clienteId, id);

  if (!endereco) throw ApiError.naoEncontrado('Endereço não encontrado.');

  return endereco;
};

export const enderecosService = {
  /** RF0035: os endereços que o cliente pode escolher na entrega. */
  async listar(clienteId: number, tipo?: TipoEndereco): Promise<Endereco[]> {
    return enderecosModel.listarDoCliente(clienteId, tipo);
  },

  /**
   * RF0035 e RNF0034: acrescenta um endereço sem mexer no resto do
   * cadastro. É o caminho do "cadastrar novo endereço" do checkout.
   */
  async criar(
    clienteId: number,
    usuarioId: number,
    payload: CriarEnderecoPayload,
  ): Promise<Endereco> {
    const dados = normalizar(payload);
    await exigirDominios(dados);

    return executarEmTransacao(async tx => {
      const endereco = await enderecosModel.criar(clienteId, dados, tx);

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'INSERCAO',
          entidade: ENTIDADE,
          entidadeId: endereco.id,
          depois: endereco,
        },
        tx,
      );

      return endereco;
    });
  },

  /** RNF0034: altera o endereço sem tocar no resto do cadastro. */
  async alterar(
    clienteId: number,
    usuarioId: number,
    id: number,
    payload: CriarEnderecoPayload,
  ): Promise<Endereco> {
    const antes = await exigirEndereco(clienteId, id);
    const dados = normalizar(payload);
    await exigirDominios(dados);

    return executarEmTransacao(async tx => {
      const depois = await enderecosModel.atualizar(id, dados, tx);

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
   * RN0021 e RN0022: o cadastro precisa manter ao menos um endereço de
   * cada tipo, e o endereço de uma entrega já feita não pode sumir.
   */
  async remover(clienteId: number, id: number): Promise<void> {
    const existente = await exigirEndereco(clienteId, id);

    if (await enderecosModel.usadoEmPedido(id)) {
      throw ApiError.requisicaoInvalida(
        'Este endereço foi usado em uma compra e não pode ser excluído.',
      );
    }

    const doMesmoTipo = await enderecosModel.contarDoTipo(clienteId, existente.tipo);

    if (doMesmoTipo <= 1) {
      throw ApiError.requisicaoInvalida(
        existente.tipo === 'COBRANCA'
          ? 'É obrigatório manter ao menos um endereço de cobrança.'
          : 'É obrigatório manter ao menos um endereço de entrega.',
      );
    }

    await executarEmTransacao(tx => enderecosModel.remover(id, tx));
  },
};
