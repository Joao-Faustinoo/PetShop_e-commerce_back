/**
 * [CONTROLLER] Controller de autenticação
 *
 * O QUE FAZ: expõe as operações de autenticação sobre HTTP.
 *
 * COMO FARÁ: extrai parâmetros e corpo da requisição, chama o service
 * correspondente e devolve a resposta com o status adequado. Repassa o
 * erro ao middleware de tratamento em vez de tratá-lo aqui.
 *
 * ATENDE: premissas do projeto (autenticação por perfil)
 */

/*
 * Endpoints deste controller:
 *   POST   /auth/login
 *   POST   /auth/registrar
 *   GET    /auth/eu
 */

import { NextFunction, Request, Response } from 'express';

import { authService } from '../services/authService';
import { ApiError } from '../utils/ApiError';

export const authController = {
  /** POST /auth/login */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await authService.login(req.body));
    } catch (erro) {
      next(erro);
    }
  },

  /** POST /auth/registrar — RF0021 */
  async registrar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const sessao = await authService.registrar(req.body);

      // 201: a requisição criou um cliente, não apenas abriu uma sessão.
      res.status(201).json(sessao);
    } catch (erro) {
      next(erro);
    }
  },

  /** GET /auth/eu */
  async eu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // A rota encadeia `autenticacao` antes; chegar sem usuário seria erro
      // de montagem, e o 401 o denuncia em vez de estourar undefined.
      if (!req.usuario) throw ApiError.naoAutenticado();

      res.json(await authService.eu(req.usuario));
    } catch (erro) {
      next(erro);
    }
  },
};
