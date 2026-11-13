/**
 * [CONTROLLER] Controller do assistente de recomendação
 *
 * O QUE FAZ: expõe o envio de mensagem ao assistente sobre HTTP.
 *
 * COMO FARÁ: identifica o cliente pelo token, chama o service e devolve a
 * resposta. Repassa o erro ao middleware de tratamento — inclusive o 503
 * de quando o serviço de IA não está disponível.
 *
 * ATENDE: RNF0047
 */

/*
 * Endpoints deste controller:
 *   POST /assistente/mensagens   cliente
 */

import { NextFunction, Request, Response } from 'express';

import { chatService } from '../services/chatService';
import { ApiError } from '../utils/ApiError';

/** O assistente é do cliente: não há conversa de administrador. */
const clienteDaSessao = (req: Request): number => {
  const id = req.usuario?.clienteId;

  if (!id) {
    throw ApiError.naoAutorizado('Entre com uma conta de cliente.');
  }

  return id;
};

export const chatController = {
  async responder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await chatService.responder(clienteDaSessao(req), req.body.texto));
    } catch (erro) {
      next(erro);
    }
  },

  /** RNF0047: o cliente marca a resposta como útil ou não útil. */
  async avaliar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await chatService.avaliar(
        clienteDaSessao(req),
        Number(req.params.id),
        req.body.util,
      );

      res.status(204).send();
    } catch (erro) {
      next(erro);
    }
  },
};
