/**
 * [MODEL] Service de cartões
 *
 * O QUE FAZ: lista os cartões do cliente e incorpora um novo ao perfil.
 *
 * COMO FARÁ: orquestra o Prisma e aplica as regras do DRS. O número e o
 * código de segurança nunca saem inteiros da API: a tela só precisa dos
 * quatro últimos dígitos para o cliente reconhecer o cartão.
 *
 * ATENDE: RF0027, RF0036, RN0024, RN0025
 */

import { prisma } from '../config/prisma';
import { Cartao, CriarCartaoPayload } from '../types/cartoes/types';
import { ApiError } from '../utils/ApiError';

const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '');

type LinhaCartao = {
  id: number;
  clienteId: number;
  numero: string;
  nomeImpresso: string;
  bandeiraId: number;
  codigoSeguranca: string;
  preferencial: boolean;
};

/** O número viaja mascarado; o final é o que identifica o cartão na tela. */
const paraCartao = (linha: LinhaCartao): Cartao => ({
  id: linha.id,
  clienteId: linha.clienteId,
  numero: `**** **** **** ${linha.numero.slice(-4)}`,
  nomeImpresso: linha.nomeImpresso,
  bandeiraId: linha.bandeiraId,
  codigoSeguranca: '***',
  preferencial: linha.preferencial,
});

export const cartoesService = {
  async listar(clienteId: number): Promise<Cartao[]> {
    const linhas = await prisma.cartao.findMany({
      where: { clienteId },
      orderBy: [{ preferencial: 'desc' }, { id: 'asc' }],
    });

    return linhas.map(paraCartao);
  },

  /**
   * RF0036: o cartão novo é incorporado ao perfil para poder ser usado no
   * pagamento — a compra referencia o cartão por id.
   */
  async criar(clienteId: number, payload: CriarCartaoPayload): Promise<Cartao> {
    const numero = apenasDigitos(payload.numero);

    if (numero.length < 13 || numero.length > 19) {
      throw ApiError.requisicaoInvalida('Número de cartão inválido.');
    }

    // RN0025: só bandeiras registradas no sistema.
    const bandeira = await prisma.bandeiraCartao.findUnique({
      where: { id: payload.bandeiraId },
    });

    if (!bandeira) {
      throw ApiError.requisicaoInvalida('Bandeira de cartão não registrada.');
    }

    const primeiro = (await prisma.cartao.count({ where: { clienteId } })) === 0;

    const linha = await prisma.$transaction(async tx => {
      // Um preferencial por cliente: o novo destrona o anterior.
      if (payload.preferencial) {
        await tx.cartao.updateMany({
          where: { clienteId },
          data: { preferencial: false },
        });
      }

      return tx.cartao.create({
        data: {
          clienteId,
          numero,
          nomeImpresso: payload.nomeImpresso.trim(),
          bandeiraId: payload.bandeiraId,
          codigoSeguranca: apenasDigitos(payload.codigoSeguranca),
          preferencial: payload.preferencial || primeiro,
        },
      });
    });

    return paraCartao(linha);
  },

  /** RF0027: o cliente corrige os dados de um cartão já cadastrado. */
  async alterar(
    clienteId: number,
    id: number,
    payload: CriarCartaoPayload,
  ): Promise<Cartao> {
    const existente = await prisma.cartao.findFirst({ where: { id, clienteId } });

    if (!existente) throw ApiError.naoEncontrado('Cartão não encontrado.');

    const linha = await prisma.cartao.update({
      where: { id },
      data: {
        numero: apenasDigitos(payload.numero),
        nomeImpresso: payload.nomeImpresso.trim(),
        bandeiraId: payload.bandeiraId,
        codigoSeguranca: apenasDigitos(payload.codigoSeguranca),
      },
    });

    return paraCartao(linha);
  },

  /**
   * O cartão usado num pagamento não some: a compra aponta para ele e o
   * histórico precisa continuar legível.
   */
  async remover(clienteId: number, id: number): Promise<void> {
    const existente = await prisma.cartao.findFirst({ where: { id, clienteId } });

    if (!existente) throw ApiError.naoEncontrado('Cartão não encontrado.');

    const usado = await prisma.pagamento.count({ where: { cartaoId: id } });

    if (usado > 0) {
      throw ApiError.requisicaoInvalida(
        'Este cartão foi usado em uma compra e não pode ser excluído.',
      );
    }

    await prisma.cartao.delete({ where: { id } });
  },

  /** Um preferencial por cliente: o novo destrona o anterior. */
  async definirPreferencial(clienteId: number, id: number): Promise<Cartao> {
    const existente = await prisma.cartao.findFirst({ where: { id, clienteId } });

    if (!existente) throw ApiError.naoEncontrado('Cartão não encontrado.');

    const linha = await prisma.$transaction(async tx => {
      await tx.cartao.updateMany({ where: { clienteId }, data: { preferencial: false } });

      return tx.cartao.update({ where: { id }, data: { preferencial: true } });
    });

    return paraCartao(linha);
  },
};
