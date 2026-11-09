/**
 * [CONTROLLER] Rotas de log de transações
 *
 * O QUE FAZ: associa o caminho de consulta do log ao handler do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação,
 * autorização por perfil e validação antes do handler. Só o administrador
 * alcança o registro: ele mostra o que cada usuário fez, e é informação de
 * auditoria, não do cliente.
 *
 * ATENDE: RNF0012
 */

/*
 * Endpoints:
 *   GET /logs   admin
 */

import { Router } from 'express';
import { z } from 'zod';

import { logController } from '../controllers/logController';
import { autenticacao } from '../middlewares/autenticacao';
import { autorizacao } from '../middlewares/autorizacao';
import { validar } from '../middlewares/validar';

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .optional();

const filtrosSchema = z.object({
  entidade: z.string().trim().min(1).optional(),
  entidadeId: z.coerce.number().int().positive().optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  operacao: z.enum(['INSERCAO', 'ALTERACAO']).optional(),
  de: data,
  ate: data,
  pagina: z.coerce.number().int().positive().optional(),
  itensPorPagina: z.coerce.number().int().positive().optional(),
});

export const logRoutes = Router();

logRoutes.get(
  '/',
  autenticacao,
  autorizacao('ADMIN'),
  validar({ query: filtrosSchema }),
  logController.listar,
);
