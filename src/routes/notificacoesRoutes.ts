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

import { prisma } from '../config/prisma';
import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';
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

    const linhas = await prisma.notificacao.findMany({
      where: { clienteId },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });

    res.json(
      linhas.map(n => ({
        id: n.id,
        mensagem: n.mensagem,
        lida: n.lida,
        criadoEm: n.criadoEm.toISOString(),
        pedidoId: n.pedidoId ?? undefined,
      })),
    );
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

      // O updateMany com o clienteId no filtro impede marcar aviso alheio.
      const { count } = await prisma.notificacao.updateMany({
        where: { id: Number(req.params.id), clienteId },
        data: { lida: true },
      });

      if (count === 0) {
        throw ApiError.naoEncontrado('Notificação não encontrada.');
      }

      res.json({ id: Number(req.params.id), lida: true });
    } catch (erro) {
      next(erro);
    }
  },
);
