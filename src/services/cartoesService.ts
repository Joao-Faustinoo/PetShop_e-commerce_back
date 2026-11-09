/**
 * [MODEL] Service de cartões
 *
 * O QUE FAZ: lista os cartões do cliente e incorpora um novo ao perfil.
 *
 * COMO FARÁ: aplica as regras do DRS sobre o `cartoesModel`, sem conhecer
 * o Prisma nem `req`/`res`. Toda escrita corre dentro de uma transação e
 * deixa registro no log (RNF0012) — o cartão gravado é mascarado antes de
 * ir para o registro, porque o log não é lugar de número de cartão.
 *
 * ATENDE: RF0027, RF0036, RN0024, RN0025, RNF0012
 */

import { cartoesModel } from '../models/cartoesModel';
import { logModel } from '../models/logModel';
import { Cartao, CriarCartaoPayload } from '../types/cartoes/types';
import { ApiError } from '../utils/ApiError';
import { executarEmTransacao } from '../utils/transacao';

const ENTIDADE = 'Cartao';

const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '');

/** RN0024: o número precisa ter o comprimento de um cartão de verdade. */
const normalizar = (payload: CriarCartaoPayload) => {
  const numero = apenasDigitos(payload.numero);

  if (numero.length < 13 || numero.length > 19) {
    throw ApiError.requisicaoInvalida('Número de cartão inválido.');
  }

  return {
    numero,
    nomeImpresso: payload.nomeImpresso.trim(),
    bandeiraId: payload.bandeiraId,
    codigoSeguranca: apenasDigitos(payload.codigoSeguranca),
  };
};

/** O cartão precisa ser do cliente da sessão; se não for, não existe. */
const exigirCartao = async (clienteId: number, id: number): Promise<Cartao> => {
  const cartao = await cartoesModel.buscarDoCliente(clienteId, id);

  if (!cartao) throw ApiError.naoEncontrado('Cartão não encontrado.');

  return cartao;
};

export const cartoesService = {
  async listar(clienteId: number): Promise<Cartao[]> {
    return cartoesModel.listarDoCliente(clienteId);
  },

  /**
   * RF0036: o cartão novo é incorporado ao perfil para poder ser usado no
   * pagamento — a compra referencia o cartão por id.
   */
  async criar(
    clienteId: number,
    usuarioId: number,
    payload: CriarCartaoPayload,
  ): Promise<Cartao> {
    const dados = normalizar(payload);

    // RN0025: só bandeiras registradas no sistema.
    if (!(await cartoesModel.bandeiraExiste(dados.bandeiraId))) {
      throw ApiError.requisicaoInvalida('Bandeira de cartão não registrada.');
    }

    const primeiro = (await cartoesModel.contarDoCliente(clienteId)) === 0;

    return executarEmTransacao(async tx => {
      // Um preferencial por cliente: o novo destrona o anterior.
      if (payload.preferencial) {
        await cartoesModel.desmarcarPreferencial(clienteId, tx);
      }

      const cartao = await cartoesModel.criar(
        clienteId,
        { ...dados, preferencial: payload.preferencial || primeiro },
        tx,
      );

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'INSERCAO',
          entidade: ENTIDADE,
          entidadeId: cartao.id,
          depois: cartao,
        },
        tx,
      );

      return cartao;
    });
  },

  /** RF0027: o cliente corrige os dados de um cartão já cadastrado. */
  async alterar(
    clienteId: number,
    usuarioId: number,
    id: number,
    payload: CriarCartaoPayload,
  ): Promise<Cartao> {
    const antes = await exigirCartao(clienteId, id);
    const dados = normalizar(payload);

    if (!(await cartoesModel.bandeiraExiste(dados.bandeiraId))) {
      throw ApiError.requisicaoInvalida('Bandeira de cartão não registrada.');
    }

    return executarEmTransacao(async tx => {
      const depois = await cartoesModel.atualizar(id, dados, tx);

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
   * O cartão usado num pagamento não some: a compra aponta para ele e o
   * histórico precisa continuar legível.
   */
  async remover(clienteId: number, id: number): Promise<void> {
    await exigirCartao(clienteId, id);

    if (await cartoesModel.usadoEmPagamento(id)) {
      throw ApiError.requisicaoInvalida(
        'Este cartão foi usado em uma compra e não pode ser excluído.',
      );
    }

    await executarEmTransacao(tx => cartoesModel.remover(id, tx));
  },

  /** Um preferencial por cliente: o novo destrona o anterior. */
  async definirPreferencial(
    clienteId: number,
    usuarioId: number,
    id: number,
  ): Promise<Cartao> {
    const antes = await exigirCartao(clienteId, id);

    return executarEmTransacao(async tx => {
      await cartoesModel.desmarcarPreferencial(clienteId, tx);
      const depois = await cartoesModel.marcarPreferencial(id, tx);

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
};
