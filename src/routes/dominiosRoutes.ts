/**
 * [CONTROLLER] Rotas de tabelas de domínio
 *
 * O QUE FAZ: associa os caminhos de tabelas de domínio aos handlers do
 * controller.
 *
 * COMO FARÁ: define o Router do Express. Não exige token: as tabelas de
 * domínio alimentam selects de telas públicas — o cadastro de cliente
 * precisa de tipo de residência e de logradouro (RN0023) antes de haver
 * sessão, e a vitrine filtra por marca, cor e porte sem login.
 *
 * ATENDE: RNF0013, RN0023, RN0025
 */

/*
 * Endpoints:
 *   GET    /dominios
 *   GET    /dominios/:nome
 */

import { Router } from 'express';
import { z } from 'zod';

import { dominiosController } from '../controllers/dominiosController';
import { validar } from '../middlewares/validar';
import { NOMES_DE_DOMINIO } from '../services/dominiosService';

/** Lista fechada: a URL não escolhe o que é lido do banco. */
const nomeSchema = z.object({
  nome: z.enum(NOMES_DE_DOMINIO as [string, ...string[]], {
    message: 'Tabela de domínio desconhecida.',
  }),
});

export const dominiosRoutes = Router();

dominiosRoutes.get('/', dominiosController.listarTodos);

dominiosRoutes.get(
  '/:nome',
  validar({ params: nomeSchema }),
  dominiosController.listarUm,
);
