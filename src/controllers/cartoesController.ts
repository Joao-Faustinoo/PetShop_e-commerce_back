/**
 * [CONTROLLER] Controller de cartões
 *
 * O QUE FAZ: expõe a consulta e o cadastro de cartões do cliente logado.
 *
 * COMO FARÁ: identifica o cliente pelo token, chama o service e devolve a
 * resposta. Repassa o erro ao middleware de tratamento.
 *
 * ATENDE: RF0027, RF0036
 */

/*
 * Endpoints deste controller:
 *   GET  /cartoes    cliente
 *   POST /cartoes    cliente
 */

import { NextFunction, Request, Response } from 'express';

import { cartoesService } from '../services/cartoesService';
import { ApiError } from '../utils/ApiError';

/** O cartão é sempre do dono da sessão; não há rota para o cartão alheio. */
const clienteDaSessao = (req: Request): number => {
  const id = req.usuario?.clienteId;

  if (!id) {
    throw ApiError.naoAutorizado('Entre com uma conta de cliente.');
  }

  return id;
};

export const cartoesController = {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await cartoesService.listar(clienteDaSessao(req)));
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0036: cartão novo incorporado ao perfil, para poder pagar com ele. */
  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res
        .status(201)
        .json(await cartoesService.criar(clienteDaSessao(req), req.body));
    } catch (erro) {
      next(erro);
    }
  },
};
