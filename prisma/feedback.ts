/**
 * [MODEL] Feedback do assistente, para o treinamento do recomendador
 *
 * O QUE FAZ: gera conversas com o assistente já avaliadas pelos clientes,
 * para que o item 3 da RNF0047 tenha de onde treinar.
 *
 * COMO FARÁ: sorteia cliente, pergunta e produtos sugeridos com um gerador
 * pseudoaleatório de semente fixa — a mesma carga produz sempre as mesmas
 * conversas, e o modelo treinado em cima delas é reproduzível.
 *
 * POR QUE o sinal não é aleatório: a avaliação acompanha a aderência da
 * sugestão ao cliente — categoria que ele mais compra E espécie que serve
 * a algum pet dele. Sugestão aderente tende a "útil"; sugestão que erra
 * os dois tende a "não útil". É essa correlação que o treinamento
 * aprende. Se o rótulo fosse sorteado, não haveria o que aprender e o
 * modelo treinado seria indistinguível de um chute.
 *
 * POR QUE há ruído: uma fração das avaliações é invertida de propósito.
 * Dado real não é perfeitamente separável, e um conjunto sem ruído
 * produziria acurácia de 100% — número que denuncia dado fabricado em vez
 * de sustentar o resultado.
 *
 * O que ele NÃO faz, de propósito:
 *
 * - **não chama o Gemini.** Gerar duzentas respostas pela API custaria
 *   tempo e cota para produzir texto que ninguém vai ler: o que o treino
 *   consome é o par (produtos sugeridos, avaliação), não a prosa.
 * - **não usa o cliente 1.** É o cliente das demonstrações e dos testes;
 *   a conversa dele precisa começar vazia na apresentação.
 *
 * ATENDE: RNF0047
 */

/** A faixa de ids reservada à carga, que o seed recria a cada execução. */
export const PRIMEIRO_ID_FEEDBACK = 10000;

/** Quantas conversas por cliente. Varia, para ninguém ter o mesmo tanto. */
const MINIMO_POR_CLIENTE = 24;
const MAXIMO_POR_CLIENTE = 32;

/** Por quantos dias para trás as conversas se espalham. */
const DIAS = 90;

/** Quantos produtos o assistente anexa a cada resposta. */
const SUGESTOES = 4;

/** A fração de avaliações invertidas — o ruído explicado no cabeçalho. */
const RUIDO = 0.12;

/** A fração de respostas que o cliente deixa sem avaliar. */
const SEM_AVALIACAO = 0.15;

const PERGUNTAS = [
  'O que você recomenda para o meu pet?',
  'Preciso de uma roupa para o frio, o que tem?',
  'Qual coleira combina com cachorro de porte médio?',
  'Tem alguma novidade que eu ainda não comprei?',
  'Quero um presente para o aniversário do meu cachorro.',
  'Qual o melhor brinquedo para gato?',
  'Procuro uma cama confortável, o que sugere?',
  'Tem acessório para passeio noturno?',
  'O que vocês têm de roupa impermeável?',
  'Meu pet tem pele sensível, o que indica?',
  'Quero algo parecido com o que já comprei antes.',
  'Qual produto é mais vendido para cães grandes?',
];

const ABERTURAS = [
  'Separei algumas opções que combinam com o que você já levou:',
  'Pelo seu histórico, estas devem agradar:',
  'Tenho estas sugestões para você:',
  'Olhando o que você costuma comprar, recomendo:',
  'Estas são as melhores opções disponíveis agora:',
];

export interface ClienteComPreferencia {
  id: number;
  /** Categorias que mais se repetem nas compras, da mais à menos frequente. */
  categoriasPreferidas: number[];
  /** As espécies dos pets do cliente. */
  especies: string[];
}

export interface ProdutoCategorizado {
  id: number;
  nome: string;
  categoriaIds: number[];
  especie: string;
}

export interface InteracaoSemeada {
  id: number;
  clienteId: number;
  pergunta: string;
  resposta: string;
  produtosSugeridos: number[];
  util: boolean | null;
  avaliadoEm: Date | null;
  dataHora: Date;
}

/** mulberry32: pequeno, determinístico e suficiente para semear dados. */
const geradorDe = (semente: number) => {
  let estado = semente;

  return (): number => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Monta as conversas avaliadas. Recebe os clientes já com as preferências
 * lidas do histórico, porque quem deriva preferência é o chatModel — aqui
 * não se decide o que o cliente gosta, só se usa.
 */
export const gerarFeedback = (
  clientes: ClienteComPreferencia[],
  produtos: ProdutoCategorizado[],
): InteracaoSemeada[] => {
  const sortear = geradorDe(13572468);
  const entre = (min: number, max: number): number =>
    min + Math.floor(sortear() * (max - min + 1));
  const umDe = <T>(lista: T[]): T => lista[entre(0, lista.length - 1)];

  const interacoes: InteracaoSemeada[] = [];
  const agora = Date.now();
  let id = PRIMEIRO_ID_FEEDBACK;

  for (const cliente of clientes) {
    const preferidas = new Set(cliente.categoriasPreferidas.slice(0, 2));
    const especies = new Set(cliente.especies);

    const naCategoria = (p: ProdutoCategorizado): boolean =>
      p.categoriaIds.some(c => preferidas.has(c));
    const paraOPet = (p: ProdutoCategorizado): boolean =>
      especies.size === 0 || especies.has(p.especie);

    // Dois baldes: o que acerta categoria e espécie, e o que erra os dois.
    const combinam = produtos.filter(p => naCategoria(p) && paraOPet(p));
    const destoam = produtos.filter(p => !naCategoria(p) && !paraOPet(p));

    /*
     * Um cliente só fica de fora se um dos baldes estiver vazio — sem os
     * dois não há contraste para treinar. Baldes pequenos são usados do
     * tamanho que têm: pedir mais produtos distintos do que o balde
     * contém faria o laço abaixo girar para sempre.
     */
    if (combinam.length === 0 || destoam.length === 0) continue;

    for (let n = entre(MINIMO_POR_CLIENTE, MAXIMO_POR_CLIENTE); n > 0; n -= 1) {
      /*
       * Metade das conversas sugere o que combina com o histórico e
       * metade sugere o que destoa. Sem as duas metades o conjunto teria
       * uma classe só, e não haveria contraste para treinar.
       */
      const acertou = sortear() < 0.5;
      const balde = acertou ? combinam : destoam;

      const quantas = Math.min(SUGESTOES, balde.length);
      const escolhidos: ProdutoCategorizado[] = [];

      while (escolhidos.length < quantas) {
        const candidato = umDe(balde);

        if (!escolhidos.some(p => p.id === candidato.id)) {
          escolhidos.push(candidato);
        }
      }

      // O rótulo segue a aderência, com a fração de ruído prevista.
      const avaliado = sortear() >= SEM_AVALIACAO;
      const util = avaliado ? (sortear() < RUIDO ? !acertou : acertou) : null;

      const dataHora = new Date(
        agora - entre(0, DIAS) * 86400000 - entre(0, 86399) * 1000,
      );

      interacoes.push({
        id,
        clienteId: cliente.id,
        pergunta: umDe(PERGUNTAS),
        resposta: `${umDe(ABERTURAS)} ${escolhidos
          .map(p => p.nome)
          .join(', ')}.`,
        produtosSugeridos: escolhidos.map(p => p.id),
        util,
        // Quem avalia o faz logo depois de ler a resposta.
        avaliadoEm: util === null ? null : new Date(dataHora.getTime() + 45000),
        dataHora,
      });

      id += 1;
    }
  }

  return interacoes;
};
