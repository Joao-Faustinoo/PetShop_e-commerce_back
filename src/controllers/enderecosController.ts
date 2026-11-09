/**
 * [CONTROLLER] Controller de endereços
 *
 * O QUE FAZ: expõe a consulta e o cadastro de endereços do cliente logado.
 *
 * COMO FARÁ: identifica o cliente pelo token, chama o service e devolve a
 * resposta. Repassa o erro ao middleware de tratamento.
 *
 * ATENDE: RF0026, RF0035, RNF0034
 */

/*
 * Endpoints deste controller:
 *   GET  /enderecos?tipo=ENTREGA   cliente
 *   POST /enderecos                cliente
 */

import { NextFunction, Request, Response } from 'express';

import { enderecosService } from '../services/enderecosService';
import { TipoEndereco } from '../types/enderecos/types';
import { ApiError } from '../utils/ApiError';

const clienteDaSessao = (req: Request): number => {
  const id = req.usuario?.clienteId;

  if (!id) {
    throw ApiError.naoAutorizado('Entre com uma conta de cliente.');
  }

  return id;
};

/** RNF0012: quem respondeu pela operação. Para o cliente, é ele mesmo. */
const usuarioDaSessao = (req: Request): number =>
  req.usuario?.id ?? clienteDaSessao(req);

export const enderecosController = {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tipo } = req.query as { tipo?: TipoEndereco };

      res.json(await enderecosService.listar(clienteDaSessao(req), tipo));
    } catch (erro) {
      next(erro);
    }
  },

  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res
        .status(201)
        .json(
          await enderecosService.criar(
            clienteDaSessao(req),
            usuarioDaSessao(req),
            req.body,
          ),
        );
    } catch (erro) {
      next(erro);
    }
  },

  async alterar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await enderecosService.alterar(
          clienteDaSessao(req),
          usuarioDaSessao(req),
          Number(req.params.id),
          req.body,
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },

  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await enderecosService.remover(clienteDaSessao(req), Number(req.params.id));
      res.status(204).send();
    } catch (erro) {
      next(erro);
    }
  },
};
