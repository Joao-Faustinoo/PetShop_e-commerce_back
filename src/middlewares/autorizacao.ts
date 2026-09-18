/**
 * [CONTROLLER] Middleware de autorização por perfil
 *
 * O QUE FAZ: restringe a rota aos perfis autorizados.
 *
 * COMO FARÁ: recebe os perfis permitidos e compara com o do usuário já
 * autenticado. Responde 403 quando o perfil não basta. Aplicado após a
 * autenticação.
 */

import { NextFunction, Request, Response } from 'express';

import { Perfil } from '../types/auth/types';
import { ApiError } from '../utils/ApiError';

export const autorizacao =
  (...perfis: Perfil[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      // Chegar aqui sem usuário significa que a rota esqueceu de encadear a
      // autenticação antes — é erro de montagem, não do requisitante.
      next(
        ApiError.naoAutenticado(
          'Rota protegida sem autenticação prévia. Verifique a ordem dos middlewares.',
        ),
      );

      return;
    }

    if (!perfis.includes(req.usuario.perfil)) {
      next(ApiError.naoAutorizado());

      return;
    }

    next();
  };

/**
 * RF0022/RF0025: um CLIENTE só alcança o próprio cadastro; o ADMIN alcança
 * qualquer um. Usado pelas rotas que os dois perfis compartilham.
 */
export const exigirDonoOuAdmin = (
  req: Request,
  clienteId: number,
): void => {
  const usuario = req.usuario;

  if (!usuario) throw ApiError.naoAutenticado();

  if (usuario.perfil === 'ADMIN') return;

  if (usuario.clienteId !== clienteId) {
    throw ApiError.naoAutorizado(
      'Você só pode acessar o seu próprio cadastro.',
    );
  }
};
