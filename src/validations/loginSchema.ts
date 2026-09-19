/**
 * [MODEL] Schema de validação — credenciais de acesso
 *
 * O QUE FAZ: valida os dados de credenciais de acesso antes de chegarem ao
 * service.
 *
 * COMO FARÁ: objeto Zod exigindo e-mail em formato válido e senha
 * preenchida. É aplicado pelo middleware `validar`. Espelha o schema yup
 * equivalente do front-end, para que as duas pontas recusem os mesmos
 * dados.
 */

import { z } from 'zod';

/**
 * As premissas do DRS removeram força de senha, confirmação e recuperação
 * junto com a autenticação real — por isso `senha` só exige presença. O
 * front recusa exatamente estes dois casos em `LoginSchema.ts`.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Insira um e-mail válido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});
