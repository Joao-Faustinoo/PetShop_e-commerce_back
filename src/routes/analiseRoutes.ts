/**
 * [CONTROLLER] Rotas da análise gerencial
 *
 * O QUE FAZ: associa o caminho da análise de vendas ao handler do
 * controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação,
 * autorização por perfil e validação antes do handler. A análise é do
 * administrador: a RF0055 diz isso com todas as letras.
 *
 * ATENDE: RF0055, RF0056, RF0057, RN0071-RN0074
 */

/*
 * Endpoints:
 *   GET /analise/vendas   admin
 */

import { Router } from 'express';

import { analiseController } from '../controllers/analiseController';
import { autenticacao } from '../middlewares/autenticacao';
import { autorizacao } from '../middlewares/autorizacao';
import { validar } from '../middlewares/validar';
import { analiseFiltroSchema } from '../validations/analiseFiltroSchema';

export const analiseRoutes = Router();

analiseRoutes.get(
  '/vendas',
  autenticacao,
  autorizacao('ADMIN'),
  validar({ query: analiseFiltroSchema }),
  analiseController.vendas,
);
