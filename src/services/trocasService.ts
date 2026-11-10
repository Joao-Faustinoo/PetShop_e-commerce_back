/**
 * [MODEL] Service de trocas
 *
 * O QUE FAZ: conduz o ciclo da troca — o cliente solicita, o
 * administrador autoriza e depois confirma o recebimento, quando o cupom
 * é emitido e o item pode voltar ao estoque.
 *
 * COMO FARÁ: aplica as regras do DRS sobre os models, lançando ApiError
 * quando uma delas é violada. Não conhece o Prisma, nem `req`, nem `res`.
 * Cada passo muda o status da troca e o do pedido junto, dentro da mesma
 * transação, porque o DRS trata os dois como o mesmo ciclo.
 *
 * ATENDE: RF0041, RF0042, RF0043, RF0044, RF0054, RN0041, RN0042, RN0043,
 * RNF0012, RNF0046
 */

import { SituacaoPedido, StatusTroca } from '@prisma/client';

import { estoqueModel } from '../models/estoqueModel';
import { logModel } from '../models/logModel';
import { notificacoesModel } from '../models/notificacoesModel';
import { pedidosModel } from '../models/pedidosModel';
import { trocasModel } from '../models/trocasModel';
import {
  ItemTroca,
  PedidoTroca,
  SolicitarTrocaPayload,
  TrocaFiltros,
} from '../types/trocas/types';
import { ApiError } from '../utils/ApiError';
import { executarEmTransacao } from '../utils/transacao';
import { cuponsService } from './cuponsService';

const duasCasas = (valor: number): number => Number(valor.toFixed(2));

