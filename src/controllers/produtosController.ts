/**
 * [CONTROLLER] Controller de produtos
 *
 * O QUE FAZ: expõe a consulta ao catálogo sobre HTTP.
 *
 * COMO FARÁ: extrai filtros e paginação da query, chama o service e
 * devolve a página. Repassa o erro ao middleware de tratamento.
 *
 * ATENDE: RF0017
 */

import { NextFunction, Request, Response } from 'express';

import { produtosService } from '../services/produtosService';
import { ProdutoFiltros } from '../types/produtos/types';
import { lerPaginacao } from '../utils/paginacao';

export const produtosController = {
  /** GET /produtos — RF0017 */
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pagina, itensPorPagina, ...filtros } = req.query as ProdutoFiltros & {
        pagina?: number;
        itensPorPagina?: number;
      };

      res.json(
        await produtosService.listar(
          filtros,
          lerPaginacao({ pagina, itensPorPagina }),
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },

  /** GET /produtos/:id */
  async detalhar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res.json(await produtosService.buscarPorId(Number(req.params.id)));
    } catch (erro) {
      next(erro);
    }
  },
};
