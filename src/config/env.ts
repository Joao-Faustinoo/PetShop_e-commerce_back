/**
 * [MODEL] Variáveis de ambiente
 *
 * O QUE FAZ: centraliza e valida a configuração vinda do ambiente.
 *
 * COMO FARÁ: lê o `.env` e valida a presença de `DATABASE_URL` e
 * `JWT_SECRET` na inicialização, de modo que uma configuração incompleta
 * falhe ao subir e não no meio de uma requisição.
 */

import 'dotenv/config';

/** Lê uma variável obrigatória, interrompendo o boot se ela faltar. */
const obrigatoria = (nome: string): string => {
  const valor = process.env[nome];

  if (!valor || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ${nome} não definida. Copie .env.example para .env e preencha.`,
    );
  }

  return valor;
};

const opcional = (nome: string, padrao: string): string =>
  process.env[nome]?.trim() || padrao;

export const env = {
  databaseUrl: obrigatoria('DATABASE_URL'),
  jwtSecret: obrigatoria('JWT_SECRET'),
  jwtExpiresIn: opcional('JWT_EXPIRES_IN', '1d'),
  porta: Number(opcional('PORT', '3333')),
  corsOrigin: opcional('CORS_ORIGIN', 'http://localhost:3000'),
} as const;
