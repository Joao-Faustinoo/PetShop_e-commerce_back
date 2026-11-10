/**
 * [CONTROLLER] Controller da análise gerencial
 *
 * O QUE FAZ: expõe a série de vendas por categoria sobre HTTP.
 *
 * COMO FARÁ: extrai o filtro da query, chama o service e devolve a
 * resposta. Repassa o erro ao middleware de tratamento em vez de tratá-lo
 * aqui.
 *
 * ATENDE: RF0055, RF0056, RF0057, RN0071-RN0074, RNF0043-RNF0046
 */

/*
 * Endpoints deste controller:
 *   GET /analise/vendas   admin
 */

import { NextFunction, Request, Response } from 'express';

import { analiseService } from '../services/analiseService';
import { AnaliseFiltro } from '../types/analise/types';

export const analiseController = {
  async vendas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await analiseService.vendas(req.query as unknown as AnaliseFiltro));
    } catch (erro) {
      next(erro);
    }
  },
};
