/**
 * [MODEL] Service de trocas
 *
 * O QUE FAZ: conduz o ciclo da troca — o cliente solicita, o
 * administrador autoriza e depois confirma o recebimento, quando o cupom
 * é emitido e o item pode voltar ao estoque.
 *
 * COMO FARÁ: orquestra o Prisma e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. Cada
 * passo muda o status da troca e o do pedido junto, porque o DRS trata os
 * dois como o mesmo ciclo.
 *
 * ATENDE: RF0041, RF0042, RF0043, RF0044, RF0054, RN0041, RN0042, RN0043,
 * RNF0012, RNF0046
 */

import { Prisma, SituacaoPedido, StatusTroca } from '@prisma/client';

import { prisma } from '../config/prisma';
import { estoqueModel } from '../models/estoqueModel';
import { logModel } from '../models/logModel';
import {
  ItemTroca,
  PedidoTroca,
  SolicitarTrocaPayload,
  TrocaFiltros,
} from '../types/trocas/types';
import { ApiError } from '../utils/ApiError';
import { cuponsService } from './cuponsService';

const duasCasas = (valor: number): number => Number(valor.toFixed(2));

const comTudo = {
  itens: { orderBy: { id: 'asc' } },
  pedido: { select: { numero: true } },
  cliente: { select: { nome: true } },
  cupomGerado: { select: { id: true, codigo: true } },
} as const satisfies Prisma.TrocaInclude;

type Linha = Prisma.TrocaGetPayload<{ include: typeof comTudo }>;

const paraItem = (linha: Linha['itens'][number]): ItemTroca => ({
  produtoId: linha.produtoId,
  produtoNome: linha.produtoNome,
  quantidade: linha.quantidade,
  valorUnitario: linha.valorUnitario.toNumber(),
  subtotal: linha.subtotal.toNumber(),
});

const paraTroca = (linha: Linha): PedidoTroca => ({
  id: linha.id,
  pedidoId: linha.pedidoId,
  pedidoNumero: linha.pedido.numero,
  clienteId: linha.clienteId,
  clienteNome: linha.cliente.nome,
  itens: linha.itens.map(paraItem),
  motivo: linha.motivo,
  status: linha.status,
  dataSolicitacao: linha.dataSolicitacao.toISOString(),
  valorTotal: linha.valorTotal.toNumber(),
  cupomGeradoId: linha.cupomGerado?.id,
  cupomGeradoCodigo: linha.cupomGerado?.codigo,
  retornouAoEstoque: linha.retornouAoEstoque ?? undefined,
  trocaTotal: linha.trocaTotal,
});

