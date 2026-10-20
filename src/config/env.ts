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

/** Número inteiro positivo vindo do ambiente, com padrão. */
const inteiro = (nome: string, padrao: number): number => {
  const valor = Number(process.env[nome]);

  return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : padrao;
};

export const env = {
  databaseUrl: obrigatoria('DATABASE_URL'),
  jwtSecret: obrigatoria('JWT_SECRET'),
  jwtExpiresIn: opcional('JWT_EXPIRES_IN', '1d'),
  porta: Number(opcional('PORT', '3333')),
  corsOrigin: opcional('CORS_ORIGIN', 'http://localhost:3000'),

  /**
   * RN0044: o prazo do bloqueio é parametrizado. Fica no ambiente, e não
   * no código, porque é parâmetro do sistema — e porque o teste de
   * expiração precisa de um valor curto para caber numa execução.
   */
  minutosBloqueioCarrinho: inteiro('MINUTOS_BLOQUEIO_CARRINHO', 30),
  /** RN0044: o aviso ao cliente sai este tanto antes de expirar. */
  minutosAvisoBloqueio: inteiro('MINUTOS_AVISO_BLOQUEIO', 5),

  /**
   * RN0037: a operadora de cartão é simulada pelo grupo. Um cartão cujo
   * número termina nestes dígitos é sempre recusado, o que torna a compra
   * REPROVADA demonstrável sem depender de serviço externo.
   */
  finalCartaoRecusado: opcional('FINAL_CARTAO_RECUSADO', '0000'),
} as const;
