/**
 * [MODEL] Service de assistente de recomendação
 *
 * O QUE FAZ: monta o contexto do cliente e consulta a API do Google Gemini,
 * devolvendo a resposta com os produtos sugeridos, filtrados pela espécie
 * e pelo porte do pet.
 *
 * COMO FARÁ: pede o contexto e a resposta ao model, e aplica as regras:
 * quem é sugerido precisa servir ao pet, e só produto ativo e com saldo
 * entra. O recorte acontece ANTES de pontuar, e não depois: uma roupa de
 * gato bem avaliada continua sem servir a um cão.
 *
 * Sobre a RNF0047: o modelo generativo responde a partir do contexto do
 * cliente, e cada interação é gravada com a avaliação que ele deu à
 * resposta. Esse registro é a matéria-prima do recomendador treinado —
 * quem ordena os candidatos antes de eles chegarem ao prompt. A premissa
 * está escrita em docs/PREMISSAS.md.
 *
 * ATENDE: RNF0047
 */

import { chatModel } from '../models/chatModel';
import { produtosModel } from '../models/produtosModel';
import { recomendacaoModel } from '../models/recomendacaoModel';
import { ContextoRecomendacao, Mensagem } from '../types/chat/types';
import { Pet } from '../types/pets/types';
import { Produto } from '../types/produtos/types';
import { ApiError } from '../utils/ApiError';
import {
  atributosDe,
  PesosDoModelo,
  pontuarComModelo,
} from '../utils/recomendacao';
import { executarEmTransacao } from '../utils/transacao';

/** Quantos produtos o assistente anexa à resposta. */
const MAXIMO_SUGESTOES = 4;

/** Quantos produtos do catálogo descrever ao modelo. */
const CATALOGO_NO_PROMPT = 30;

/**
 * Os produtos que servem aos pets do cliente. Espécie e porte são
 * recorte, não pontuação: um produto que não serve não deve aparecer nem
 * em último lugar. Afrouxa primeiro o porte e depois a espécie, porque é
 * melhor sugerir algo do tamanho errado do que devolver a conversa vazia.
 *
 * Olha TODOS os pets, não só o primeiro: quem tem um cão e um gato
 * precisa enxergar as duas prateleiras. Filtrar pelo primeiro fazia o
 * assistente responder que não há nada para o segundo animal, o que é
 * falso — e some justamente quando a pessoa pergunta por ele.
 */
const servemAosPets = (produtos: Produto[], pets: Pet[]): Produto[] => {
  if (pets.length === 0) return produtos;

  const especies = new Set(pets.map(p => p.especie));
  const portes = new Set(pets.map(p => p.porte));

  const daEspecie = produtos.filter(p => especies.has(p.especie));
  const doPorte = daEspecie.filter(p => portes.has(p.porte));

  if (doPorte.length > 0) return doPorte;
  if (daEspecie.length > 0) return daEspecie;

  return produtos;
};

/**
 * A ordenação de partida, usada enquanto não existe modelo treinado — na
 * base recém-criada, antes do primeiro `npm run treinar`. É a regra
 * escrita à mão que o modelo substitui depois de aprender com o feedback.
 */
const pontuarPorHeuristica = (
  produto: Produto,
  contexto: ContextoRecomendacao,
): number => {
  let pontos = 0;

  const posicaoCategoria = contexto.categoriasPreferidas.findIndex(c =>
    produto.categoriaIds.includes(c),
  );
  if (posicaoCategoria >= 0) pontos += 10 - posicaoCategoria;

  const posicaoMarca = contexto.marcasPreferidas.indexOf(produto.marcaId);
  if (posicaoMarca >= 0) pontos += 6 - posicaoMarca;

  // O que o cliente já comprou desce: a sugestão é para descobrir, não
  // para repetir o que ele já tem em casa.
  if (contexto.produtosComprados.includes(produto.id)) pontos -= 5;

  return pontos;
};

/**
 * Os produtos que a resposta realmente citou, na ordem em que aparecem no
 * texto.
 *
 * POR QUE existe: o modelo recebe os trinta produtos mais aderentes e
 * escolhe entre eles, mas os cards mostravam sempre os quatro primeiros
 * dessa lista — então o texto podia recomendar o Moletom enquanto a tela
 * exibia a Bandana. Quem lê os dois ao mesmo tempo vê a contradição.
 *
 * A identificação é por correspondência exata contra os nomes que foram
 * enviados no prompt, não por interpretação do texto: é comparar com
 * trinta strings conhecidas, não adivinhar o que a frase quis dizer.
 *
 * Sem nenhuma citação — numa resposta que só faz uma pergunta de volta,
 * por exemplo — o chamador decide o que mostrar.
 */
const citadosNaResposta = (
  resposta: string,
  candidatos: Produto[],
): Produto[] => {
  const texto = resposta.toLowerCase();

  return candidatos
    .map(produto => ({ produto, posicao: texto.indexOf(produto.nome.toLowerCase()) }))
    .filter(({ posicao }) => posicao >= 0)
    .sort((a, b) => a.posicao - b.posicao)
    .map(({ produto }) => produto);
};

