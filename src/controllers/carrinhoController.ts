/**
 * [CONTROLLER] Controller de carrinho
 *
 * O QUE FAZ: expõe as operações de carrinho sobre HTTP.
 *
 * COMO FARÁ: identifica o cliente pelo token, chama o service e devolve o
 * carrinho inteiro a cada operação — a tela sempre repinta com o estado
 * novo, inclusive com os itens que o prazo retirou (RNF0042).
 *
 * ATENDE: RF0031, RF0032, RN0044, RNF0042
 */

/*
 * Endpoints deste controller:
 *   GET    /carrinho
 *   GET    /carrinho/parametros
 *   POST   /carrinho/itens
 *   PUT    /carrinho/itens/:produtoId
 *   DELETE /carrinho/itens/:produtoId
 *   POST   /carrinho/itens/:produtoId/restaurar
 *   DELETE /carrinho
 */

import { NextFunction, Request, Response } from 'express';

import { carrinhoService } from '../services/carrinhoService';
import { ApiError } from '../utils/ApiError';

/**
 * O carrinho é sempre o de quem está logado: não existe rota para mexer no
 * carrinho alheio, nem mesmo para o ADMIN.
 */
const clienteDaSessao = (req: Request): number => {
  const id = req.usuario?.clienteId;

  if (!id) {
    throw ApiError.naoAutorizado(
      'Somente um cliente tem carrinho. Entre com uma conta de cliente.',
    );
  }

  return id;
};

export const carrinhoController = {
  async ver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await carrinhoService.ver(clienteDaSessao(req)));
    } catch (erro) {
      next(erro);
    }
  },

  /** RN0044: a tela precisa dos prazos para mostrar a contagem. */
  async parametros(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(carrinhoService.parametros());
    } catch (erro) {
      next(erro);
    }
  },

  async adicionar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { produtoId, quantidade } = req.body;

      res.status(201).json(
        await carrinhoService.adicionar(clienteDaSessao(req), produtoId, quantidade),
      );
    } catch (erro) {
      next(erro);
    }
  },

  async alterarQuantidade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await carrinhoService.alterarQuantidade(
          clienteDaSessao(req),
          Number(req.params.produtoId),
          req.body.quantidade,
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },

  async remover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await carrinhoService.remover(
          clienteDaSessao(req),
          Number(req.params.produtoId),
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },

  /** RNF0042: devolve ao carrinho um item retirado pelo prazo. */
  async restaurar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(
        await carrinhoService.restaurar(
          clienteDaSessao(req),
          Number(req.params.produtoId),
        ),
      );
    } catch (erro) {
      next(erro);
    }
  },

  async esvaziar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json(await carrinhoService.esvaziar(clienteDaSessao(req)));
    } catch (erro) {
      next(erro);
    }
  },
};
