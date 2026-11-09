/**
 * [CONTROLLER] Rotas de clientes
 *
 * O QUE FAZ: associa os caminhos de clientes aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando os middlewares de
 * autenticação, autorização por perfil e validação antes de cada handler.
 *
 * ATENDE: RF0021-RF0025, RNF0035
 */

/*
 * Endpoints:
 *   GET    /clientes                  ADMIN
 *   GET    /clientes/:id              ADMIN ou o próprio cliente
 *   POST   /clientes                  público (auto-cadastro)
 *   PUT    /clientes/:id              ADMIN ou o próprio cliente
 *   PATCH  /clientes/:id/situacao     ADMIN
 *   GET    /clientes/:id/transacoes   ADMIN ou o próprio cliente
 */

import { Router } from 'express';

import { clientesController } from '../controllers/clientesController';
import { autenticacao } from '../middlewares/autenticacao';
import { autorizacao } from '../middlewares/autorizacao';
import { validar } from '../middlewares/validar';
import { petsDoClienteRoutes } from './petsRoutes';
import {
  alterarClienteSchema,
  alterarSituacaoSchema,
  clienteFiltrosSchema,
  criarClienteSchema,
  idParamSchema,
} from '../validations/clienteSchema';

export const clientesRoutes = Router();

/**
 * RF0021: o cadastro é aberto — é por aqui que um visitante vira cliente.
 * As demais rotas exigem token; o dono do cadastro é conferido no
 * controller, porque depende do `:id` da URL.
 */
clientesRoutes.post(
  '/',
  validar({ body: criarClienteSchema }),
  clientesController.criar,
);

clientesRoutes.get(
  '/',
  autenticacao,
  autorizacao('ADMIN'),
  validar({ query: clienteFiltrosSchema }),
  clientesController.listar,
);

clientesRoutes.get(
  '/:id',
  autenticacao,
  validar({ params: idParamSchema }),
  clientesController.detalhar,
);

clientesRoutes.put(
  '/:id',
  autenticacao,
  validar({ params: idParamSchema, body: alterarClienteSchema }),
  clientesController.alterar,
);

clientesRoutes.patch(
  '/:id/situacao',
  autenticacao,
  autorizacao('ADMIN'),
  validar({ params: idParamSchema, body: alterarSituacaoSchema }),
  clientesController.alterarSituacao,
);

clientesRoutes.get(
  '/:id/transacoes',
  autenticacao,
  validar({ params: idParamSchema }),
  clientesController.listarTransacoes,
);

/** RN0029: o pet pertence a um cliente, então mora dentro da rota dele. */
clientesRoutes.use('/:clienteId/pets', petsDoClienteRoutes);
