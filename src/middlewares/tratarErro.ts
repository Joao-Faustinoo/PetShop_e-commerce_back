/**
 * [CONTROLLER] Middleware de tratamento de erro
 *
 * O QUE FAZ: converte qualquer erro em uma resposta HTTP padronizada.
 *
 * COMO FARÁ: distingue o erro de negócio (ApiError, com status próprio) do
 * inesperado (500) e responde sempre no formato `{ error: { message } }`,
 * que é o que o cliente HTTP do front já sabe interpretar.
 */

import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';

import { RespostaErro } from '../types/common/types';
import { ApiError } from '../utils/ApiError';

/** Rota inexistente: responde antes de cair no tratador genérico. */
export const rotaNaoEncontrada = (req: Request, res: Response): void => {
  const corpo: RespostaErro = {
    error: { message: `Rota não encontrada: ${req.method} ${req.originalUrl}` },
  };

  res.status(404).json(corpo);
};

export const tratarErro = (
  erro: unknown,
  _req: Request,
  res: Response,
  // O Express só reconhece o tratador de erro pela aridade de 4 parâmetros;
  // `next` precisa continuar declarado mesmo sem uso.
  _next: NextFunction,
): void => {
  if (erro instanceof ApiError) {
    const corpo: RespostaErro = { error: { message: erro.message } };
    res.status(erro.status).json(corpo);

    return;
  }

  // Violação de restrição única que escapou da checagem do service — vira
  // 409 em vez de 500, porque a causa é o dado enviado.
  if (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === 'P2002'
  ) {
    const campos = (erro.meta?.target as string[] | undefined)?.join(', ');
    const corpo: RespostaErro = {
      error: {
        message: campos
          ? `Já existe um registro com este valor em: ${campos}.`
          : 'Já existe um registro com estes dados.',
      },
    };
    res.status(409).json(corpo);

    return;
  }

  // Registro referenciado que não existe — id de tabela de domínio inválido.
  if (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === 'P2003'
  ) {
    const corpo: RespostaErro = {
      error: { message: 'Referência inválida: o registro apontado não existe.' },
    };
    res.status(400).json(corpo);

    return;
  }

  // Daqui para baixo é falha não prevista: registra para o desenvolvedor e
  // devolve uma mensagem genérica, sem vazar detalhe interno.
  console.error('[erro não tratado]', erro);

  const corpo: RespostaErro = {
    error: { message: 'Erro interno no servidor.' },
  };

  res.status(500).json(corpo);
};
