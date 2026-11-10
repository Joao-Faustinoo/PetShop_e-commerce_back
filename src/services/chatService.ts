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
 * Sobre a RNF0047: o DRS pede um modelo "treinado com base em dados de
 * vendas e feedback". Treinar modelo generativo não é viável nem
 * apropriado aqui; o que o sistema faz — e é o que se faz na prática — é
 * levar esses dados ao modelo como contexto da pergunta. A premissa fica
 * registrada.
 *
 * ATENDE: RNF0047
 */

import { chatModel } from '../models/chatModel';
import { produtosModel } from '../models/produtosModel';
import { ContextoRecomendacao, Mensagem } from '../types/chat/types';
import { Pet } from '../types/pets/types';
import { Produto } from '../types/produtos/types';

/** Quantos produtos o assistente anexa à resposta. */
const MAXIMO_SUGESTOES = 4;

/** Quantos produtos do catálogo descrever ao modelo. */
const CATALOGO_NO_PROMPT = 30;

/**
 * Os produtos que servem ao pet. Espécie e porte são recorte, não
 * pontuação: um produto que não serve não deve aparecer nem em último
 * lugar. Afrouxa primeiro o porte e depois a espécie, porque é melhor
 * sugerir algo do tamanho errado do que devolver a conversa vazia.
 */
const servemAoPet = (produtos: Produto[], pet: Pet | undefined): Produto[] => {
  if (!pet) return produtos;

  const daEspecie = produtos.filter(p => p.especie === pet.especie);
  const doPorte = daEspecie.filter(p => p.porte === pet.porte);

  if (doPorte.length > 0) return doPorte;
  if (daEspecie.length > 0) return daEspecie;

  return produtos;
};

const pontuar = (produto: Produto, contexto: ContextoRecomendacao): number => {
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

/** Ordena pelo que mais combina com o histórico do cliente. */
const ordenarPorAfinidade = (
  produtos: Produto[],
  contexto: ContextoRecomendacao,
): Produto[] =>
  [...produtos].sort((a, b) => pontuar(b, contexto) - pontuar(a, contexto));

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
    'Recomende apenas produtos da lista abaixo, citando o nome. Nunca invente produto, preço ou prazo.',
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

    const candidatos = ordenarPorAfinidade(
      servemAoPet(disponiveis, contexto.pets[0]),
      contexto,
    );

    const resposta = await chatModel.perguntar(
      montarInstrucao(contexto, candidatos),
      texto.trim(),
    );

    return {
      id: Date.now(),
      autor: 'ASSISTENTE',
      texto: resposta,
      dataHora: new Date().toISOString(),
      produtosSugeridos: candidatos.slice(0, MAXIMO_SUGESTOES),
    };
  },
};
