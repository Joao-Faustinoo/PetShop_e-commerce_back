/**
 * [CONTROLLER] Rotas de autenticação
 *
 * O QUE FAZ: associa os caminhos de autenticação aos handlers do
 * controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando os middlewares de
 * autenticação, autorização por perfil e validação antes de cada handler.
 *
 * ATENDE: premissas do projeto (autenticação por perfil)
 */

/*
 * Endpoints:
 *   POST   /auth/login       público
 *   POST   /auth/registrar   público
 *   GET    /auth/eu          autenticado, qualquer perfil
 */

import { Router } from 'express';

import { authController } from '../controllers/authController';
import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';
import { criarClienteSchema } from '../validations/clienteSchema';
import { loginSchema } from '../validations/loginSchema';

export const authRoutes = Router();

/** Entrar e cadastrar-se são abertos: é por onde um visitante começa. */
authRoutes.post(
  '/login',
  validar({ body: loginSchema }),
  authController.login,
);

// O corpo é o mesmo do autocadastro em POST /clientes — mesma regra, mesmo
// schema; o que muda é a sessão que volta junto.
authRoutes.post(
  '/registrar',
  validar({ body: criarClienteSchema }),
  authController.registrar,
);

authRoutes.get('/eu', autenticacao, authController.eu);
