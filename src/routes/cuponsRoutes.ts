/**
 * [CONTROLLER] Rotas de cupons
 *
 * O QUE FAZ: entrega ao cliente os cupons que ele pode usar e valida um
 * código informado no checkout.
 *
 * COMO FARÁ: define o Router do Express com autenticação. O cliente só
 * enxerga os próprios cupons de troca e os promocionais abertos.
 *
 * ATENDE: RF0037, RF0044, RN0033, RN0037
 */

/*
 * Endpoints:
 *   GET /cupons                cliente
 *   GET /cupons/:codigo        cliente — valida antes de aplicar
 */

import { Router } from 'express';

import { autenticacao } from '../middlewares/autenticacao';
import { cuponsService } from '../services/cuponsService';
import { ApiError } from '../utils/ApiError';

export const cuponsRoutes = Router();

cuponsRoutes.use(autenticacao);

const exigirCliente = (clienteId?: number): number => {
  if (!clienteId) throw ApiError.naoAutorizado('Entre com uma conta de cliente.');

  return clienteId;
};

cuponsRoutes.get('/', async (req, res, next) => {
  try {
    res.json(await cuponsService.listarDoCliente(exigirCliente(req.usuario?.clienteId)));
  } catch (erro) {
    next(erro);
  }
});

cuponsRoutes.get('/:codigo', async (req, res, next) => {
  try {
    res.json(
      await cuponsService.validar(
        req.params.codigo,
        exigirCliente(req.usuario?.clienteId),
      ),
    );
  } catch (erro) {
    next(erro);
  }
});
