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

export const chatController = {
  async responder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clienteId = req.usuario?.clienteId;

      if (!clienteId) {
        throw ApiError.naoAutorizado('Entre com uma conta de cliente.');
      }

      res.json(await chatService.responder(clienteId, req.body.texto));
    } catch (erro) {
      next(erro);
    }
  },
};
