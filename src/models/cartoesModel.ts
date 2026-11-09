/**
 * [MODEL] Model de cartões de crédito
 *
 * O QUE FAZ: lê, grava, altera e remove os cartões de um cliente.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: essa responsabilidade é
 * do service.
 *
 * As operações de escrita exigem o `tx` explicitamente, sem valor padrão.
 * É o que impede que uma delas escape da transação por esquecimento — o
 * erro apareceria só sob concorrência, quando metade da operação já
 * tivesse sido gravada.
 *
 * ATENDE: RF0027, RF0036, RN0024, RN0025
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Cartao } from '../types/cartoes/types';
import { Executor } from '../utils/transacao';

type LinhaCartao = Prisma.CartaoGetPayload<Record<string, never>>;

/** Dados já normalizados pelo service, prontos para gravar. */
export interface DadosCartao {
  numero: string;
  nomeImpresso: string;
  bandeiraId: number;
  codigoSeguranca: string;
  preferencial: boolean;
}

/**
 * O número viaja mascarado e o código de segurança nunca sai: a tela só
 * precisa dos quatro últimos dígitos para o cliente reconhecer o cartão.
 * É também o formato que vai para o log, para o registro da RNF0012 não
 * virar um depósito de dados de cartão.
 */
const paraCartao = (linha: LinhaCartao): Cartao => ({
  id: linha.id,
  clienteId: linha.clienteId,
  numero: `**** **** **** ${linha.numero.slice(-4)}`,
  nomeImpresso: linha.nomeImpresso,
  bandeiraId: linha.bandeiraId,
  codigoSeguranca: '***',
  preferencial: linha.preferencial,
});

export const cartoesModel = {
  async listarDoCliente(clienteId: number, tx: Executor = prisma): Promise<Cartao[]> {
    const linhas = await tx.cartao.findMany({
      where: { clienteId },
      orderBy: [{ preferencial: 'desc' }, { id: 'asc' }],
    });

    return linhas.map(paraCartao);
  },

  /** Filtrar pelo cliente é o que garante que ninguém alcance cartão alheio. */
  async buscarDoCliente(
    clienteId: number,
    id: number,
    tx: Executor = prisma,
  ): Promise<Cartao | null> {
    const linha = await tx.cartao.findFirst({ where: { id, clienteId } });

    return linha ? paraCartao(linha) : null;
  },

  async contarDoCliente(clienteId: number, tx: Executor = prisma): Promise<number> {
    return tx.cartao.count({ where: { clienteId } });
  },

  /** RN0025: a bandeira precisa estar entre as registradas no sistema. */
  async bandeiraExiste(bandeiraId: number, tx: Executor = prisma): Promise<boolean> {
    const bandeira = await tx.bandeiraCartao.findUnique({ where: { id: bandeiraId } });

    return bandeira !== null;
  },

  /** Um cartão que já pagou uma compra está preso ao histórico dela. */
  async usadoEmPagamento(id: number, tx: Executor = prisma): Promise<boolean> {
    return (await tx.pagamento.count({ where: { cartaoId: id } })) > 0;
  },

  async desmarcarPreferencial(clienteId: number, tx: Executor): Promise<void> {
    await tx.cartao.updateMany({ where: { clienteId }, data: { preferencial: false } });
  },

  async criar(clienteId: number, dados: DadosCartao, tx: Executor): Promise<Cartao> {
    return paraCartao(await tx.cartao.create({ data: { clienteId, ...dados } }));
  },

  async atualizar(
    id: number,
    dados: Omit<DadosCartao, 'preferencial'>,
    tx: Executor,
  ): Promise<Cartao> {
    return paraCartao(await tx.cartao.update({ where: { id }, data: dados }));
  },

  async marcarPreferencial(id: number, tx: Executor): Promise<Cartao> {
    return paraCartao(
      await tx.cartao.update({ where: { id }, data: { preferencial: true } }),
    );
  },

  async remover(id: number, tx: Executor): Promise<void> {
    await tx.cartao.delete({ where: { id } });
  },
};