export const trocasService = {
  /** RF0043: o administrador vê os pedidos de troca; o cliente, os seus. */
  async listar(filtros: TrocaFiltros): Promise<PedidoTroca[]> {
    return trocasModel.listar(filtros);
  },

  async buscarPorId(id: number): Promise<PedidoTroca> {
    const troca = await trocasModel.buscarPorId(id);

    if (!troca) throw ApiError.naoEncontrado('Pedido de troca não encontrado.');

    return troca;
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
    const trocaId = await executarEmTransacao(async tx => {
      const compra = await trocasModel.compraParaTroca(payload.pedidoId, tx);

      if (!compra) throw ApiError.naoEncontrado('Pedido não encontrado.');
      if (compra.clienteId !== clienteId) {
        throw ApiError.naoAutorizado('Esta compra é de outro cliente.');
      }

      // RN0043: o DRS é explícito — só o que foi entregue pode ser trocado.
      if (compra.situacao !== SituacaoPedido.ENTREGUE) {
        throw ApiError.requisicaoInvalida(
          'Só é possível solicitar troca de uma compra ENTREGUE.',
        );
      }

      if (payload.itens.length === 0) {
        throw ApiError.requisicaoInvalida('Selecione ao menos um item para trocar.');
      }

      // Quanto de cada produto já foi pedido em trocas anteriores.
      const jaPedido = new Map<number, number>();
      compra.jaPedidos.forEach(({ produtoId, quantidade }) =>
        jaPedido.set(produtoId, (jaPedido.get(produtoId) ?? 0) + quantidade),
      );

      const itens: ItemTroca[] = payload.itens.map(escolhido => {
        const comprado = compra.itens.find(i => i.produtoId === escolhido.produtoId);

        if (!comprado) {
          throw ApiError.requisicaoInvalida(
            'Um dos itens escolhidos não faz parte desta compra.',
          );
        }

        const disponivel =
          comprado.quantidade - (jaPedido.get(escolhido.produtoId) ?? 0);

        if (escolhido.quantidade > disponivel) {
          throw ApiError.requisicaoInvalida(
            `${comprado.produtoNome}: há ${disponivel} unidade(s) disponível(is) para troca.`,
          );
        }

        return {
          produtoId: comprado.produtoId,
          produtoNome: comprado.produtoNome,
          quantidade: escolhido.quantidade,
          valorUnitario: comprado.valorUnitario,
          subtotal: duasCasas(comprado.valorUnitario * escolhido.quantidade),
        };
      });

      const valorTotal = duasCasas(itens.reduce((s, i) => s + i.subtotal, 0));

      // RN0041: a solicitação cobre a compra inteira quando todos os itens,
      // em toda a quantidade, estão sendo devolvidos.
      const trocaTotal = compra.itens.every(comprado => {
        const agora = itens.find(i => i.produtoId === comprado.produtoId);
        const anterior = jaPedido.get(comprado.produtoId) ?? 0;

        return (agora?.quantidade ?? 0) + anterior === comprado.quantidade;
      });

      const criadaId = await trocasModel.criar(
        {
          pedidoId: compra.id,
          clienteId,
          motivo: payload.motivo.trim(),
          trocaTotal,
          valorTotal,
          itens,
        },
        tx,
      );

      // RN0041: a compra passa a EM TROCA.
      await pedidosModel.alterarSituacao(compra.id, SituacaoPedido.EM_TROCA, tx);

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: 'Pedido',
          entidadeId: compra.id,
          antes: { status: 'ENTREGUE' },
          depois: { status: 'EM_TROCA', trocaId: criadaId, trocaTotal },
        },
        tx,
      );

      return criadaId;
    });

    return this.buscarPorId(trocaId);
  },

  /**
   * RF0042: o administrador autoriza. RNF0046: o cliente é notificado — a
   * autorização é algo que ele RECEBE, não só um status que muda.
   */
  async autorizar(id: number, usuarioId: number): Promise<PedidoTroca> {
    await executarEmTransacao(async tx => {
      const troca = await trocasModel.buscarEmCurso(id, tx);

      if (!troca) throw ApiError.naoEncontrado('Pedido de troca não encontrado.');
      if (troca.status !== StatusTroca.EM_TROCA) {
        throw ApiError.requisicaoInvalida(
          'Só um pedido EM TROCA pode ser autorizado.',
        );
      }

      await trocasModel.atualizarStatus(id, StatusTroca.TROCA_AUTORIZADA, tx);
      await pedidosModel.alterarSituacao(
        troca.pedidoId,
        SituacaoPedido.TROCA_AUTORIZADA,
        tx,
      );

      await notificacoesModel.criar(
        {
          clienteId: troca.clienteId,
          pedidoId: troca.pedidoId,
          mensagem: `Sua troca do pedido ${troca.pedidoNumero} foi autorizada. Envie os itens para concluir.`,
        },
        tx,
      );

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
    await executarEmTransacao(async tx => {
      const troca = await trocasModel.buscarEmCurso(id, tx);

      if (!troca) throw ApiError.naoEncontrado('Pedido de troca não encontrado.');
      if (troca.status !== StatusTroca.TROCA_AUTORIZADA) {
        throw ApiError.requisicaoInvalida(
          'O recebimento só pode ser confirmado depois da autorização.',
        );
      }

      // RF0044: o valor devolvido vira crédito para compras futuras.
      const cupom = await cuponsService.emitir(troca.clienteId, troca.valorTotal, tx);

      // RF0054: reentrada dos itens trocados, se o administrador aprovar.
      if (retornarAoEstoque) {
        for (const item of troca.itens) {
          await estoqueModel.darReentrada(item.produtoId, item.quantidade, tx, {
            trocaId: id,
            usuarioId,
          });
        }
      }

      await trocasModel.atualizarStatus(id, StatusTroca.TROCADO, tx, {
        retornouAoEstoque: retornarAoEstoque,
        cupomGeradoId: cupom.id,
      });

      // RN0042: a compra passa a TROCADO.
      await pedidosModel.alterarSituacao(troca.pedidoId, SituacaoPedido.TROCADO, tx);

      await notificacoesModel.criar(
        {
          clienteId: troca.clienteId,
          pedidoId: troca.pedidoId,
          mensagem: `Recebemos os itens da sua troca. O cupom ${cupom.codigo}, de R$ ${cupom.valor}, já está disponível.`,
        },
        tx,
      );

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
