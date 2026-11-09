/**
 * [MODEL] Service de pedidos
 *
 * O QUE FAZ: fecha a compra, decide se ela é aprovada e conduz as
 * mudanças de situação feitas pelo administrador.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/pedidos/service.ts`, onde as mesmas regras
 * já estão escritas sobre dados mockados.
 *
 * O checkout inteiro roda em UMA transação: ou o pedido nasce com itens,
 * pagamentos, baixa de estoque e cupons consumidos, ou nada acontece.
 * Como dez chamadas HTTP separadas, uma falha no meio deixaria pedido
 * criado, cupom gasto e estoque intacto.
 *
 * ATENDE: RF0033, RF0034, RF0036, RF0037, RF0038, RF0039, RF0040, RF0053,
 * RN0028, RN0032, RN0033, RN0034, RN0035, RN0036, RN0037, RN0038, RN0039,
 * RN0040, RNF0012
 */

import { SituacaoPedido } from '@prisma/client';

import { env } from '../config/env';
import { carrinhoModel } from '../models/carrinhoModel';
import { cartoesModel } from '../models/cartoesModel';
import { enderecosModel } from '../models/enderecosModel';
import { estoqueModel } from '../models/estoqueModel';
import { logModel } from '../models/logModel';
import { pedidosModel } from '../models/pedidosModel';
import { produtosModel } from '../models/produtosModel';
import { AlertaDisponibilidade } from '../types/carrinho/types';
import { Pagina, Paginacao } from '../types/common/types';
import {
  FinalizarCompraPayload,
  Pedido,
  PedidoFiltros,
} from '../types/pedidos/types';
import { ApiError } from '../utils/ApiError';
import { montarPagina } from '../utils/paginacao';
import { executarEmTransacao } from '../utils/transacao';
import { carrinhoService } from './carrinhoService';
import { cuponsService } from './cuponsService';

const duasCasas = (valor: number): number => Number(valor.toFixed(2));

/** RN0034: piso por cartão quando a compra é dividida entre vários. */
const MINIMO_POR_CARTAO = 10;

// ---------------------------------------------------------------- frete

const FRETE_BASE = 12.9;
const PRECO_POR_KG = 3.4;
/** Divisor da cubagem, no padrão usado pelas transportadoras. */
const DIVISOR_CUBAGEM = 6000;

/** A região encarece o frete conforme a distância do centro de distribuição. */
const MULTIPLICADOR_REGIAO: Record<string, number> = {
  SP: 1, RJ: 1.15, MG: 1.15, PR: 1.2, SC: 1.25, RS: 1.35, DF: 1.4,
  GO: 1.4, BA: 1.5, PE: 1.6, CE: 1.65, AM: 1.9, PA: 1.85,
};

interface ItemParaFrete {
  quantidade: number;
  altura: number;
  largura: number;
  profundidade: number;
  peso: number;
}

/**
 * RF0034: frete a partir do peso e das dimensões dos itens e da região do
 * endereço. Mesma conta do front, mas quem vale é esta: o valor não pode
 * vir pronto do navegador.
 */
export const calcularFrete = (itens: ItemParaFrete[], estado: string): number => {
  if (itens.length === 0) return 0;

  const { pesoTotal, pesoCubado } = itens.reduce(
    (total, item) => ({
      pesoTotal: total.pesoTotal + item.peso * item.quantidade,
      pesoCubado:
        total.pesoCubado +
        ((item.altura * item.largura * item.profundidade) / DIVISOR_CUBAGEM) *
          item.quantidade,
    }),
    { pesoTotal: 0, pesoCubado: 0 },
  );

  // A transportadora cobra pelo maior entre peso real e peso cubado.
  const pesoConsiderado = Math.max(pesoTotal, pesoCubado);
  const multiplicador = MULTIPLICADOR_REGIAO[estado] ?? 1.5;

  return duasCasas((FRETE_BASE + pesoConsiderado * PRECO_POR_KG) * multiplicador);
};

// ------------------------------------------------------------- pagamento

/**
 * RN0037: aceite da operadora, simulado pelo grupo. Um cartão terminado no
 * final parametrizado é sempre recusado — é o que permite demonstrar a
 * compra REPROVADA sem depender de serviço externo.
 */
const operadoraAceita = (numeroDoCartao: string): boolean =>
  !numeroDoCartao.replace(/\D/g, '').endsWith(env.finalCartaoRecusado);

