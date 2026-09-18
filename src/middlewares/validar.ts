/**
 * [CONTROLLER] Middleware de validação
 *
 * O QUE FAZ: valida o corpo, os parâmetros e a query da requisição.
 *
 * COMO FARÁ: recebe um schema Zod e o aplica antes de o controller
 * executar, devolvendo 400 com as mensagens de erro. Evita que dado
 * inválido chegue ao service.
 */

import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

import { RespostaErro } from '../types/common/types';

interface Schemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/** "telefone.ddd: obrigatório" — caminho do campo junto da mensagem. */
const descrever = (erro: ZodError): string[] =>
  erro.issues.map(problema => {
    const caminho = problema.path.join('.');

    return caminho ? `${caminho}: ${problema.message}` : problema.message;
  });

export const validar =
  (schemas: Schemas) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // O valor validado substitui o original: é ele que traz as coerções
      // (string da query virando número, por exemplo) e os campos podados.
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);

      next();
    } catch (erro) {
      if (erro instanceof ZodError) {
        const detalhes = descrever(erro);
        const corpo: RespostaErro = {
          error: { message: 'Dados inválidos.', detalhes },
        };

        res.status(400).json(corpo);

        return;
      }

      next(erro);
    }
  };
