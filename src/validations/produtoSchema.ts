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

/**
 * RN0011: marca, categoria, espécie, porte, cor, material, nome,
 * descrição, dimensões e código de barras são obrigatórios no cadastro.
 * O valor de venda não entra: ele nasce do custo e da margem (RN0013).
 */
export const criarProdutoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do produto.'),
  descricao: z.string().trim().min(10, 'Descreva o produto.'),
  marcaId: z.coerce.number().int().positive('Informe a marca.'),
  // RN0012: um produto pode estar em mais de uma categoria.
  categoriaIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'Informe ao menos uma categoria.'),
  especie: z.enum(['CAO', 'GATO', 'OUTRO'], {
    message: 'Espécie deve ser cão, gato ou outro.',
  }),
  porte: z.enum(['PP', 'P', 'M', 'G', 'GG'], {
    message: 'Porte deve ser PP, P, M, G ou GG.',
  }),
  corId: z.coerce.number().int().positive('Informe a cor.'),
  materialId: z.coerce.number().int().positive('Informe o material.'),
  dimensoes: z.object({
    altura: z.coerce.number().positive('Informe a altura.'),
    largura: z.coerce.number().positive('Informe a largura.'),
    profundidade: z.coerce.number().positive('Informe a profundidade.'),
    peso: z.coerce.number().positive('Informe o peso.'),
  }),
  codigoBarras: z.string().trim().min(8, 'Informe o código de barras.'),
  grupoPrecificacaoId: z.coerce
    .number()
    .int()
    .positive('Informe o grupo de precificação.'),
  valorCusto: z.coerce.number().positive('Informe o valor de custo.'),
  imagem: z.string().trim().optional(),
});

/** RN0014: o preço abaixo da margem exige o aceite do gerente de vendas. */
export const alterarProdutoSchema = criarProdutoSchema.extend({
  valorVenda: z.coerce.number().positive().optional(),
  autorizacaoGerente: z.coerce.boolean().optional(),
});

/** RN0015 e RN0017: a mudança de situação pede motivo E justificativa. */
export const situacaoProdutoSchema = z.object({
  ativo: z.boolean({ message: 'Informe a situação desejada.' }),
  motivoId: z.coerce.number().int().positive('Informe o motivo.'),
  justificativa: z
    .string()
    .trim()
    .min(10, 'A justificativa precisa de ao menos 10 caracteres.'),
});
