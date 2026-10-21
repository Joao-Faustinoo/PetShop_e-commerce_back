/**
 * [CONTROLLER] Rotas de cartões
 *
 * O QUE FAZ: associa os caminhos de cartões aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação e
 * validação antes de cada handler.
 *
 * ATENDE: RF0027, RF0036, RN0024, RN0025
 */

/*
 * Endpoints:
 *   GET  /cartoes    cliente
 *   POST /cartoes    cliente
 */

import { Router } from 'express';
import { z } from 'zod';

import { cartoesController } from '../controllers/cartoesController';
import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';

/** RN0024: número, nome impresso, bandeira e código de segurança. */
const criarCartaoSchema = z.object({
  numero: z.string().trim().min(13, 'Número de cartão inválido.'),
  nomeImpresso: z.string().trim().min(3, 'Informe o nome impresso no cartão.'),
  bandeiraId: z.number().int().positive('Selecione a bandeira.'),
  codigoSeguranca: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, 'O código de segurança tem 3 ou 4 dígitos.'),
  preferencial: z.boolean().optional().default(false),
  clienteId: z.number().int().positive().optional(),
});

export const cartoesRoutes = Router();

cartoesRoutes.use(autenticacao);

cartoesRoutes.get('/', cartoesController.listar);
cartoesRoutes.post(
  '/',
  validar({ body: criarCartaoSchema }),
  cartoesController.criar,
);

const idSchema = z.object({
  id: z.coerce.number().int().positive('Id de cartão inválido.'),
});

cartoesRoutes.put(
  '/:id',
  validar({ params: idSchema, body: criarCartaoSchema }),
  cartoesController.alterar,
);

cartoesRoutes.delete(
  '/:id',
  validar({ params: idSchema }),
  cartoesController.remover,
);

cartoesRoutes.patch(
  '/:id/preferencial',
  validar({ params: idSchema }),
  cartoesController.definirPreferencial,
);
