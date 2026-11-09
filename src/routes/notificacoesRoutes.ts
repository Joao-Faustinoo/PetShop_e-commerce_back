/**
 * [CONTROLLER] Rotas de notificações
 *
 * O QUE FAZ: entrega ao cliente os avisos que o sistema gerou para ele e
 * permite marcá-los como lidos.
 *
 * COMO FARÁ: define o Router do Express com autenticação. É o que faz a
 * autorização da troca ser algo que o cliente RECEBE, e não apenas um
 * status que muda na lista de pedidos.
 *
 * ATENDE: RNF0046
 */

/*
 * Endpoints:
 *   GET   /notificacoes            cliente
 *   PATCH /notificacoes/:id/lida   cliente
 */

import { Router } from 'express';
import { z } from 'zod';

import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';
import { notificacoesModel } from '../models/notificacoesModel';
import { ApiError } from '../utils/ApiError';

const idSchema = z.object({
  id: z.coerce.number().int().positive('Id de notificação inválido.'),
});

const clienteDaSessao = (clienteId?: number): number => {
  if (!clienteId) {
    throw ApiError.naoAutorizado('Entre com uma conta de cliente.');
  }

  return clienteId;
};

export const notificacoesRoutes = Router();

notificacoesRoutes.use(autenticacao);

notificacoesRoutes.get('/', async (req, res, next) => {
  try {
    const clienteId = clienteDaSessao(req.usuario?.clienteId);

    res.json(await notificacoesModel.listarDoCliente(clienteId));
  } catch (erro) {
    next(erro);
  }
});

notificacoesRoutes.patch(
  '/:id/lida',
  validar({ params: idSchema }),
  async (req, res, next) => {
    try {
      const clienteId = clienteDaSessao(req.usuario?.clienteId);

      const marcou = await notificacoesModel.marcarLida(
        clienteId,
        Number(req.params.id),
      );

      if (!marcou) {
        throw ApiError.naoEncontrado('Notificação não encontrada.');
      }

      res.json({ id: Number(req.params.id), lida: true });
    } catch (erro) {
      next(erro);
    }
  },
);
