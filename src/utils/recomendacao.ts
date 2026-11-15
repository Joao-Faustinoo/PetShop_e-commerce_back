/**
 * [MODEL] Atributos e pontuação do recomendador treinado
 *
 * O QUE FAZ: descreve o que o modelo olha em cada par (cliente, produto) e
 * como os pesos aprendidos viram uma nota de 0 a 1.
 *
 * COMO FARÁ: `atributosDe` devolve o vetor na ordem de `ATRIBUTOS`, e
 * `pontuarComModelo` aplica a regressão logística. Treino e recomendação
 * importam ESTE arquivo — se o treino extraísse os atributos de um jeito
 * e a recomendação de outro, o modelo seria treinado com uma conta e
 * aplicado com outra, e o erro não apareceria em teste nenhum: as duas
 * metades funcionariam, só não falariam da mesma coisa.
 *
 * POR QUE regressão logística: o conjunto é pequeno (centenas de
 * exemplos), os atributos são poucos e interpretáveis, e o resultado é um
 * peso por atributo que dá para ler em voz alta — "a categoria preferida
 * pesa tanto, a espécie do pet pesa tanto". Uma rede neural acertaria
 * tanto quanto e não explicaria nada. E, decisivo aqui: cabe em cinquenta
 * linhas sem dependência nova.
 *
 * ATENDE: RNF0047
 */

import { Especie, PorteSigla } from '@prisma/client';

/**
 * Os atributos, na ordem. Mudar esta lista invalida os modelos já
 * treinados — por isso o `pesos` gravado no banco guarda o nome de cada
 * peso, e o carregamento recusa um modelo que não bata com ela.
 */
export const ATRIBUTOS = [
  /** Quão no topo das categorias preferidas do cliente o produto está. */
  'categoriaPreferida',
  /** O mesmo para a marca. */
  'marcaPreferida',
  /** O cliente já levou este produto antes. */
  'jaComprado',
  /** A espécie do produto serve a algum pet do cliente. */
  'especieDoPet',
  /** O porte do produto serve a algum pet do cliente. */
  'porteDoPet',
  /** O quanto o produto vende, em relação ao mais vendido do catálogo. */
  'popularidade',
] as const;

export type Atributo = (typeof ATRIBUTOS)[number];

/** Um peso por atributo, mais o viés. */
export interface PesosDoModelo {
  vies: number;
  pesos: Record<Atributo, number>;
}

export interface ClienteParaRecomendar {
  categoriasPreferidas: number[];
  marcasPreferidas: number[];
  produtosComprados: number[];
  pets: { especie: Especie; porte: PorteSigla }[];
}

export interface ProdutoParaRecomendar {
  id: number;
  categoriaIds: number[];
  marcaId: number;
  especie: Especie;
  porte: PorteSigla;
  totalVendido: number;
}

/** Quantas posições da lista de preferências ainda contam. */
const PREFERENCIAS_CONSIDERADAS = 3;

/**
 * A posição vira nota: primeiro lugar vale 1, e cai até zerar fora das
 * três primeiras posições. Usar a posição em vez de um sim/não preserva
 * a ordem que o histórico estabeleceu — a categoria mais comprada não
 * vale o mesmo que a terceira.
 */
const notaDaPosicao = (posicao: number): number =>
  posicao < 0 || posicao >= PREFERENCIAS_CONSIDERADAS
    ? 0
    : (PREFERENCIAS_CONSIDERADAS - posicao) / PREFERENCIAS_CONSIDERADAS;

/**
 * Os atributos do par, já normalizados entre 0 e 1. O `maiorVenda` vem de
 * fora porque é uma propriedade do catálogo inteiro, não do produto: sem
 * ele a popularidade não teria escala comum entre treino e uso.
 */
export const atributosDe = (
  cliente: ClienteParaRecomendar,
  produto: ProdutoParaRecomendar,
  maiorVenda: number,
): number[] => {
  const posicaoCategoria = Math.min(
    ...produto.categoriaIds.map(c => {
      const posicao = cliente.categoriasPreferidas.indexOf(c);

      return posicao < 0 ? Number.POSITIVE_INFINITY : posicao;
    }),
    Number.POSITIVE_INFINITY,
  );

  const temPetDaEspecie = cliente.pets.some(p => p.especie === produto.especie);
  const temPetDoPorte = cliente.pets.some(
    p => p.especie === produto.especie && p.porte === produto.porte,
  );

  return [
    notaDaPosicao(
      Number.isFinite(posicaoCategoria) ? posicaoCategoria : -1,
    ),
    notaDaPosicao(cliente.marcasPreferidas.indexOf(produto.marcaId)),
    cliente.produtosComprados.includes(produto.id) ? 1 : 0,
    temPetDaEspecie ? 1 : 0,
    temPetDoPorte ? 1 : 0,
    maiorVenda > 0 ? Math.min(produto.totalVendido / maiorVenda, 1) : 0,
  ];
};

const sigmoide = (z: number): number => 1 / (1 + Math.exp(-z));

/** A probabilidade de o cliente achar esta sugestão útil, de 0 a 1. */
export const pontuarComModelo = (
  atributos: number[],
  modelo: PesosDoModelo,
): number =>
  sigmoide(
    ATRIBUTOS.reduce(
      (soma, nome, i) => soma + atributos[i] * modelo.pesos[nome],
      modelo.vies,
    ),
  );

/**
 * Confere se o que veio do banco tem um peso para cada atributo desta
 * versão do código. Um modelo treinado antes de a lista mudar precisa ser
 * recusado, não aplicado pela metade.
 */
export const pesosValidos = (valor: unknown): valor is PesosDoModelo => {
  if (typeof valor !== 'object' || valor === null) return false;

  const candidato = valor as { vies?: unknown; pesos?: Record<string, unknown> };

  if (typeof candidato.vies !== 'number' || !candidato.pesos) return false;

  return ATRIBUTOS.every(nome => typeof candidato.pesos?.[nome] === 'number');
};
