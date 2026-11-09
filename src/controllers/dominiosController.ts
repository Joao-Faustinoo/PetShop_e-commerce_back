/**
 * [CONTROLLER] Controller de tabelas de domínio
 *
 * O QUE FAZ: expõe as operações de tabelas de domínio sobre HTTP.
 *
 * COMO FARÁ: extrai parâmetros e corpo da requisição, chama o service
 * correspondente e devolve a resposta com o status adequado. Repassa o
 * erro ao middleware de tratamento em vez de tratá-lo aqui.
 *
 * ATENDE: RNF0013, RN0023, RN0025
 */

/*
 * Endpoints deste controller:
 *   GET    /dominios
 *   GET    /dominios/:nome
 */

import { NextFunction, Request, Response } from 'express';

import { dominiosService } from '../services/dominiosService';

export const dominiosController = {
  async listarTodos(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await dominiosService.listarTodos());
    } catch (erro) {
      next(erro);
    }
  },

  async listarUm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await dominiosService.listarUm(req.params.nome));
    } catch (erro) {
      next(erro);
    }
  },
};