/**
 * RNF0047: ordena pelo que o modelo treinado prevê que o cliente vai
 * achar útil. O treino aprendeu essa relação do feedback que os clientes
 * deram às respostas e dos dados de venda; aqui ela é só aplicada.
 *
 * Sem modelo treinado, cai na heurística. É o que faz a base nova
 * funcionar antes do primeiro treino, e o que mantém o assistente de pé
 * se um treino gravar pesos que o código não reconhece.
 */
const ordenarPorAfinidade = (
  produtos: Produto[],
  contexto: ContextoRecomendacao,
  modelo: PesosDoModelo | null,
): Produto[] => {
  if (!modelo) {
    return [...produtos].sort(
      (a, b) =>
        pontuarPorHeuristica(b, contexto) - pontuarPorHeuristica(a, contexto),
    );
  }

  // A popularidade é relativa ao catálogo, e precisa da mesma escala que
  // o treino usou: o mais vendido entre os candidatos.
  const maiorVenda = Math.max(...produtos.map(p => p.totalVendido), 1);

  return produtos
    .map(produto => ({
      produto,
      nota: pontuarComModelo(atributosDe(contexto, produto, maiorVenda), modelo),
    }))
    .sort((a, b) => b.nota - a.nota)
    .map(({ produto }) => produto);
};

/** O que o modelo precisa saber para responder como vendedor desta loja. */
const montarInstrucao = (
  contexto: ContextoRecomendacao,
  candidatos: Produto[],
): string => {
  const pets = contexto.pets.length
    ? contexto.pets
        .map(
          p =>
            `${p.nome} (${p.especie.toLowerCase()}, raça ${p.raca}, porte ${p.porte}, ${p.peso} kg)`,
        )
        .join('; ')
    : 'o cliente ainda não cadastrou pets';

  const catalogo = candidatos
    .slice(0, CATALOGO_NO_PROMPT)
    .map(
      p =>
        `- ${p.sku}: ${p.nome}, R$ ${p.valorVenda.toFixed(2)}, para ${p.especie.toLowerCase()} porte ${p.porte}`,
    )
    .join('\n');

  return [
    'Você é o assistente de uma loja de roupas e acessórios para pets.',
    'Responda em português do Brasil, em no máximo três frases, com tom cordial e direto.',
    'Recomende apenas produtos da lista abaixo. Escreva o nome do produto exatamente como ele aparece nela, sem repetir o código e sem o preço. Nunca invente produto, preço ou prazo.',
    'Se nada na lista servir, diga isso com franqueza e ofereça ajuda para refinar a busca.',
    'Não fale de assunto fora da loja e dos cuidados com o pet.',
    '',
    `Pets do cliente: ${pets}.`,
    '',
    'Produtos disponíveis:',
    catalogo || '(nenhum produto disponível no momento)',
  ].join('\n');
};

export const chatService = {
  /** RNF0047: responde à pergunta e anexa os produtos sugeridos. */
  async responder(clienteId: number, texto: string): Promise<Mensagem> {
    const contexto = await chatModel.contextoDoCliente(clienteId);

    // Só entra na conversa o que está à venda: sugerir produto inativo ou
    // sem saldo seria oferecer o que a loja não pode entregar (RN0031).
    const { itens } = await produtosModel.listar(
      { ativo: true },
      { pagina: 1, itensPorPagina: 100 },
    );
    const disponiveis = itens.filter(p => p.quantidadeEstoque > 0);

    const modelo = await recomendacaoModel.maisRecente();

    const candidatos = ordenarPorAfinidade(
      servemAosPets(disponiveis, contexto.pets),
      contexto,
      modelo?.pesos ?? null,
    );

    const pergunta = texto.trim();
    const resposta = await chatModel.perguntar(
      montarInstrucao(contexto, candidatos),
      pergunta,
    );

    /*
     * O que a resposta citou vem primeiro. Quando ela não cita nada, os
     * mais aderentes entram como vitrine — é melhor oferecer caminho do
     * que deixar a conversa sem nada para clicar.
     */
    const citados = citadosNaResposta(resposta, candidatos);
    const sugeridos = (citados.length > 0 ? citados : candidatos).slice(
      0,
      MAXIMO_SUGESTOES,
    );

    /*
     * A gravação vem depois da resposta, de propósito: se o modelo falhar,
     * não fica interação órfã no banco para o treino ler como se tivesse
     * havido conversa.
     */
    const interacao = await executarEmTransacao(tx =>
      chatModel.registrarInteracao(
        {
          clienteId,
          pergunta,
          resposta,
          produtosSugeridos: sugeridos.map(p => p.id),
        },
        tx,
      ),
    );

    return {
      id: interacao.id,
      autor: 'ASSISTENTE',
      texto: resposta,
      dataHora: interacao.dataHora,
      produtosSugeridos: sugeridos,
    };
  },

  /**
   * RNF0047 item 3: o cliente diz se a resposta serviu. É o sinal que o
   * treinamento do recomendador consome, e por isso a avaliação pode ser
   * trocada — quem mudou de ideia corrige, e o dado reflete a opinião
   * final, não a primeira.
   */
  async avaliar(clienteId: number, id: number, util: boolean): Promise<void> {
    const avaliou = await executarEmTransacao(tx =>
      chatModel.avaliar(id, clienteId, util, tx),
    );

    if (!avaliou) {
      throw ApiError.naoEncontrado('Resposta não encontrada nesta conversa.');
    }
  },
};
