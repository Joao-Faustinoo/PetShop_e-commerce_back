/**
 * [MODEL] Utilitário de paginação
 *
 * O QUE FAZ: traduz os parâmetros de página em `skip` e `take` do Prisma.
 *
 * COMO FARÁ: lê página e tamanho da query, aplica limites e devolve o
 * recorte junto do total, no formato que o front espera em `types/common`.
 */

import { Pagina, Paginacao } from '../types/common/types';

const PAGINA_PADRAO = 1;
const ITENS_PADRAO = 20;
/** Teto para uma consulta não conseguir varrer a tabela inteira. */
const ITENS_MAXIMO = 100;

const inteiroPositivo = (valor: unknown, padrao: number): number => {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 1) return padrao;

  return Math.floor(numero);
};

/** Normaliza o que veio da query string em uma paginação confiável. */
export const lerPaginacao = (query: {
  pagina?: unknown;
  itensPorPagina?: unknown;
}): Paginacao => ({
  pagina: inteiroPositivo(query.pagina, PAGINA_PADRAO),
  itensPorPagina: Math.min(
    inteiroPositivo(query.itensPorPagina, ITENS_PADRAO),
    ITENS_MAXIMO,
  ),
});

/** Recorte correspondente, no vocabulário do Prisma. */
export const recorte = (
  paginacao: Paginacao,
): { skip: number; take: number } => ({
  skip: (paginacao.pagina - 1) * paginacao.itensPorPagina,
  take: paginacao.itensPorPagina,
});

/** Monta a página de resultado no formato que o front consome. */
export const montarPagina = <T>(
  itens: T[],
  total: number,
  paginacao: Paginacao,
): Pagina<T> => ({
  itens,
  total,
  pagina: paginacao.pagina,
  itensPorPagina: paginacao.itensPorPagina,
});
