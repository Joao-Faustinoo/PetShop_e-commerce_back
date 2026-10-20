/**
 * [CONTROLLER] Controller de pedidos
 *
 * O QUE FAZ: expõe a finalização da compra, a consulta de pedidos e as
 * mudanças de situação feitas pelo administrador.
 *
 * COMO FARÁ: extrai parâmetros e corpo da requisição, chama o service e
 * devolve a resposta com o status adequado. Repassa o erro ao middleware
 * de tratamento em vez de tratá-lo aqui.
 *
 * ATENDE: RF0033, RF0038, RF0039, RF0040
 */

/*
 * Endpoints deste controller:
 *   GET    /pedidos                    ADMIN vê todos; CLIENTE, os seus
 *   GET    /pedidos/:id                ADMIN ou o dono
 *   POST   /pedidos                    CLIENTE — finaliza a compra
 *   PATCH  /pedidos/:id/despachar      ADMIN
 *   PATCH  /pedidos/:id/entregar       ADMIN
 */

import { NextFunction, Request, Response } from 'express';

import { pedidosService } from '../services/pedidosService';
import { PedidoFiltros } from '../types/pedidos/types';
import { ApiError } from '../utils/ApiError';
import { lerPaginacao } from '../utils/paginacao';

const clienteDaSessao = (req: Request): number => {
  const id = req.usuario?.clienteId;

  if (!id) {
    throw ApiError.naoAutorizado('Entre com uma conta de cliente para comprar.');
  }

  return id;
};

export const pedidosController = {
  /** RF0033: o admin consulta tudo; o cliente, apenas as próprias compras. */
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pagina, itensPorPagina, ...filtros } = req.query as PedidoFiltros & {
        pagina?: number;
        itensPorPagina?: number;
      };

      const escopo: PedidoFiltros =
        req.usuario?.perfil === 'ADMIN'
          ? filtros
          : { ...filtros, clienteId: clienteDaSessao(req) };

      res.json(
        await pedidosService.listar(escopo, lerPaginacao({ pagina, itensPorPagina })),
      );
    } catch (erro) {
      next(erro);
    }
  },

  async detalhar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pedido = await pedidosService.buscarPorId(Number(req.params.id));

      // O cliente só alcança a própria compra.
      if (
        req.usuario?.perfil !== 'ADMIN' &&
        pedido.clienteId !== req.usuario?.clienteId
      ) {
        throw ApiError.naoAutorizado('Você só pode ver as suas próprias compras.');
      }

      res.json(pedido);
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0038: finaliza a compra a partir do carrinho. */
  async finalizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clienteId = clienteDaSessao(req);
      const { pedido } = await pedidosService.finalizar(
        clienteId,
        req.usuario?.id ?? clienteId,
        req.body,
      );

      res.status(201).json(pedido);
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0039 e RN0039 */
  async despachar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await pedidosService.despachar(Number(req.params.id), req.usuario?.id ?? 0),
      );
    } catch (erro) {
      next(erro);
    }
  },

  /** RF0040 e RN0040 */
  async entregar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await pedidosService.confirmarEntrega(
          Number(req.params.id),
          req.usuario?.id ?? 0,
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },
};
