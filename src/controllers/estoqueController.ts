/**
 * [CONTROLLER] Controller de estoque
 *
 * O QUE FAZ: expõe a posição do estoque, o histórico de movimentações e a
 * entrada de itens sobre HTTP.
 *
 * COMO FARÁ: extrai parâmetros e corpo da requisição, chama o service
 * correspondente e devolve a resposta com o status adequado. Repassa o
 * erro ao middleware de tratamento em vez de tratá-lo aqui.
 *
 * ATENDE: RF0051, RF0053, RF0054, RNF0012
 */

/*
 * Endpoints deste controller:
 *   GET  /estoque                 admin
 *   GET  /estoque/movimentacoes   admin
 *   POST /estoque/entradas        admin
 */

import { NextFunction, Request, Response } from 'express';

import { estoqueService } from '../services/estoqueService';
import { EstoqueFiltros } from '../types/estoque/types';
import { lerPaginacao } from '../utils/paginacao';

export const estoqueController = {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await estoqueService.listar(req.query as EstoqueFiltros));
    } catch (erro) {
      next(erro);
    }
  },

  async listarMovimentacoes(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { produtoId, pagina, itensPorPagina } = req.query as {
        produtoId?: number;
        pagina?: unknown;
        itensPorPagina?: unknown;
      };

      res.json(
        await estoqueService.listarMovimentacoes(
          produtoId,
          lerPaginacao({ pagina, itensPorPagina }),
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0051: a entrada de itens, registrada em nome de quem a fez. */
  async registrarEntrada(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      res
        .status(201)
        .json(
          await estoqueService.registrarEntrada(req.usuario?.id ?? 0, req.body),
        );
    } catch (erro) {
      next(erro);
    }
  },
};
