/**
 * [MODEL] Service de carrinho
 *
 * O QUE FAZ: aplica as regras de quem pode entrar no carrinho, de quanto,
 * e por quanto tempo o item fica reservado.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/carrinho/service.ts`, onde as mesmas regras
 * já estão escritas sobre dados mockados.
 *
 * ATENDE: RF0031, RF0032, RN0031, RN0032, RN0044, RNF0042
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { carrinhoModel, CarrinhoCompleto } from '../models/carrinhoModel';
import { estoqueModel } from '../models/estoqueModel';
import { produtosModel } from '../models/produtosModel';
import {
  AlertaDisponibilidade,
  Carrinho,
  ItemCarrinho,
  ParametrosBloqueio,
} from '../types/carrinho/types';
import { Produto } from '../types/produtos/types';
import { ApiError } from '../utils/ApiError';

const duasCasas = (valor: number): number => Number(valor.toFixed(2));

/** O produto dentro do item carrega o saldo disponível no momento da leitura. */
const paraProduto = (
  linha: CarrinhoCompleto['itens'][number]['produto'],
  disponivel: number,
): Produto => ({
  id: linha.id,
  sku: linha.sku,
  nome: linha.nome,
  descricao: linha.descricao,
  marcaId: linha.marcaId,
  categoriaIds: linha.categorias.map(c => c.categoriaId),
  especie: linha.especie,
  porte: linha.porte,
  corId: linha.corId,
  materialId: linha.materialId,
  dimensoes: {
    altura: linha.altura.toNumber(),
    largura: linha.largura.toNumber(),
    profundidade: linha.profundidade.toNumber(),
    peso: linha.peso.toNumber(),
  },
  codigoBarras: linha.codigoBarras,
  grupoPrecificacaoId: linha.grupoPrecificacaoId,
  valorCusto: linha.valorCusto.toNumber(),
  valorVenda: linha.valorVenda.toNumber(),
  quantidadeEstoque: disponivel,
  ativo: linha.ativo,
  imagem: linha.imagem ?? undefined,
  totalVendido: linha.totalVendido,
});

const vazio = (): Carrinho => ({
  itens: [],
  itensRemovidos: [],
  subtotal: 0,
  total: 0,
});

