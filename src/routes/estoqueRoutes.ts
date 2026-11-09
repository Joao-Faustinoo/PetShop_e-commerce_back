/**
 * [CONTROLLER] Rotas de estoque
 *
 * O QUE FAZ: associa os caminhos de estoque aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação,
 * autorização por perfil e validação antes de cada handler. Estoque é
 * área do administrador por inteiro: o cliente só vê o reflexo dele, na
 * disponibilidade do produto.
 *
 * ATENDE: RF0051, RF0053, RF0054, RN0050, RN0051, RN0061, RN0062, RNF0064
 */

/*
 * Endpoints:
 *   GET    /estoque
 *   GET    /estoque/movimentacoes
 *   POST   /estoque/entradas
 */

import { Router } from 'express';

import { estoqueController } from '../controllers/estoqueController';
import { autenticacao } from '../middlewares/autenticacao';
import { autorizacao } from '../middlewares/autorizacao';
import { validar } from '../middlewares/validar';
import {
  entradaEstoqueSchema,
  estoqueFiltrosSchema,
  movimentacaoFiltrosSchema,
} from '../validations/entradaEstoqueSchema';

export const estoqueRoutes = Router();

estoqueRoutes.use(autenticacao, autorizacao('ADMIN'));

/* As movimentações vêm antes de `/`, para o caminho fixo não ser
 * confundido com um filtro da listagem. */
estoqueRoutes.get(
  '/movimentacoes',
  validar({ query: movimentacaoFiltrosSchema }),
  estoqueController.listarMovimentacoes,
);

estoqueRoutes.get(
  '/',
  validar({ query: estoqueFiltrosSchema }),
  estoqueController.listar,
);

estoqueRoutes.post(
  '/entradas',
  validar({ body: entradaEstoqueSchema }),
  estoqueController.registrarEntrada,
);
