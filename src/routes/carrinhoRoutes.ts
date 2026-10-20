/**
 * [CONTROLLER] Rotas de carrinho
 *
 * O QUE FAZ: associa os caminhos de carrinho aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação e
 * validação antes de cada handler. Todas as rotas exigem sessão: o
 * carrinho é sempre o de quem está logado.
 *
 * ATENDE: RF0031, RF0032, RN0044, RNF0042
 */

/*
 * Endpoints:
 *   GET    /carrinho                              cliente
 *   GET    /carrinho/parametros                   cliente
 *   POST   /carrinho/itens                        cliente
 *   PUT    /carrinho/itens/:produtoId             cliente
 *   DELETE /carrinho/itens/:produtoId             cliente
 *   POST   /carrinho/itens/:produtoId/restaurar   cliente
 *   DELETE /carrinho                              cliente
 */

import { Router } from 'express';

import { carrinhoController } from '../controllers/carrinhoController';
import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';
import {
  adicionarItemSchema,
  alterarQuantidadeSchema,
  produtoParamSchema,
} from '../validations/carrinhoSchema';

export const carrinhoRoutes = Router();

carrinhoRoutes.use(autenticacao);

carrinhoRoutes.get('/parametros', carrinhoController.parametros);
carrinhoRoutes.get('/', carrinhoController.ver);
carrinhoRoutes.delete('/', carrinhoController.esvaziar);

carrinhoRoutes.post(
  '/itens',
  validar({ body: adicionarItemSchema }),
  carrinhoController.adicionar,
);

carrinhoRoutes.put(
  '/itens/:produtoId',
  validar({ params: produtoParamSchema, body: alterarQuantidadeSchema }),
  carrinhoController.alterarQuantidade,
);

carrinhoRoutes.delete(
  '/itens/:produtoId',
  validar({ params: produtoParamSchema }),
  carrinhoController.remover,
);

carrinhoRoutes.post(
  '/itens/:produtoId/restaurar',
  validar({ params: produtoParamSchema }),
  carrinhoController.restaurar,
);
