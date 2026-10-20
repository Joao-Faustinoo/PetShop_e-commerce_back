/**
 * [CONTROLLER] Rotas de pedidos
 *
 * O QUE FAZ: associa os caminhos de pedidos aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação,
 * autorização por perfil e validação antes de cada handler.
 *
 * ATENDE: RF0033, RF0038, RF0039, RF0040
 */

/*
 * Endpoints:
 *   GET    /pedidos                  autenticado — o escopo depende do perfil
 *   GET    /pedidos/:id              ADMIN ou o dono da compra
 *   POST   /pedidos                  CLIENTE
 *   PATCH  /pedidos/:id/despachar    ADMIN
 *   PATCH  /pedidos/:id/entregar     ADMIN
 */

import { Router } from 'express';

import { pedidosController } from '../controllers/pedidosController';
import { autenticacao } from '../middlewares/autenticacao';
import { autorizacao } from '../middlewares/autorizacao';
import { validar } from '../middlewares/validar';
import {
  finalizarCompraSchema,
  idPedidoSchema,
  pedidoFiltrosSchema,
} from '../validations/checkoutSchema';

export const pedidosRoutes = Router();

pedidosRoutes.use(autenticacao);

pedidosRoutes.get(
  '/',
  validar({ query: pedidoFiltrosSchema }),
  pedidosController.listar,
);

pedidosRoutes.post(
  '/',
  validar({ body: finalizarCompraSchema }),
  pedidosController.finalizar,
);

pedidosRoutes.get(
  '/:id',
  validar({ params: idPedidoSchema }),
  pedidosController.detalhar,
);

/** RF0039 e RF0040: as duas mudanças de situação que são do administrador. */
pedidosRoutes.patch(
  '/:id/despachar',
  autorizacao('ADMIN'),
  validar({ params: idPedidoSchema }),
  pedidosController.despachar,
);

pedidosRoutes.patch(
  '/:id/entregar',
  autorizacao('ADMIN'),
  validar({ params: idPedidoSchema }),
  pedidosController.entregar,
);
