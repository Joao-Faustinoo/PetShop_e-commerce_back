/**
 * [MODEL] Tipos do assistente de recomendação
 *
 * O QUE FAZ: descreve as mensagens trocadas com a IA generativa e as
 * sugestões de produto que ela devolve.
 *
 * COMO FARÁ: exporta `AutorMensagem` (CLIENTE ou ASSISTENTE),
 * `Mensagem` (id, autor, texto, dataHora e produtosSugeridos),
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
  id: number;
  autor: AutorMensagem;
  texto: string;
  dataHora: string;
  /** Produtos que o assistente anexa à resposta como sugestão. */
  produtosSugeridos?: Produto[];
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
