/**
 * [MODEL] Tipos da análise gerencial
 *
 * O QUE FAZ: descreve o filtro e a série de dados que alimentam o gráfico
 * de linhas de evolução de vendas por categoria.
 *
 * COMO FARÁ: exporta `AnaliseFiltro` (dataInicio, dataFim e categoriaIds),
 * `PontoSerie` (periodo no formato MM/AAAA e valor em reais),
 * `SerieCategoria` (categoriaId, nome, cor da linha e pontos) e
 * `AnaliseVendas` (series + total do período). Meses sem venda entram
 * como zero para manter a linha contínua (RN0073).
 *
 * ATENDE: RF0055-RF0058, RNF0043-RNF0046, RN0071-RN0074
 */

export interface AnaliseFiltro {
  /** ISO (AAAA-MM-DD). RN0072: intervalo entre 1 e 24 meses. */
  dataInicio: string;
  dataFim: string;
  /** RF0057: uma ou mais categorias comparadas no mesmo gráfico. */
  categoriaIds: number[];
}

export interface PontoSerie {
  /** RN0071: granularidade mensal, no formato MM/AAAA. */
  periodo: string;
  valor: number;
}

export interface SerieCategoria {
  categoriaId: number;
  nome: string;
  /** RNF0043/RNF0045: cor distinta por categoria, vinda de theme.chart. */
  cor: string;
  pontos: PontoSerie[];
}

export interface AnaliseVendas {
  series: SerieCategoria[];
  /** Eixo X compartilhado por todas as séries. */
  periodos: string[];
  total: number;
}

/** RF0058: uma linha por período/categoria na planilha exportada. */
export interface LinhaExportacao {
  Periodo: string;
  Categoria: string;
  'Valor de venda': number;
}
