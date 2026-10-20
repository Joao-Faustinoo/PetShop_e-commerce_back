/**
 * [MODEL] Schema de validação — carrinho
 *
 * O QUE FAZ: valida o que entra no carrinho antes de chegar ao service.
 *
 * COMO FARÁ: objeto Zod exigindo produto e quantidade inteira positiva. A
 * conferência contra o estoque (RN0031) não cabe aqui: depende do banco e
 * fica no service.
 *
 * ATENDE: RF0031, RF0032
 */

import { z } from 'zod';

export const adicionarItemSchema = z.object({
  produtoId: z.number().int().positive('Informe o produto.'),
  quantidade: z
    .number()
    .int('A quantidade deve ser um número inteiro.')
    .positive('A quantidade deve ser maior que zero.'),
});

/** RF0032: zero é aceito aqui e significa remover o item. */
export const alterarQuantidadeSchema = z.object({
  quantidade: z
    .number()
    .int('A quantidade deve ser um número inteiro.')
    .nonnegative('A quantidade não pode ser negativa.'),
});

export const produtoParamSchema = z.object({
  produtoId: z.coerce.number().int().positive('Id de produto inválido.'),
});

/** RF0034: o resumo depende do endereço, que define a região do frete. */
export const resumoSchema = z.object({
  enderecoEntregaId: z.coerce
    .number()
    .int()
    .positive('Selecione o endereço de entrega.'),
});
