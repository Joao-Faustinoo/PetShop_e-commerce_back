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
import { autenticacao } from '../middlewares/autenticacao';
import { autorizacao } from '../middlewares/autorizacao';
import { validar } from '../middlewares/validar';
import {
  alterarProdutoSchema,
  criarProdutoSchema,
  idProdutoSchema,
  produtoFiltrosSchema,
  situacaoProdutoSchema,
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

/* O cadastro é do administrador. A vitrine lê; só o balcão escreve. */

/** RF0011 */
produtosRoutes.post(
  '/',
  autenticacao,
  autorizacao('ADMIN'),
  validar({ body: criarProdutoSchema }),
  produtosController.criar,
);

/** RF0014 */
produtosRoutes.put(
  '/:id',
  autenticacao,
  autorizacao('ADMIN'),
  validar({ params: idProdutoSchema, body: alterarProdutoSchema }),
  produtosController.alterar,
);

/** RF0012 e RF0016: inativar e ativar, com motivo e justificativa. */
produtosRoutes.patch(
  '/:id/situacao',
  autenticacao,
  autorizacao('ADMIN'),
  validar({ params: idProdutoSchema, body: situacaoProdutoSchema }),
  produtosController.alterarSituacao,
);
