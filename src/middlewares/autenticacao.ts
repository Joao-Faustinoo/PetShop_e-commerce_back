/**
 * [CONTROLLER] Middleware de autenticação
 *
 * O QUE FAZ: identifica o usuário a partir do token da requisição.
 *
 * COMO FARÁ: lê o cabeçalho `Authorization: Bearer <token>`, verifica a
 * assinatura do JWT e anexa o usuário à requisição. Sem token válido,
 * responde 401.
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { TokenPayload } from '../types/auth/types';
import { ApiError } from '../utils/ApiError';

const lerToken = (cabecalho: string | undefined): string => {
  if (!cabecalho) {
    throw ApiError.naoAutenticado('Token de acesso não informado.');
  }

  const [esquema, token] = cabecalho.split(' ');

  if (esquema !== 'Bearer' || !token) {
    throw ApiError.naoAutenticado(
      'Formato de token inválido. Use: Authorization: Bearer <token>.',
    );
  }

  return token;
};

export const autenticacao = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const token = lerToken(req.headers.authorization);
    // `verify` promete apenas `string | JwtPayload`; o formato do nosso
    // payload é garantido por quem assina o token, em authService.
    const payload = jwt.verify(token, env.jwtSecret) as unknown as TokenPayload;

    req.usuario = {
      id: payload.sub,
      perfil: payload.perfil,
      clienteId: payload.clienteId,
    };

    next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      next(ApiError.naoAutenticado('Sessão expirada. Entre novamente.'));

      return;
    }

    if (erro instanceof jwt.JsonWebTokenError) {
      next(ApiError.naoAutenticado('Token de acesso inválido.'));

      return;
    }

    next(erro);
  }
};
