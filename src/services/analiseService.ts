/**
 * [MODEL] Service da análise gerencial
 *
 * O QUE FAZ: monta a série de vendas por categoria que alimenta o gráfico
 * de linhas do administrador.
 *
 * COMO FARÁ: valida o período da RN0072, pede a agregação ao model e
 * completa com zero os meses em que uma categoria não vendeu (RN0073). A
 * linha do tempo é montada aqui, e não no banco, porque um mês sem venda
 * nenhuma não existe no resultado da consulta — e é justamente ele que o
 * DRS manda desenhar.
 *
 * ATENDE: RF0055, RF0056, RF0057, RN0071, RN0072, RN0073, RN0074
 */

import { analiseModel } from '../models/analiseModel';
import { AnaliseFiltro, AnaliseVendas, SerieCategoria } from '../types/analise/types';
import { ApiError } from '../utils/ApiError';

/** RN0072: o intervalo analisado vai de um mês a dois anos. */
const MESES_MINIMO = 1;
const MESES_MAXIMO = 24;

/**
 * As cores das linhas (RNF0043 e RNF0045). Ficam no servidor para que a
 * mesma categoria tenha sempre a mesma cor, inclusive na planilha
 * exportada e entre sessões — se o front as escolhesse por posição, mudar
 * a seleção trocaria a cor de todas as linhas.
 */
const CORES = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#dc2626',
  '#ca8a04',
];

/** MM/AAAA de cada mês entre as duas datas, inclusive as pontas. */
const periodosEntre = (inicio: Date, fim: Date): string[] => {
  const periodos: string[] = [];
  const cursor = new Date(
    Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1),
  );

  while (
    cursor.getUTCFullYear() < fim.getUTCFullYear() ||
    (cursor.getUTCFullYear() === fim.getUTCFullYear() &&
      cursor.getUTCMonth() <= fim.getUTCMonth())
  ) {
    periodos.push(
      `${String(cursor.getUTCMonth() + 1).padStart(2, '0')}/${cursor.getUTCFullYear()}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return periodos;
};

/** Quantos meses de calendário o intervalo cobre, contando as pontas. */
const mesesNoIntervalo = (inicio: Date, fim: Date): number =>
  (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
  (fim.getUTCMonth() - inicio.getUTCMonth()) +
  1;

export const analiseService = {
  async vendas(filtro: AnaliseFiltro): Promise<AnaliseVendas> {
    const inicio = new Date(`${filtro.dataInicio}T00:00:00.000Z`);
    const fim = new Date(`${filtro.dataFim}T23:59:59.999Z`);

    // RF0056: a data de fim não pode ser anterior à de início.
    if (fim < inicio) {
      throw ApiError.requisicaoInvalida(
        'A data de fim não pode ser anterior à data de início.',
      );
    }

    // RN0072: de 1 a 24 meses.
    const meses = mesesNoIntervalo(inicio, fim);

    if (meses < MESES_MINIMO || meses > MESES_MAXIMO) {
      throw ApiError.requisicaoInvalida(
        `O período deve ter de ${MESES_MINIMO} a ${MESES_MAXIMO} meses; este tem ${meses}.`,
      );
    }

    // RF0057: ao menos uma categoria para comparar.
    if (filtro.categoriaIds.length === 0) {
      throw ApiError.requisicaoInvalida('Selecione ao menos uma categoria.');
    }

    const categorias = await analiseModel.categorias(filtro.categoriaIds);

    if (categorias.length !== filtro.categoriaIds.length) {
      throw ApiError.requisicaoInvalida('Uma das categorias não está registrada.');
    }

    const vendas = await analiseModel.vendasPorMesECategoria(
      inicio,
      fim,
      filtro.categoriaIds,
    );

    const periodos = periodosEntre(inicio, fim);

    /*
     * RN0073: a categoria sem venda no mês entra com zero, e não some. É o
     * que mantém a linha contínua no gráfico — e o que faz todas as séries
     * terem o mesmo tamanho, que é o formato que o LineChart espera.
     */
    const series: SerieCategoria[] = categorias.map((categoria, indice) => ({
      categoriaId: categoria.id,
      nome: categoria.nome,
      cor: CORES[indice % CORES.length],
      pontos: periodos.map(periodo => ({
        periodo,
        valor:
          vendas.find(v => v.periodo === periodo && v.categoriaId === categoria.id)
            ?.valor ?? 0,
      })),
    }));

    const total = series.reduce(
      (soma, serie) => soma + serie.pontos.reduce((s, p) => s + p.valor, 0),
      0,
    );

    return { series, periodos, total: Number(total.toFixed(2)) };
  },
};
