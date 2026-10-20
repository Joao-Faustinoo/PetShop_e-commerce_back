/**
 * [CONTROLLER] Rotas de trocas
 *
 * O QUE FAZ: associa os caminhos de troca aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação,
 * autorização por perfil e validação antes de cada handler. Autorizar e
 * receber são do administrador; solicitar é do cliente.
 *
 * ATENDE: RF0041, RF0042, RF0043, RF0044, RN0043
 */

/*
 * Endpoints:
 *   GET   /trocas                 autenticado — o escopo depende do perfil
 *   GET   /trocas/:id             ADMIN ou o dono
 *   POST  /trocas                 CLIENTE
 *   PATCH /trocas/:id/autorizar   ADMIN
 *   PATCH /trocas/:id/receber     ADMIN
 */

import { Router } from 'express';
import { z } from 'zod';

import { trocasController } from '../controllers/trocasController';
import { autenticacao } from '../middlewares/autenticacao';
import { autorizacao } from '../middlewares/autorizacao';
import { validar } from '../middlewares/validar';

const solicitarTrocaSchema = z.object({
  pedidoId: z.number().int().positive('Informe a compra.'),
  itens: z
    .array(
      z.object({
        produtoId: z.number().int().positive(),
        quantidade: z.number().int().positive(),
      }),
    )
    .min(1, 'Selecione ao menos um item para trocar.'),
  motivo: z
    .string()
    .trim()
    .min(10, 'Descreva o motivo com ao menos 10 caracteres.'),
});

/** RF0044: o administrador informa se os itens voltam ao estoque. */
const receberTrocaSchema = z.object({
  retornarAoEstoque: z.boolean({
    required_error: 'Informe se os itens retornam ao estoque.',
  }),
});

const filtroSchema = z.object({
  status: z.enum(['EM_TROCA', 'TROCA_AUTORIZADA', 'TROCADO']).optional(),
});

const idSchema = z.object({
  id: z.coerce.number().int().positive('Id de troca inválido.'),
});

export const trocasRoutes = Router();

trocasRoutes.use(autenticacao);

trocasRoutes.get('/', validar({ query: filtroSchema }), trocasController.listar);

trocasRoutes.post(
  '/',
  validar({ body: solicitarTrocaSchema }),
  trocasController.solicitar,
);

trocasRoutes.get('/:id', validar({ params: idSchema }), trocasController.detalhar);

trocasRoutes.patch(
  '/:id/autorizar',
  autorizacao('ADMIN'),
  validar({ params: idSchema }),
  trocasController.autorizar,
);

trocasRoutes.patch(
  '/:id/receber',
  autorizacao('ADMIN'),
  validar({ params: idSchema, body: receberTrocaSchema }),
  trocasController.receber,
);
