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

  /** RF0011 */
  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res
        .status(201)
        .json(await produtosService.criar(req.usuario?.id ?? 0, req.body));
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0014 */
  async alterar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await produtosService.alterar(
          req.usuario?.id ?? 0,
          Number(req.params.id),
          req.body,
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0012 e RF0016 */
  async alterarSituacao(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { ativo, motivoId, justificativa } = req.body;

      res.json(
        await produtosService.alterarSituacao(
          req.usuario?.id ?? 0,
          Number(req.params.id),
          ativo,
          motivoId,
          justificativa,
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },
};
