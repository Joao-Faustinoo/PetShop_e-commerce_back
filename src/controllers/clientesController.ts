/**
 * [CONTROLLER] Controller de clientes
 *
 * O QUE FAZ: expõe as operações de clientes sobre HTTP.
 *
 * COMO FARÁ: extrai parâmetros e corpo da requisição, chama o service
 * correspondente e devolve a resposta com o status adequado. Repassa o
 * erro ao middleware de tratamento em vez de tratá-lo aqui.
 *
 * ATENDE: RF0021-RF0025, RNF0035
 */

/*
 * Endpoints deste controller:
 *   GET    /clientes
 *   GET    /clientes/:id
 *   POST   /clientes
 *   PUT    /clientes/:id
 *   PATCH  /clientes/:id/situacao
 *   GET    /clientes/:id/transacoes
 */

import { NextFunction, Request, Response } from 'express';

import { exigirDonoOuAdmin } from '../middlewares/autorizacao';
import { clientesService } from '../services/clientesService';
import { ClienteFiltros } from '../types/clientes/types';
import { lerPaginacao } from '../utils/paginacao';

export const clientesController = {
  /** GET /clientes — RF0024 */
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // O schema já validou e converteu; sobra separar filtro de paginação.
      const { pagina, itensPorPagina, ...filtros } = req.query as ClienteFiltros & {
        pagina?: number;
        itensPorPagina?: number;
      };

      const resultado = await clientesService.listar(
        filtros,
        lerPaginacao({ pagina, itensPorPagina }),
      );

      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  },

  /** GET /clientes/:id — RF0022 */
  async detalhar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Number(req.params.id);

      exigirDonoOuAdmin(req, id);

      res.json(await clientesService.buscarPorId(id));
    } catch (erro) {
      next(erro);
    }
  },

  /** POST /clientes — RF0021 */
  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cliente = await clientesService.criar(req.body);

      res.status(201).json(cliente);
    } catch (erro) {
      next(erro);
    }
  },

  /** PUT /clientes/:id — RF0022 */
  async alterar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Number(req.params.id);

      exigirDonoOuAdmin(req, id);

      res.json(await clientesService.alterar(id, req.body));
    } catch (erro) {
      next(erro);
    }
  },

  /** PATCH /clientes/:id/situacao — RF0023 */
  async alterarSituacao(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Number(req.params.id);

      res.json(await clientesService.alterarSituacao(id, req.body));
    } catch (erro) {
      next(erro);
    }
  },

  /** GET /clientes/:id/transacoes — RF0025 */
  async listarTransacoes(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = Number(req.params.id);

      exigirDonoOuAdmin(req, id);

      res.json(await clientesService.listarTransacoes(id));
    } catch (erro) {
      next(erro);
    }
  },
};
