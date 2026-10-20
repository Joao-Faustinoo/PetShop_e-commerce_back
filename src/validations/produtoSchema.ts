/**
 * [MODEL] Schema de validação — consulta de produtos
 *
 * O QUE FAZ: valida e converte os filtros do catálogo.
 *
 * COMO FARÁ: a query string chega sempre como texto; o Zod converte os
 * números e o booleano antes de o service ver o dado. Espelha o
 * `ProdutoFiltros` que o front monta.
 *
 * ESTADO: só os filtros. Os schemas de cadastro e precificação de produto
 * entram com a fatia de administração de produtos.
 *
 * ATENDE: RF0017
 */

import { z } from 'zod';

export const produtoFiltrosSchema = z.object({
  nome: z.string().trim().optional(),
  especie: z.enum(['CAO', 'GATO', 'OUTRO']).optional(),
  porte: z.enum(['PP', 'P', 'M', 'G', 'GG']).optional(),
  marcaId: z.coerce.number().int().positive().optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  corId: z.coerce.number().int().positive().optional(),
  materialId: z.coerce.number().int().positive().optional(),
  precoMinimo: z.coerce.number().nonnegative().optional(),
  precoMaximo: z.coerce.number().nonnegative().optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
  pagina: z.coerce.number().int().positive().optional(),
  itensPorPagina: z.coerce.number().int().positive().optional(),
});

/** `:id` chega como texto na URL e precisa virar número para o service. */
export const idProdutoSchema = z.object({
  id: z.coerce.number().int().positive('Id de produto inválido.'),
});
