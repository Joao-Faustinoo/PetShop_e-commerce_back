/**
 * [CONTROLLER] Controller de pets
 *
 * O QUE FAZ: expõe o cadastro de pets do cliente logado sobre HTTP.
 *
 * COMO FARÁ: identifica o cliente pelo token, chama o service e devolve a
 * resposta. Repassa o erro ao middleware de tratamento.
 *
 * O `:clienteId` da listagem passa por `exigirDonoOuAdmin`: o cliente só
 * alcança os próprios pets, e o administrador consulta os de qualquer um,
 * porque a ficha do cliente os exibe. Alterar e remover são do dono: o
 * RF0028 e o RF0029 dão a gestão do pet ao cliente, não ao balcão.
 *
 * ATENDE: RF0028, RF0029, RN0029
 */

/*
 * Endpoints deste controller:
 *   GET    /clientes/:clienteId/pets   cliente dono ou admin
 *   POST   /clientes/:clienteId/pets   cliente dono
 *   PUT    /pets/:id                   cliente dono
 *   DELETE /pets/:id                   cliente dono
 */

import { NextFunction, Request, Response } from 'express';

import { exigirDonoOuAdmin } from '../middlewares/autorizacao';
import { petsService } from '../services/petsService';
import { ApiError } from '../utils/ApiError';

/** O dono do pet: o cliente da URL, quando há, ou o da sessão. */
const clienteDaRota = (req: Request): number => {
  const daUrl = Number(req.params.clienteId);

  if (daUrl) {
    exigirDonoOuAdmin(req, daUrl);

    return daUrl;
  }

  const daSessao = req.usuario?.clienteId;

  if (!daSessao) {
    throw ApiError.naoAutorizado('Entre com uma conta de cliente.');
  }

  return daSessao;
};

/** RNF0012: quem respondeu pela operação. */
const usuarioDaSessao = (req: Request): number => req.usuario?.id ?? 0;

export const petsController = {
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await petsService.listar(clienteDaRota(req)));
    } catch (erro) {
      next(erro);
    }
  },

  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res
        .status(201)
        .json(
          await petsService.criar(
            clienteDaRota(req),
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
        await petsService.alterar(
          clienteDaRota(req),
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
      await petsService.remover(clienteDaRota(req), Number(req.params.id));
      res.status(204).send();
    } catch (erro) {
      next(erro);
    }
  },
};