export const trocasService = {
  /** RF0043: o administrador vê os pedidos de troca; o cliente, os seus. */
  async listar(filtros: TrocaFiltros): Promise<PedidoTroca[]> {
    const linhas = await prisma.troca.findMany({
      where: {
        ...(filtros.status && { status: filtros.status as StatusTroca }),
        ...(filtros.clienteId && { clienteId: filtros.clienteId }),
      },
      include: comTudo,
      orderBy: { dataSolicitacao: 'desc' },
    });

    return linhas.map(paraTroca);
  },

  async buscarPorId(id: number): Promise<PedidoTroca> {
    const linha = await prisma.troca.findUnique({ where: { id }, include: comTudo });

    if (!linha) throw ApiError.naoEncontrado('Pedido de troca não encontrado.');

    return paraTroca(linha);
  },

  /**
   * RF0041 e RN0041: o cliente escolhe itens de uma compra e abre o pedido
   * de troca. RN0043: só compra ENTREGUE aceita solicitação.
   */
  async solicitar(
    clienteId: number,
    usuarioId: number,
    payload: SolicitarTrocaPayload,
  ): Promise<PedidoTroca> {
    const trocaId = await prisma.$transaction(async tx => {
      const pedido = await tx.pedido.findUnique({
        where: { id: payload.pedidoId },
        include: { itens: true, trocas: { include: { itens: true } } },
      });

      if (!pedido) throw ApiError.naoEncontrado('Pedido não encontrado.');
      if (pedido.clienteId !== clienteId) {
        throw ApiError.naoAutorizado('Esta compra é de outro cliente.');
      }

      // RN0043: o DRS é explícito — só o que foi entregue pode ser trocado.
      if (pedido.situacao !== SituacaoPedido.ENTREGUE) {
        throw ApiError.requisicaoInvalida(
          'Só é possível solicitar troca de uma compra ENTREGUE.',
        );
      }

      if (payload.itens.length === 0) {
        throw ApiError.requisicaoInvalida('Selecione ao menos um item para trocar.');
      }

      // Quanto de cada produto já foi pedido em trocas anteriores.
      const jaPedido = new Map<number, number>();
      pedido.trocas.forEach(t =>
        t.itens.forEach(i =>
          jaPedido.set(i.produtoId, (jaPedido.get(i.produtoId) ?? 0) + i.quantidade),
        ),
      );

      const itens = payload.itens.map(escolhido => {
        const doPedido = pedido.itens.find(i => i.produtoId === escolhido.produtoId);

        if (!doPedido) {
          throw ApiError.requisicaoInvalida(
            'Um dos itens escolhidos não faz parte desta compra.',
          );
        }

        const disponivel = doPedido.quantidade - (jaPedido.get(escolhido.produtoId) ?? 0);

        if (escolhido.quantidade > disponivel) {
          throw ApiError.requisicaoInvalida(
            `${doPedido.produtoNome}: há ${disponivel} unidade(s) disponível(is) para troca.`,
          );
        }

        const valorUnitario = doPedido.valorUnitario.toNumber();

        return {
          produtoId: doPedido.produtoId,
          produtoNome: doPedido.produtoNome,
          quantidade: escolhido.quantidade,
          valorUnitario,
          subtotal: duasCasas(valorUnitario * escolhido.quantidade),
        };
      });

      const valorTotal = duasCasas(itens.reduce((s, i) => s + i.subtotal, 0));

      // RN0041: a solicitação cobre a compra inteira quando todos os itens,
      // em toda a quantidade, estão sendo devolvidos.
      const trocaTotal = pedido.itens.every(doPedido => {
        const pedidoAgora = itens.find(i => i.produtoId === doPedido.produtoId);
        const anterior = jaPedido.get(doPedido.produtoId) ?? 0;

        return (pedidoAgora?.quantidade ?? 0) + anterior === doPedido.quantidade;
      });

      const criada = await tx.troca.create({
        data: {
          numero: `TMP-${Date.now().toString(36)}`,
          pedidoId: pedido.id,
          clienteId,
          motivo: payload.motivo.trim(),
          status: StatusTroca.EM_TROCA,
          trocaTotal,
          valorTotal,
          itens: { create: itens },
        },
        select: { id: true },
      });

      await tx.troca.update({
        where: { id: criada.id },
        data: { numero: `TRC-${String(criada.id).padStart(4, '0')}` },
      });

      // RN0041: a compra passa a EM TROCA.
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { situacao: SituacaoPedido.EM_TROCA },
      });

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: 'Pedido',
          entidadeId: pedido.id,
          antes: { status: 'ENTREGUE' },
          depois: { status: 'EM_TROCA', trocaId: criada.id, trocaTotal },
        },
        tx,
      );

      return criada.id;
    });

    return this.buscarPorId(trocaId);
  },

  /**
   * RF0042: o administrador autoriza. RNF0046: o cliente é notificado — a
   * autorização é algo que ele RECEBE, não só um status que muda.
   */
  async autorizar(id: number, usuarioId: number): Promise<PedidoTroca> {
    await prisma.$transaction(async tx => {
      const troca = await tx.troca.findUnique({
        where: { id },
        include: { pedido: { select: { numero: true } } },
      });

      if (!troca) throw ApiError.naoEncontrado('Pedido de troca não encontrado.');
      if (troca.status !== StatusTroca.EM_TROCA) {
        throw ApiError.requisicaoInvalida(
          'Só um pedido EM TROCA pode ser autorizado.',
        );
      }

      await tx.troca.update({
        where: { id },
        data: { status: StatusTroca.TROCA_AUTORIZADA },
      });

      await tx.pedido.update({
        where: { id: troca.pedidoId },
        data: { situacao: SituacaoPedido.TROCA_AUTORIZADA },
      });

      await tx.notificacao.create({
        data: {
          clienteId: troca.clienteId,
          pedidoId: troca.pedidoId,
          mensagem: `Sua troca do pedido ${troca.pedido.numero} foi autorizada. Envie os itens para concluir.`,
        },
      });

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: 'Pedido',
          entidadeId: troca.pedidoId,
          antes: { status: 'EM_TROCA' },
          depois: { status: 'TROCA_AUTORIZADA' },
        },
        tx,
      );
    });

    return this.buscarPorId(id);
  },

  /**
   * RF0044 e RN0042: o administrador confirma o recebimento, informando se
   * os itens voltam ao estoque. Aqui nasce o cupom de troca (RF0044) e,
   * havendo retorno, a reentrada (RF0054).
   */
  async receber(
    id: number,
    usuarioId: number,
    retornarAoEstoque: boolean,
  ): Promise<PedidoTroca> {
    await prisma.$transaction(async tx => {
      const troca = await tx.troca.findUnique({
        where: { id },
        include: { itens: true },
      });

      if (!troca) throw ApiError.naoEncontrado('Pedido de troca não encontrado.');
      if (troca.status !== StatusTroca.TROCA_AUTORIZADA) {
        throw ApiError.requisicaoInvalida(
          'O recebimento só pode ser confirmado depois da autorização.',
        );
      }

      // RF0044: o valor devolvido vira crédito para compras futuras.
      const cupom = await cuponsService.emitir(
        troca.clienteId,
        troca.valorTotal.toNumber(),
        tx,
      );

      // RF0054: reentrada dos itens trocados, se o administrador aprovar.
      if (retornarAoEstoque) {
        for (const item of troca.itens) {
          await estoqueModel.darReentrada(item.produtoId, item.quantidade, tx);
        }
      }

      await tx.troca.update({
        where: { id },
        data: {
          status: StatusTroca.TROCADO,
          retornouAoEstoque: retornarAoEstoque,
          cupomGeradoId: cupom.id,
        },
      });

      // RN0042: a compra passa a TROCADO.
      await tx.pedido.update({
        where: { id: troca.pedidoId },
        data: { situacao: SituacaoPedido.TROCADO },
      });

      await tx.notificacao.create({
        data: {
          clienteId: troca.clienteId,
          pedidoId: troca.pedidoId,
          mensagem: `Recebemos os itens da sua troca. O cupom ${cupom.codigo}, de R$ ${cupom.valor}, já está disponível.`,
        },
      });

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: 'Pedido',
          entidadeId: troca.pedidoId,
          antes: { status: 'TROCA_AUTORIZADA' },
          depois: {
            status: 'TROCADO',
            cupom: cupom.codigo,
            retornouAoEstoque: retornarAoEstoque,
          },
        },
        tx,
      );
    });

    return this.buscarPorId(id);
  },
};
