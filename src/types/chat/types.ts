/**
 * [MODEL] Tipos do assistente de recomendação
 *
 * O QUE FAZ: descreve as mensagens trocadas com a IA generativa e as
 * sugestões de produto que ela devolve.
 *
 * COMO FARÁ: exporta `AutorMensagem` (CLIENTE ou ASSISTENTE),
 * `Mensagem` (id, autor, texto, dataHora e produtosSugeridos),
 * `InteracaoChat` (a pergunta, a resposta e a avaliação, como ficam
 * gravadas),
 * `ContextoRecomendacao` (pets do cliente + histórico de compras +
 * preferências, que é o que a RNF0047 manda alimentar o modelo) e
 * `EnviarMensagemPayload`.
 *
 * ATENDE: RNF0047
 */

import { Pet } from '../pets/types';
import { Produto } from '../produtos/types';

export type AutorMensagem = 'CLIENTE' | 'ASSISTENTE';

export interface Mensagem {
  /**
   * Para a resposta do assistente, é o id da `InteracaoChat` gravada — é
   * por ele que a tela avalia a resposta depois.
   */
  id: number;
  autor: AutorMensagem;
  texto: string;
  dataHora: string;
  /** Produtos que o assistente anexa à resposta como sugestão. */
  produtosSugeridos?: Produto[];
  /** RNF0047: true = útil, false = não útil, ausente = não avaliada. */
  util?: boolean;
}

/**
 * RNF0047 item 3: a interação como ela fica no banco. É a linha que o
 * treinamento do recomendador lê — produto sugerido em resposta útil é
 * exemplo positivo, em resposta não útil é negativo.
 */
export interface InteracaoChat {
  id: number;
  clienteId: number;
  pergunta: string;
  resposta: string;
  produtosSugeridos: number[];
  util?: boolean;
  avaliadoEm?: string;
  dataHora: string;
}

export interface AvaliarRespostaPayload {
  util: boolean;
}

/** RNF0047: o modelo é alimentado com pets, histórico e preferências. */
export interface ContextoRecomendacao {
  pets: Pet[];
  /** Ids dos produtos já comprados pelo cliente. */
  produtosComprados: number[];
  /** Categorias mais frequentes no histórico do cliente. */
  categoriasPreferidas: number[];
  marcasPreferidas: number[];
}

export interface EnviarMensagemPayload {
  clienteId: number;
  texto: string;
}
