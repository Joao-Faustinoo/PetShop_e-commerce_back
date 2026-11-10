/**
 * [MODEL] Model da análise gerencial
 *
 * O QUE FAZ: soma as vendas por mês e por categoria, no período pedido.
 *
 * COMO FARÁ: a agregação roda no banco, em SQL, e não em memória. São dois
 * anos de compras com seus itens; trazer tudo para o Node e somar aqui
 * gastaria rede e memória para chegar ao mesmo número que o Postgres
 * calcula sozinho. O Prisma não agrupa por mês truncado, então é
 * `$queryRaw` — com parâmetros ligados, nunca concatenados.
 *
 * O valor de uma venda é rateado entre as categorias do produto: um item
 * em duas categorias entra com metade em cada. É o que mantém a soma das
 * linhas igual ao total vendido (RN0012 encontrando o gráfico).
 *
 * Não aplica regra de negócio: quem valida o período, escolhe as cores e
 * preenche os meses vazios é o service.
 *
 * ATENDE: RF0055, RF0057, RN0071, RN0074
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { SITUACOES_EFETIVADAS } from './pedidosModel';

/** Uma célula da grade: quanto a categoria vendeu naquele mês. */
export interface VendaPorMes {
  periodo: string;
  categoriaId: number;
  categoriaNome: string;
  valor: number;
}

export const analiseModel = {
  /**
   * RN0071: agrupado por mês. RN0074: só compras efetivadas.
   *
   * O rateio sai de `count(*) over (partition by item)`: quantas
   * categorias aquele item tem. Dividir o subtotal por esse número é o que
   * impede um produto em duas categorias de contar duas vezes no total.
   */
  async vendasPorMesECategoria(
    dataInicio: Date,
    dataFim: Date,
    categoriaIds: number[],
  ): Promise<VendaPorMes[]> {
    if (categoriaIds.length === 0) return [];

    const linhas = await prisma.$queryRaw<
      { periodo: string; categoria_id: number; categoria_nome: string; valor: number }[]
    >`
      SELECT to_char(rateio.data_compra, 'MM/YYYY') AS periodo,
             rateio.categoria_id,
             rateio.categoria_nome,
             SUM(rateio.parcela)::float8 AS valor
        FROM (
              SELECT pe.data_compra,
                     c.id   AS categoria_id,
                     c.nome AS categoria_nome,
                     ip.subtotal / COUNT(*) OVER (PARTITION BY ip.id) AS parcela
                FROM pedido pe
                JOIN item_pedido ip ON ip.pedido_id = pe.id
                JOIN produto_categoria pc ON pc.produto_id = ip.produto_id
                JOIN categoria c ON c.id = pc.categoria_id
               WHERE pe.situacao = ANY(${Prisma.sql`ARRAY[${Prisma.join(
                 SITUACOES_EFETIVADAS.map(s => Prisma.sql`${s}::"SituacaoPedido"`),
               )}]`})
                 AND pe.data_compra >= ${dataInicio}
                 AND pe.data_compra <= ${dataFim}
                 AND c.id IN (${Prisma.join(categoriaIds)})
             ) AS rateio
       GROUP BY 1, 2, 3
       ORDER BY min(rateio.data_compra), 3
    `;

    return linhas.map(l => ({
      periodo: l.periodo,
      categoriaId: l.categoria_id,
      categoriaNome: l.categoria_nome,
      valor: Number(l.valor),
    }));
  },

  /** RF0057: as categorias que o administrador pode comparar. */
  async categorias(ids: number[]): Promise<{ id: number; nome: string }[]> {
    return prisma.categoria.findMany({
      where: { id: { in: ids } },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    });
  },
};
