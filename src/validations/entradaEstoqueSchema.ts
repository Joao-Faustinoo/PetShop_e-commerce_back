/**
 * [MODEL] Schema de validação — entrada em estoque
 *
 * O QUE FAZ: valida os dados de entrada em estoque antes de chegarem ao
 * service.
 *
 * COMO FARÁ: objeto Zod exigindo produto, quantidade maior que zero, valor
 * de custo, fornecedor e data de entrada — a RN0050 pede os cinco, a
 * RN0061 recusa quantidade zero, a RN0062 exige o custo e a RNF0064 exige
 * a data. É aplicado pelo middleware `validar`.
 */

import { z } from 'zod';

export const entradaEstoqueSchema = z.object({
  produtoId: z.coerce.number().int().positive('Informe o produto.'),
  // RN0061: o DRS proíbe entrada com quantidade zero.
  quantidade: z.coerce
    .number()
    .int('A quantidade deve ser um número inteiro.')
    .positive('A quantidade deve ser maior que zero.'),
  // RN0062: todo item tem valor de custo.
  valorCusto: z.coerce.number().positive('Informe o valor de custo.'),
  // RN0050: a entrada identifica de quem o item veio.
  fornecedorId: z.coerce.number().int().positive('Informe o fornecedor.'),
  // RNF0064: sem data de entrada o item não pode ser registrado.
  dataEntrada: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.'),
});

export const estoqueFiltrosSchema = z.object({
  produtoNome: z.string().trim().min(1).optional(),
  apenasSemEstoque: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
});

export const movimentacaoFiltrosSchema = z.object({
  produtoId: z.coerce.number().int().positive().optional(),
  pagina: z.coerce.number().int().positive().optional(),
  itensPorPagina: z.coerce.number().int().positive().optional(),
});
