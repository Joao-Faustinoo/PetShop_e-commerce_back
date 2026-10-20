/**
 * [CONTROLLER] Controller de trocas
 *
 * O QUE FAZ: expõe o ciclo da troca sobre HTTP — solicitar, consultar,
 * autorizar e confirmar o recebimento.
 *
 * COMO FARÁ: extrai parâmetros e corpo da requisição, chama o service e
 * devolve a resposta. Repassa o erro ao middleware de tratamento.
 *
 * ATENDE: RF0041, RF0042, RF0043, RF0044
 */

/*
 * Endpoints deste controller:
 *   GET   /trocas                 ADMIN vê todas; CLIENTE, as suas
 *   GET   /trocas/:id             ADMIN ou o dono
 *   POST  /trocas                 CLIENTE
 *   PATCH /trocas/:id/autorizar   ADMIN
 *   PATCH /trocas/:id/receber     ADMIN
 */

import { NextFunction, Request, Response } from 'express';

import { trocasService } from '../services/trocasService';
import { StatusTroca } from '../types/trocas/types';
import { ApiError } from '../utils/ApiError';

const clienteDaSessao = (req: Request): number => {
  const id = req.usuario?.clienteId;

  if (!id) {
    throw ApiError.naoAutorizado('Entre com uma conta de cliente.');
  }

  return id;
};

export const trocasController = {
  /** RF0043: a fila do administrador; para o cliente, o próprio histórico. */
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query as { status?: StatusTroca };

      const filtros =
        req.usuario?.perfil === 'ADMIN'
          ? { status }
          : { status, clienteId: clienteDaSessao(req) };

      res.json(await trocasService.listar(filtros));
    } catch (erro) {
      next(erro);
    }
  },

  async detalhar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const troca = await trocasService.buscarPorId(Number(req.params.id));

      if (
        req.usuario?.perfil !== 'ADMIN' &&
        troca.clienteId !== req.usuario?.clienteId
      ) {
        throw ApiError.naoAutorizado('Esta troca é de outro cliente.');
      }

      res.json(troca);
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0041 e RN0043 */
  async solicitar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clienteId = clienteDaSessao(req);

      res
        .status(201)
        .json(
          await trocasService.solicitar(
            clienteId,
            req.usuario?.id ?? clienteId,
            req.body,
          ),
        );
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0042 e RNF0046 */
  async autorizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await trocasService.autorizar(Number(req.params.id), req.usuario?.id ?? 0),
      );
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0044, RN0042 e RF0054 */
  async receber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await trocasService.receber(
          Number(req.params.id),
          req.usuario?.id ?? 0,
          Boolean(req.body.retornarAoEstoque),
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },
};
