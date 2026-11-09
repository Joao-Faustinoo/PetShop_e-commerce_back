/**
 * [MODEL] Service de produtos
 *
 * O QUE FAZ: entrega o catálogo consultável e o detalhe de um produto.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`.
 *
 * ESTADO: a fatia de leitura, que é a que a venda precisa. O cadastro e a
 * precificação de produto (RF0011-RF0016) seguem no front com dados
 * mockados e entram quando essa fatia for portada.
 *
 * ATENDE: RF0017, RN0012, RN0031
 */

import { logModel } from '../models/logModel';
import { DadosProduto, produtosModel } from '../models/produtosModel';
import { Pagina, Paginacao } from '../types/common/types';
import {
  AlterarProdutoPayload,
  CriarProdutoPayload,
  Produto,
  ProdutoFiltros,
} from '../types/produtos/types';
import { ApiError } from '../utils/ApiError';
import { montarPagina } from '../utils/paginacao';
import { executarEmTransacao } from '../utils/transacao';

/**
 * RF0052 e RN0013: o valor de venda é o custo acrescido do percentual do
 * grupo de precificação. É função pura, fora do objeto do service, porque
 * o estoque também a usa ao recalcular o preço pela RN0051 — e porque
 * assim ela pode ser conferida sem banco.
 */
export const calcularValorVenda = (
  valorCusto: number,
  margemPercentual: number,
): number => Number((valorCusto * (1 + margemPercentual / 100)).toFixed(2));

const ENTIDADE = 'Produto';

/**
 * Confere os domínios da RN0011 e aplica a precificação da RN0013,
 * entregando a linha pronta para gravar. É o caminho comum do cadastro e
 * da alteração, para que as duas recusem e calculem igual.
 */
const montarDados = async (
  payload: CriarProdutoPayload,
): Promise<DadosProduto> => {
  if (payload.categoriaIds.length === 0) {
    throw ApiError.requisicaoInvalida('Informe ao menos uma categoria.');
  }

  const problema = await produtosModel.dominiosExistem(
    payload,
    payload.categoriaIds,
  );

  if (problema) throw ApiError.requisicaoInvalida(problema);

  const margem = await produtosModel.margemDoGrupo(payload.grupoPrecificacaoId);

  return {
    nome: payload.nome.trim(),
    descricao: payload.descricao.trim(),
    marcaId: payload.marcaId,
    categoriaIds: payload.categoriaIds,
    especie: payload.especie,
    porte: payload.porte,
    corId: payload.corId,
    materialId: payload.materialId,
    altura: payload.dimensoes.altura,
    largura: payload.dimensoes.largura,
    profundidade: payload.dimensoes.profundidade,
    peso: payload.dimensoes.peso,
    codigoBarras: payload.codigoBarras.trim(),
    grupoPrecificacaoId: payload.grupoPrecificacaoId,
    valorCusto: payload.valorCusto,
    valorVenda: calcularValorVenda(payload.valorCusto, margem ?? 0),
    imagem: payload.imagem,
  };
};

export const produtosService = {
  /** RF0017: consulta por qualquer campo, isolado ou combinado. */
  async listar(
    filtros: ProdutoFiltros,
    paginacao: Paginacao,
  ): Promise<Pagina<Produto>> {
    const { itens, total } = await produtosModel.listar(filtros, paginacao);

    return montarPagina(itens, total, paginacao);
  },

  async buscarPorId(id: number): Promise<Produto> {
    const produto = await produtosModel.buscarPorId(id);

    if (!produto) throw ApiError.naoEncontrado('Produto não encontrado.');

    return produto;
  },

  /** RF0011: o cadastro único do produto, com o SKU que a RNF0021 exige. */
  async criar(usuarioId: number, payload: CriarProdutoPayload): Promise<Produto> {
    const dados = await montarDados(payload);

    if (await produtosModel.codigoBarrasEmUso(dados.codigoBarras, undefined)) {
      throw ApiError.conflito('Já existe produto com este código de barras.');
    }

    const id = await executarEmTransacao(async tx => {
      const criado = await produtosModel.criar(dados, tx);

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'INSERCAO',
          entidade: ENTIDADE,
          entidadeId: criado,
          depois: { nome: dados.nome, valorVenda: dados.valorVenda },
        },
        tx,
      );

      return criado;
    });

    return this.buscarPorId(id);
  },

  /** RF0014: alterar os dados cadastrais, respeitando a RN0014. */
  async alterar(
    usuarioId: number,
    id: number,
    payload: AlterarProdutoPayload,
  ): Promise<Produto> {
    const antes = await this.buscarPorId(id);
    const dados = await montarDados(payload);

    if (await produtosModel.codigoBarrasEmUso(dados.codigoBarras, id)) {
      throw ApiError.conflito('Já existe produto com este código de barras.');
    }

    /*
     * RN0014: o preço só pode ficar abaixo da margem do grupo com
     * autorização do gerente. O DRS prevê dois perfis, e não tem o de
     * gerente: a autorização chega como um aceite explícito de quem está
     * alterando, e fica registrada no log junto da alteração.
     */
    if (payload.valorVenda !== undefined) {
      const minimo = dados.valorVenda;

      if (payload.valorVenda < minimo && !payload.autorizacaoGerente) {
        throw ApiError.requisicaoInvalida(
          `R$ ${payload.valorVenda} fica abaixo da margem do grupo, que pede ` +
            `ao menos R$ ${minimo}. É necessária a autorização do gerente de vendas.`,
        );
      }

      dados.valorVenda = payload.valorVenda;
    }

    await executarEmTransacao(async tx => {
      await produtosModel.atualizar(id, dados, tx);

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: ENTIDADE,
          entidadeId: id,
          antes: { nome: antes.nome, valorVenda: antes.valorVenda },
          depois: {
            nome: dados.nome,
            valorVenda: dados.valorVenda,
            ...(payload.autorizacaoGerente && { autorizadoAbaixoDaMargem: true }),
          },
        },
        tx,
      );
    });

    return this.buscarPorId(id);
  },

  /**
   * RF0012 e RF0016: inativar e ativar. A RN0015 e a RN0017 pedem motivo
   * E justificativa nas duas direções — por isso a mesma função atende os
   * dois sentidos, mudando só a tabela de motivo consultada.
   */
  async alterarSituacao(
    usuarioId: number,
    id: number,
    ativo: boolean,
    motivoId: number,
    justificativa: string,
  ): Promise<Produto> {
    const antes = await this.buscarPorId(id);

    if (antes.ativo === ativo) {
      throw ApiError.requisicaoInvalida(
        ativo ? 'Este produto já está ativo.' : 'Este produto já está inativo.',
      );
    }

    if (!(await produtosModel.motivoExiste(ativo, motivoId))) {
      throw ApiError.requisicaoInvalida('Motivo não registrado.');
    }

    await executarEmTransacao(async tx => {
      await produtosModel.alterarSituacao(
        id,
        {
          ativo,
          motivoInativacaoId: ativo ? null : motivoId,
          motivoAtivacaoId: ativo ? motivoId : null,
          justificativaSituacao: justificativa.trim(),
        },
        tx,
      );

      await logModel.registrar(
        {
          usuarioId,
          operacao: 'ALTERACAO',
          entidade: ENTIDADE,
          entidadeId: id,
          antes: { ativo: antes.ativo },
          depois: { ativo, motivoId, justificativa: justificativa.trim() },
        },
        tx,
      );
    });

    return this.buscarPorId(id);
  },
};
