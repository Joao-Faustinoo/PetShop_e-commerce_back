/**
 * [CONTROLLER] Rotas de endereços
 *
 * O QUE FAZ: associa os caminhos de endereços aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação e
 * validação antes de cada handler.
 *
 * ATENDE: RF0026, RF0035, RN0023, RNF0034
 */

/*
 * Endpoints:
 *   GET  /enderecos?tipo=ENTREGA   cliente
 *   POST /enderecos                cliente
 */

import { Router } from 'express';
import { z } from 'zod';

import { enderecosController } from '../controllers/enderecosController';
import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';

/** RN0023: todos obrigatórios menos observações. */
const criarEnderecoSchema = z.object({
  apelido: z.string().trim().min(1, 'Dê um nome a este endereço.'),
  tipo: z.enum(['ENTREGA', 'COBRANCA']),
  tipoResidenciaId: z.number().int().positive('Informe o tipo de residência.'),
  tipoLogradouroId: z.number().int().positive('Informe o tipo de logradouro.'),
  logradouro: z.string().trim().min(1, 'Informe o logradouro.'),
  numero: z.string().trim().min(1, 'Informe o número.'),
  bairro: z.string().trim().min(1, 'Informe o bairro.'),
  cep: z
    .string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 8, 'CEP deve ter 8 dígitos.'),
  cidade: z.string().trim().min(1, 'Informe a cidade.'),
  estado: z
    .string()
    .trim()
    .toUpperCase()
    .refine(v => v.length === 2, 'Estado deve ser a sigla de 2 letras.'),
  pais: z.string().trim().min(1, 'Informe o país.'),
  observacoes: z.string().trim().optional(),
  clienteId: z.number().int().positive().optional(),
});

const filtroSchema = z.object({
  tipo: z.enum(['ENTREGA', 'COBRANCA']).optional(),
});

export const enderecosRoutes = Router();

enderecosRoutes.use(autenticacao);

enderecosRoutes.get(
  '/',
  validar({ query: filtroSchema }),
  enderecosController.listar,
);

enderecosRoutes.post(
  '/',
  validar({ body: criarEnderecoSchema }),
  enderecosController.criar,
);
