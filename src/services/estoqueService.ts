/**
 * [MODEL] Service de estoque
 *
 * O QUE FAZ: mostra a posição do estoque e registra a entrada de itens.
 *
 * COMO FARÁ: aplica as regras do DRS sobre o `estoqueModel` e o
 * `produtosModel`, sem conhecer o Prisma nem `req`/`res`. A entrada corre
 * em transação porque ela faz três coisas que precisam valer juntas: cria
 * o lote, registra a movimentação e recalcula o valor de venda.
 *
 * ATENDE: RF0051, RF0052, RN0013, RN0050, RN0051, RN0061, RN0062, RNF0012,
 * RNF0064
 */

import { env } from '../config/env';
import { estoqueModel } from '../models/estoqueModel';
import { logModel } from '../models/logModel';
import { produtosModel } from '../models/produtosModel';
import { Pagina, Paginacao } from '../types/common/types';
import {
  EntradaEstoquePayload,
  EstoqueFiltros,
  ItemEstoque,
  MovimentacaoEstoque,
} from '../types/estoque/types';
import { ApiError } from '../utils/ApiError';
import { montarPagina } from '../utils/paginacao';
import { executarEmTransacao, Executor } from '../utils/transacao';
import { calcularValorVenda } from './produtosService';

const ENTIDADE = 'Estoque';

export const estoqueService = {
  /** A posição de cada produto: o que há, o que está preso, o maior custo. */
  async listar(filtros: EstoqueFiltros): Promise<ItemEstoque[]> {
    return estoqueModel.posicao(filtros);
  },

  async listarMovimentacoes(
    produtoId: number | undefined,
    paginacao: Paginacao,
  ): Promise<Pagina<MovimentacaoEstoque>> {
    const { itens, total } = await estoqueModel.listarMovimentacoes(
      produtoId,
      paginacao,
    );

    return montarPagina(itens, total, paginacao);
  },

  /**
   * RF0051: a entrada de itens. A RN0050 exige produto, quantidade, custo,
   * fornecedor e data; a RN0061 recusa quantidade zero e a RN0062 exige o
   * custo — as três já são conferidas pelo schema, e aqui ficam as que
   * dependem do banco.
   */
  async registrarEntrada(
    usuarioId: number,
    payload: EntradaEstoquePayload,
  ): Promise<MovimentacaoEstoque> {
    const produto = await produtosModel.buscarPorId(payload.produtoId);

    if (!produto) {
      throw ApiError.requisicaoInvalida('Produto não encontrado.');
    }

    if (!(await estoqueModel.fornecedorExiste(payload.fornecedorId))) {
      throw ApiError.requisicaoInvalida('Fornecedor não registrado.');
    }

    const dataEntrada = new Date(`${payload.dataEntrada}T00:00:00.000Z`);

    if (dataEntrada.getTime() > Date.now()) {
      throw ApiError.requisicaoInvalida(
        'A data de entrada não pode estar no futuro.',
      );
    }

    await executarEmTransacao(async tx => {
      await estoqueModel.registrarEntrada(
        { ...payload, dataEntrada, usuarioId },
        tx,
      );

      /*
       * RN0051: com lotes de custos diferentes, todos os itens valem pelo
       * MAIOR custo. Recalcular aqui é o que faz a regra valer: o preço
       * muda no momento em que o lote mais caro entra, não na próxima vez
       * que alguém abrir o cadastro do produto.
       */
      const maiorCusto = await estoqueModel.maiorCustoComSaldo(
        payload.produtoId,
        tx,
      );
      const margem = await produtosModel.margemDoGrupo(
        produto.grupoPrecificacaoId,
        tx,
      );

      if (maiorCusto !== null && margem !== null && maiorCusto !== produto.valorCusto) {
        await produtosModel.atualizarPrecificacao(
          payload.produtoId,
          maiorCusto,
          calcularValorVenda(maiorCusto, margem),
          tx,
        );
      }

      /*
       * RF0016 e RN0017: o produto que o sistema inativou por falta de
       * estoque volta sozinho quando o estoque volta. Reativar à mão o que
       * foi inativado à revelia do administrador seria trabalho inventado.
       * A inativação feita por pessoa não é desfeita aqui: ela tem motivo
       * próprio e só quem a decidiu deve revertê-la.
       */
      if (!produto.ativo && (await produtosModel.inativadoAutomaticamente(produto.id, tx))) {
        const motivo = await produtosModel.motivoReposicao(tx);

        if (motivo) {
          await produtosModel.alterarSituacao(
            produto.id,
            {
              ativo: true,
              motivoInativacaoId: null,
              motivoAtivacaoId: motivo,
              justificativaSituacao:
                'Reativado automaticamente pela entrada de itens em estoque.',
            },
            tx,
          );
        }
      }

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'INSERCAO',
          entidade: ENTIDADE,
          entidadeId: payload.produtoId,
          depois: {
            produto: produto.nome,
            quantidade: payload.quantidade,
            valorCusto: payload.valorCusto,
            fornecedorId: payload.fornecedorId,
          },
        },
        tx,
      );
    });

    const { itens } = await estoqueModel.listarMovimentacoes(payload.produtoId, {
      pagina: 1,
      itensPorPagina: 1,
    });

    return itens[0];
  },

  /**
   * RF0013 e RN0016: o produto sem estoque é inativado pelo próprio
   * sistema, categorizado como FORA DE LINHA. Roda depois da baixa da
   * venda, dentro da mesma transação: é ali que o saldo chega a zero.
   *
   * O DRS fala em "um parâmetro predefinido no sistema" sem nomeá-lo nem
   * dar valor. Adotamos `ESTOQUE_MINIMO_INATIVACAO`, com zero como padrão
   * — a leitura literal de "produtos sem estoque".
   */
  async verificarInativacaoAutomatica(
    produtoId: number,
    usuarioId: number,
    tx: Executor,
  ): Promise<void> {
    const { emEstoque } = await estoqueModel.saldo(produtoId, tx);

    if (emEstoque > env.estoqueMinimoInativacao) return;

    const produto = await produtosModel.buscarPorId(produtoId);

    if (!produto || !produto.ativo) return;

    const motivo = await produtosModel.motivoAutomatico(tx);

    if (!motivo) return;

    await produtosModel.alterarSituacao(
      produtoId,
      {
        ativo: false,
        motivoInativacaoId: motivo,
        motivoAtivacaoId: null,
        justificativaSituacao:
          'Inativado automaticamente: o estoque chegou ao mínimo definido no sistema.',
      },
      tx,
    );

    await logModel.registrar(
      {
        usuarioId,
        operacao: 'ALTERACAO',
        entidade: 'Produto',
        entidadeId: produtoId,
        antes: { ativo: true },
        depois: { ativo: false, motivoId: motivo, automatico: true },
      },
      tx,
    );
  },
};