export const carrinhoService = {
  /** RN0044: os dois prazos são parâmetros do sistema, não constantes. */
  parametros(): ParametrosBloqueio {
    return {
      minutosLimite: env.minutosBloqueioCarrinho,
      minutosAviso: env.minutosAvisoBloqueio,
    };
  },

  /**
   * RF0031 e RNF0042: devolve o carrinho com os itens ativos e, separados,
   * os que o prazo retirou — que a tela continua exibindo.
   */
  async ver(clienteId: number): Promise<Carrinho> {
    await carrinhoModel.colherExpirados(clienteId);

    const carrinho = await carrinhoModel.buscar(clienteId);

    if (!carrinho || carrinho.itens.length === 0) return vazio();

    const saldos = await estoqueModel.saldos(
      carrinho.itens.map(i => i.produtoId),
    );
    const bloqueadoAte = carrinhoModel.bloqueadoAte(carrinho.atualizadoEm);

    const converter = (linha: CarrinhoCompleto['itens'][number]): ItemCarrinho => {
      const valorUnitario = linha.valorUnitario.toNumber();
      const expirado = linha.expiradoEm !== null;
      // O saldo mostrado soma de volta o que este próprio item segura: é o
      // teto que o cliente pode escolher sem esbarrar na RN0031.
      const saldo = saldos.get(linha.produtoId);
      const disponivelParaEle =
        (saldo?.disponivel ?? 0) + (expirado ? 0 : linha.quantidade);

      return {
        produto: paraProduto(linha.produto, disponivelParaEle),
        quantidade: linha.quantidade,
        valorUnitario,
        subtotal: duasCasas(valorUnitario * linha.quantidade),
        bloqueadoAte: bloqueadoAte.toISOString(),
        expirado,
      };
    };

    const todos = carrinho.itens.map(converter);
    const itens = todos.filter(i => !i.expirado);
    const itensRemovidos = todos.filter(i => i.expirado);
    const subtotal = duasCasas(itens.reduce((s, i) => s + i.subtotal, 0));

    return { itens, itensRemovidos, subtotal, total: subtotal };
  },

  /**
   * RF0031/RF0032 com a RN0031: não entra no carrinho o que não existe em
   * estoque, nem mais do que existe. O bloqueio que o próprio cliente já
   * tem deste produto não conta contra ele.
   */
  async adicionar(
    clienteId: number,
    produtoId: number,
    quantidade: number,
  ): Promise<Carrinho> {
    await carrinhoModel.colherExpirados(clienteId);

    const produto = await produtosModel.buscarPorId(produtoId);

    if (!produto) throw ApiError.naoEncontrado('Produto não encontrado.');
    if (!produto.ativo) {
      throw ApiError.requisicaoInvalida('Este produto não está à venda.');
    }

    const jaNoCarrinho = await estoqueModel.bloqueadoPeloCliente(
      clienteId,
      produtoId,
    );
    const desejado = jaNoCarrinho + quantidade;
    const tetoDoCliente = produto.quantidadeEstoque + jaNoCarrinho;

    // RN0031: a comparação é com o disponível, não com o saldo bruto.
    if (tetoDoCliente <= 0) {
      throw ApiError.requisicaoInvalida(
        `${produto.nome} está sem estoque no momento.`,
      );
    }
    if (desejado > tetoDoCliente) {
      throw ApiError.requisicaoInvalida(
        `Há apenas ${tetoDoCliente} unidade(s) de ${produto.nome} disponível(is).`,
      );
    }

    await carrinhoModel.salvarItem(
      clienteId,
      produtoId,
      desejado,
      produto.valorVenda,
    );

    return this.ver(clienteId);
  },

  /** RF0032: trocar a quantidade de um item já adicionado. Zero remove. */
  async alterarQuantidade(
    clienteId: number,
    produtoId: number,
    quantidade: number,
  ): Promise<Carrinho> {
    if (quantidade <= 0) return this.remover(clienteId, produtoId);

    await carrinhoModel.colherExpirados(clienteId);

    const produto = await produtosModel.buscarPorId(produtoId);

    if (!produto) throw ApiError.naoEncontrado('Produto não encontrado.');

    const jaNoCarrinho = await estoqueModel.bloqueadoPeloCliente(
      clienteId,
      produtoId,
    );
    const teto = produto.quantidadeEstoque + jaNoCarrinho;

    if (quantidade > teto) {
      throw ApiError.requisicaoInvalida(
        `Há apenas ${teto} unidade(s) de ${produto.nome} disponível(is).`,
      );
    }

    await carrinhoModel.salvarItem(
      clienteId,
      produtoId,
      quantidade,
      produto.valorVenda,
    );

    return this.ver(clienteId);
  },

  /** RF0031: excluir item do carrinho, devolvendo o bloqueio ao estoque. */
  async remover(clienteId: number, produtoId: number): Promise<Carrinho> {
    const removeu = await carrinhoModel.removerItem(clienteId, produtoId);

    if (!removeu) {
      throw ApiError.naoEncontrado('Este item não está no carrinho.');
    }

    return this.ver(clienteId);
  },

  /**
   * RNF0042: devolver ao carrinho um item que o prazo havia retirado. Passa
   * pela mesma validação de estoque, porque nesse meio-tempo o produto pode
   * ter sido vendido para outro cliente.
   */
  async restaurar(clienteId: number, produtoId: number): Promise<Carrinho> {
    const carrinho = await carrinhoModel.buscar(clienteId);
    const item = carrinho?.itens.find(
      i => i.produtoId === produtoId && i.expiradoEm !== null,
    );

    if (!item) {
      throw ApiError.naoEncontrado(
        'Este item não está na lista de removidos do carrinho.',
      );
    }

    await carrinhoModel.removerItem(clienteId, produtoId);

    return this.adicionar(clienteId, produtoId, item.quantidade);
  },

  async esvaziar(clienteId: number): Promise<Carrinho> {
    await carrinhoModel.esvaziar(clienteId);

    return vazio();
  },

  /**
   * RN0032: entre a adição e a finalização o estoque pode ter mudado. Esta
   * conferência ajusta a quantidade, remove o que ficou indisponível e
   * devolve a lista de alertas para a tela avisar o cliente.
   *
   * Roda dentro da transação do checkout, com o pedido já sendo montado.
   */
  async revalidarDisponibilidade(
    clienteId: number,
    tx: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient,
  ): Promise<AlertaDisponibilidade[]> {
    const carrinho = await tx.carrinho.findUnique({
      where: { clienteId },
      include: { itens: { include: { produto: true } } },
    });

    if (!carrinho) return [];

    const alertas: AlertaDisponibilidade[] = [];

    for (const item of carrinho.itens.filter(i => i.expiradoEm === null)) {
      const emEstoque = await tx.itemEstoque.aggregate({
        where: { produtoId: item.produtoId },
        _sum: { quantidade: true },
      });
      const saldo = emEstoque._sum.quantidade ?? 0;

      if (saldo >= item.quantidade) continue;

      if (saldo <= 0) {
        await tx.itemCarrinho.delete({ where: { id: item.id } });
        alertas.push({
          produtoId: item.produtoId,
          produtoNome: item.produto.nome,
          tipo: 'ITEM_REMOVIDO',
          quantidadeAnterior: item.quantidade,
          quantidadeAtual: 0,
        });
        continue;
      }

      await tx.itemCarrinho.update({
        where: { id: item.id },
        data: { quantidade: saldo },
      });
      alertas.push({
        produtoId: item.produtoId,
        produtoNome: item.produto.nome,
        tipo: 'QUANTIDADE_AJUSTADA',
        quantidadeAnterior: item.quantidade,
        quantidadeAtual: saldo,
      });
    }

    return alertas;
  },
};
