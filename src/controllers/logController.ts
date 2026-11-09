/**
 * [CONTROLLER] Controller de log de transações
 *
 * O QUE FAZ: expõe a consulta do registro de operações sobre HTTP.
 *
 * COMO FARÁ: separa a paginação dos filtros, chama o service e devolve a
 * página. Repassa o erro ao middleware de tratamento em vez de tratá-lo
 * aqui.
 *
 * ATENDE: RNF0012
 */

/*
 * Endpoints deste controller:
 *   GET /logs   admin
 */

import { NextFunction, Request, Response } from 'express';

import { logService } from '../services/logService';
import { LogFiltros } from '../types/log/types';
import { lerPaginacao } from '../utils/paginacao';

export const logController = {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pagina, itensPorPagina, ...filtros } = req.query as LogFiltros & {
        pagina?: unknown;
        itensPorPagina?: unknown;
      };

      res.json(
        await logService.listar(filtros, lerPaginacao({ pagina, itensPorPagina })),
      );
    } catch (erro) {
      next(erro);
    }
  },
};
