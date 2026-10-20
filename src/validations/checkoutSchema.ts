/**
 * [MODEL] Schema de validação — finalização da compra
 *
 * O QUE FAZ: valida o que chega na finalização antes do service.
 *
 * COMO FARÁ: objeto Zod exigindo o endereço de entrega e ao menos uma
 * forma de pagamento. As regras de combinação (RN0033 a RN0035) não cabem
 * aqui: dependem do valor da compra e dos cupons no banco, e ficam no
 * service.
 *
 * ATENDE: RF0036, RF0037, RF0038
 */

import { z } from 'zod';

const pagamentoSchema = z.object({
  forma: z.enum(['CARTAO', 'CUPOM_TROCA', 'CUPOM_PROMOCIONAL']),
  valor: z.number().nonnegative('O valor do pagamento não pode ser negativo.'),
  cartaoId: z.number().int().positive().optional(),
  cupomCodigo: z.string().trim().min(1).optional(),
});

export const finalizarCompraSchema = z.object({
  enderecoEntregaId: z.number().int().positive('Selecione o endereço de entrega.'),
  // O frete chega para a tela conferir, mas quem decide é o servidor.
  frete: z.number().nonnegative().optional(),
  pagamentos: z
    .array(pagamentoSchema)
    .min(1, 'Informe ao menos uma forma de pagamento.'),
});

const STATUS = [
  'EM_PROCESSAMENTO',
  'APROVADA',
  'REPROVADA',
  'EM_TRANSPORTE',
  'ENTREGUE',
  'EM_TROCA',
  'TROCA_AUTORIZADA',
  'TROCADO',
] as const;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const pedidoFiltrosSchema = z.object({
  status: z.enum(STATUS).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  numero: z.string().trim().optional(),
  dataInicio: z.string().regex(DATA_ISO, 'Use o formato AAAA-MM-DD.').optional(),
  dataFim: z.string().regex(DATA_ISO, 'Use o formato AAAA-MM-DD.').optional(),
  pagina: z.coerce.number().int().positive().optional(),
  itensPorPagina: z.coerce.number().int().positive().optional(),
});

export const idPedidoSchema = z.object({
  id: z.coerce.number().int().positive('Id de pedido inválido.'),
});
