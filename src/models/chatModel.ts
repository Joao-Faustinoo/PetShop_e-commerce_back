/**
 * [MODEL] Model do assistente de recomendação
 *
 * O QUE FAZ: reúne o contexto do cliente — pets e histórico de compras —,
 * conversa com a API do Google Gemini e guarda cada interação com a
 * avaliação que o cliente deu à resposta.
 *
 * COMO FARÁ: a chamada ao Gemini mora aqui porque o model é a fronteira
 * com o que está fora do processo; o banco é uma dessas fronteiras, e o
 * serviço de IA é outra. Isso deixa o service testável sem rede.
 *
 * A integração usa a API REST com o `fetch` nativo do Node, sem SDK. Uma
 * dependência a menos para versionar, e a chamada é um POST com JSON.
 *
 * ATENDE: RNF0047
 */

import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { ContextoRecomendacao, InteracaoChat } from '../types/chat/types';
import { Pet } from '../types/pets/types';
import { ApiError } from '../utils/ApiError';
import { Executor } from '../utils/transacao';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Quantas vezes cada valor aparece, do mais frequente ao menos. */
const porFrequencia = (valores: number[]): number[] => {
  const contagem = new Map<number, number>();
  valores.forEach(v => contagem.set(v, (contagem.get(v) ?? 0) + 1));

  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([valor]) => valor);
};

/** Datas viram texto ISO e o `null` do banco vira `undefined`, como nos
 *  outros models — o JSON da API não carrega tipo do Prisma. */
const paraInteracao = (linha: {
  id: number;
  clienteId: number;
  pergunta: string;
  resposta: string;
  produtosSugeridos: number[];
  util: boolean | null;
  avaliadoEm: Date | null;
  dataHora: Date;
}): InteracaoChat => ({
  id: linha.id,
  clienteId: linha.clienteId,
  pergunta: linha.pergunta,
  resposta: linha.resposta,
  produtosSugeridos: linha.produtosSugeridos,
  util: linha.util ?? undefined,
  avaliadoEm: linha.avaliadoEm?.toISOString(),
  dataHora: linha.dataHora.toISOString(),
});

export const chatModel = {
  /**
   * RNF0047: a recomendação parte dos pets do cliente e do que ele já
   * comprou. As preferências não são campo de cadastro: saem da leitura do
   * histórico, pelas categorias e marcas que mais se repetem nas compras.
   */
  async contextoDoCliente(clienteId: number): Promise<ContextoRecomendacao> {
    const [pets, itens] = await Promise.all([
      prisma.pet.findMany({ where: { clienteId }, orderBy: { id: 'asc' } }),
      prisma.itemPedido.findMany({
        where: { pedido: { clienteId } },
        include: {
          produto: {
            select: {
              id: true,
              marcaId: true,
              categorias: { select: { categoriaId: true } },
            },
          },
        },
      }),
    ]);

    return {
      pets: pets.map(
        (p): Pet => ({
          id: p.id,
          clienteId: p.clienteId,
          nome: p.nome,
          especie: p.especie,
          raca: p.raca,
          porte: p.porte,
          peso: p.peso.toNumber(),
        }),
      ),
      produtosComprados: [...new Set(itens.map(i => i.produtoId))],
      categoriasPreferidas: porFrequencia(
        itens.flatMap(i => i.produto.categorias.map(c => c.categoriaId)),
      ),
      marcasPreferidas: porFrequencia(itens.map(i => i.produto.marcaId)),
    };
  },

  /**
   * Pergunta ao Gemini e devolve o texto da resposta.
   *
   * Sem chave configurada, lança 503 em vez de 500: a requisição do
   * cliente estava correta, o que falta é configuração do servidor — e a
   * mensagem diz exatamente isso, para ninguém procurar defeito no lugar
   * errado.
   */
  async perguntar(instrucao: string, pergunta: string): Promise<string> {
    if (!env.geminiApiKey) {
      throw ApiError.servicoIndisponivel(
        'O assistente está indisponível: a chave do Google Gemini não foi configurada no servidor.',
      );
    }

    let resposta: Response;

    try {
      resposta = await fetch(
        `${ENDPOINT}/${env.geminiModelo}:generateContent?key=${env.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instrucao }] },
            contents: [{ role: 'user', parts: [{ text: pergunta }] }],
          }),
          signal: AbortSignal.timeout(env.geminiTimeoutMs),
        },
      );
    } catch {
      throw ApiError.servicoIndisponivel(
        'O assistente não respondeu a tempo. Tente de novo em instantes.',
      );
    }

    if (!resposta.ok) {
      throw ApiError.servicoIndisponivel(
        `O assistente recusou a consulta (HTTP ${resposta.status}).`,
      );
    }

    const corpo = (await resposta.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const texto = corpo.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!texto) {
      throw ApiError.servicoIndisponivel('O assistente devolveu uma resposta vazia.');
    }

    return texto;
  },

  /**
   * RNF0047: a interação é gravada ao ser respondida, já com os produtos
   * que acompanharam a sugestão e ainda sem avaliação. O id devolvido é o
   * que a tela usa depois para marcar a resposta como útil ou não.
   */
  async registrarInteracao(
    dados: {
      clienteId: number;
      pergunta: string;
      resposta: string;
      produtosSugeridos: number[];
    },
    tx: Executor,
  ): Promise<InteracaoChat> {
    return paraInteracao(await tx.interacaoChat.create({ data: dados }));
  },

  /**
   * A avaliação é do dono da conversa: o `clienteId` entra no `where` para
   * que ninguém avalie a interação alheia. `updateMany` em vez de `update`
   * porque o par (id, cliente) não é chave única — e um update que não
   * acha nada devolve contagem zero em vez de estourar.
   */
  async avaliar(
    id: number,
    clienteId: number,
    util: boolean,
    tx: Executor,
  ): Promise<boolean> {
    const { count } = await tx.interacaoChat.updateMany({
      where: { id, clienteId },
      data: { util, avaliadoEm: new Date() },
    });

    return count > 0;
  },

  /**
   * As interações já avaliadas, que são o conjunto de treino do
   * recomendador. Sem avaliação não há sinal, então ficam de fora.
   */
  async listarAvaliadas(tx: Executor = prisma): Promise<InteracaoChat[]> {
    const linhas = await tx.interacaoChat.findMany({
      where: { util: { not: null } },
      orderBy: { dataHora: 'asc' },
    });

    return linhas.map(paraInteracao);
  },
};