export const pedidosService = {
  /** RF0033: consulta de pedidos, do admin ou de um cliente. */
  async listar(filtros: PedidoFiltros, paginacao: Paginacao): Promise<Pagina<Pedido>> {
    const { itens, total } = await pedidosModel.listar(filtros, paginacao);

    return montarPagina(itens, total, paginacao);
  },

  async buscarPorId(id: number): Promise<Pedido> {
    const pedido = await pedidosModel.buscarPorId(id);

    if (!pedido) throw ApiError.naoEncontrado('Pedido não encontrado.');

    return pedido;
  },

  /**
   * RF0038: fecha a compra a partir do carrinho. Devolve o pedido já com a
   * situação decidida pela validação do pagamento (RN0038).
   */
  async finalizar(
    clienteId: number,
    usuarioId: number,
    payload: FinalizarCompraPayload,
  ): Promise<{ pedido: Pedido; alertas: AlertaDisponibilidade[] }> {
    await carrinhoModel.colherExpirados(clienteId);

    const pedidoId = await executarEmTransacao(async tx => {
      // ------------------------------------------------ carrinho e estoque
      const itensAtivos = await carrinhoModel.itensParaCompra(clienteId, tx);

      if (itensAtivos.length === 0) {
        throw ApiError.requisicaoInvalida(
          'Não há itens no carrinho para finalizar a compra.',
        );
      }

      // RN0032: o estoque pode ter mudado desde que o item entrou.
      const alertas = await carrinhoService.revalidarDisponibilidade(clienteId, tx);

      if (alertas.length > 0) {
        throw new ApiError(
          409,
          'A disponibilidade de um ou mais itens mudou. Revise o carrinho antes de concluir.',
        );
      }

      // ------------------------------------------------------- endereço
      const endereco = await enderecosModel.buscarDoCliente(
        clienteId,
        payload.enderecoEntregaId,
        tx,
      );

      if (!endereco) {
        throw ApiError.requisicaoInvalida(
          'Endereço de entrega inválido para este cliente.',
        );
      }

      // --------------------------------------------------------- valores
      const subtotal = duasCasas(
        itensAtivos.reduce((s, i) => s + i.valorUnitario * i.quantidade, 0),
      );

      // RF0034: o servidor calcula o frete; o valor do cliente é ignorado.
      const frete = calcularFrete(itensAtivos, endereco.estado);

      const total = duasCasas(subtotal + frete);

      // ------------------------------------------------------ pagamentos
      const pagamentosCartao = payload.pagamentos.filter(p => p.forma === 'CARTAO');
      const codigosCupom = payload.pagamentos
        .filter(p => p.forma !== 'CARTAO')
        .map(p => p.cupomCodigo ?? '');

      if (codigosCupom.some(c => !c)) {
        throw ApiError.requisicaoInvalida('Informe o código de cada cupom.');
      }

      const { cupons, consumido: valorEmCupons, troco } =
        await cuponsService.conferirConjunto(codigosCupom, clienteId, total);

      const valorEmCartoes = duasCasas(
        pagamentosCartao.reduce((s, p) => s + p.valor, 0),
      );

      // RN0034 e RN0035: o piso de R$ 10 vale quando a compra é dividida
      // entre cartões. Com cupons na jogada, o cartão pode ficar abaixo —
      // é o exemplo do DRS: R$ 30 em cupons e R$ 5 no cartão.
      if (cupons.length === 0 && pagamentosCartao.length > 1) {
        const abaixo = pagamentosCartao.find(p => p.valor < MINIMO_POR_CARTAO);

        if (abaixo) {
          throw ApiError.requisicaoInvalida(
            `Ao dividir a compra, cada cartão precisa receber ao menos R$ ${MINIMO_POR_CARTAO},00.`,
          );
        }
      }

      if (duasCasas(valorEmCupons + valorEmCartoes) !== total) {
        throw ApiError.requisicaoInvalida(
          `O pagamento soma R$ ${duasCasas(valorEmCupons + valorEmCartoes)}, e a compra é de R$ ${total}.`,
        );
      }

      // -------------------------------------------------- cria o pedido
      // RF0038: toda compra nasce EM PROCESSAMENTO.
      const pedidoCriadoId = await pedidosModel.criar(
        {
          clienteId,
          enderecoEntregaId: endereco.id,
          frete,
          subtotal,
          total,
          itens: itensAtivos.map(i => ({
            produtoId: i.produtoId,
            produtoNome: i.produtoNome,
            produtoSku: i.produtoSku,
            quantidade: i.quantidade,
            valorUnitario: i.valorUnitario,
            subtotal: duasCasas(i.valorUnitario * i.quantidade),
          })),
        },
        tx,
      );

      // Pagamentos: os cupons entram pelo valor realmente consumido.
      let restanteEmCupons = valorEmCupons;

      for (const cupom of cupons) {
        const valor = duasCasas(Math.min(cupom.valor, restanteEmCupons));
        restanteEmCupons = duasCasas(restanteEmCupons - valor);

        await pedidosModel.registrarPagamento(
          {
            pedidoId: pedidoCriadoId,
            forma: cupom.tipo === 'TROCA' ? 'CUPOM_TROCA' : 'CUPOM_PROMOCIONAL',
            valor,
            cupomId: cupom.id,
          },
          tx,
        );
      }

      for (const pagamento of pagamentosCartao) {
        if (!pagamento.cartaoId) {
          throw ApiError.requisicaoInvalida('Informe o cartão de cada pagamento.');
        }

        const cartao = await cartoesModel.buscarDoCliente(
          clienteId,
          pagamento.cartaoId,
          tx,
        );

        if (!cartao) {
          throw ApiError.requisicaoInvalida('Cartão inválido para este cliente.');
        }

        await pedidosModel.registrarPagamento(
          {
            pedidoId: pedidoCriadoId,
            forma: 'CARTAO',
            valor: duasCasas(pagamento.valor),
            cartaoId: cartao.id,
          },
          tx,
        );
      }

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'INSERCAO',
          entidade: 'Pedido',
          entidadeId: pedidoCriadoId,
          depois: { status: 'EM_PROCESSAMENTO', total },
        },
        tx,
      );

      // ------------------------------------------ RN0037: valida e decide
      const cartoesDoPedido = await pedidosModel.cartoesDoPagamento(
        pedidoCriadoId,
        tx,
      );

      const recusado = cartoesDoPedido.find(c => !operadoraAceita(c.numero));

      // RN0038: aprovada ou reprovada conforme a validação.
      const situacao = recusado ? SituacaoPedido.REPROVADA : SituacaoPedido.APROVADA;

      await pedidosModel.alterarSituacao(pedidoCriadoId, situacao, tx);

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: 'Pedido',
          entidadeId: pedidoCriadoId,
          antes: { status: 'EM_PROCESSAMENTO' },
          depois: {
            status: situacao,
            motivo: recusado ? 'Cartão recusado pela operadora.' : undefined,
          },
        },
        tx,
      );

      if (situacao === SituacaoPedido.APROVADA) {
        // RF0053 e RN0028: a baixa só acontece em compra efetivada.
        for (const item of itensAtivos) {
          await estoqueModel.darBaixa(item.produtoId, item.quantidade, tx);
          await produtosModel.incrementarTotalVendido(
            item.produtoId,
            item.quantidade,
            tx,
          );
        }

        await cuponsService.marcarUtilizados(cupons.map(c => c.id), tx);

        // RN0036: o que sobrou dos cupons vira um cupom novo.
        if (troco > 0) {
          const cupomTroco = await cuponsService.emitir(clienteId, troco, tx);

          await pedidosModel.definirCupomTroco(
            pedidoCriadoId,
            cupomTroco.codigo,
            tx,
          );
        }
      }

      // RN0028: aprovada ou não, os itens saem do carrinho — na reprovada
      // eles apenas voltam a ficar livres, sem baixa nenhuma.
      await carrinhoModel.esvaziar(clienteId, tx);

      return pedidoCriadoId;
    }, 20000);

    return { pedido: await this.buscarPorId(pedidoId), alertas: [] };
  },

  /** RF0039 e RN0039: o administrador despacha uma compra aprovada. */
  async despachar(id: number, usuarioId: number): Promise<Pedido> {
    return this.mudarSituacao(
      id,
      SituacaoPedido.APROVADA,
      SituacaoPedido.EM_TRANSPORTE,
      usuarioId,
      'Só uma compra APROVADA pode ser despachada.',
    );
  },

  /** RF0040 e RN0040: o administrador confirma a entrega. */
  async confirmarEntrega(id: number, usuarioId: number): Promise<Pedido> {
    return this.mudarSituacao(
      id,
      SituacaoPedido.EM_TRANSPORTE,
      SituacaoPedido.ENTREGUE,
      usuarioId,
      'Só uma compra EM TRANSPORTE pode ser marcada como entregue.',
    );
  },

  /**
   * O caminho entre dois status, com a conferência de origem. Recusar a
   * transição errada é o que mantém o ciclo de vida do DRS honesto.
   */
  async mudarSituacao(
    id: number,
    de: SituacaoPedido,
    para: SituacaoPedido,
    usuarioId: number,
    mensagem: string,
  ): Promise<Pedido> {
    const atual = await pedidosModel.situacaoAtual(id);

    if (atual === null) throw ApiError.naoEncontrado('Pedido não encontrado.');
    if (atual !== de) throw ApiError.requisicaoInvalida(mensagem);

    await executarEmTransacao(async tx => {
      await pedidosModel.alterarSituacao(id, para, tx);
      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: 'Pedido',
          entidadeId: id,
          antes: { status: de },
          depois: { status: para },
        },
        tx,
      );
    });

    return this.buscarPorId(id);
  },
};
