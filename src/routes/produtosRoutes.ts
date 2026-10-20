/**
 * [CONTROLLER] Rotas de produtos
 *
 * O QUE FAZ: associa os caminhos de produtos aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando a validação antes de
 * cada handler.
 *
 * ATENDE: RF0017
 */

/*
 * Endpoints:
 *   GET /produtos       público — a vitrine é aberta
 *   GET /produtos/:id   público
 */

import { Router } from 'express';

import { produtosController } from '../controllers/produtosController';
import { validar } from '../middlewares/validar';
import {
  idProdutoSchema,
  produtoFiltrosSchema,
} from '../validations/produtoSchema';

export const produtosRoutes = Router();

/**
 * A vitrine não exige token: um visitante precisa ver o catálogo antes de
 * decidir se cria conta. O que depende de sessão é o carrinho.
 */
produtosRoutes.get(
  '/',
  validar({ query: produtoFiltrosSchema }),
  produtosController.listar,
);

produtosRoutes.get(
  '/:id',
  validar({ params: idProdutoSchema }),
  produtosController.detalhar,
);
