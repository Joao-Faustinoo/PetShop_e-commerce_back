/**
 * [MODEL] Model do assistente de recomendação
 *
 * O QUE FAZ: reúne o contexto do cliente — pets e histórico de compras — e
 * conversa com a API do Google Gemini.
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
import { ContextoRecomendacao } from '../types/chat/types';
import { Pet } from '../types/pets/types';
import { ApiError } from '../utils/ApiError';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Quantas vezes cada valor aparece, do mais frequente ao menos. */
const porFrequencia = (valores: number[]): number[] => {
  const contagem = new Map<number, number>();
  valores.forEach(v => contagem.set(v, (contagem.get(v) ?? 0) + 1));

  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([valor]) => valor);
};

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
};
