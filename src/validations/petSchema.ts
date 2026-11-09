/**
 * [MODEL] Schema de validação — cadastro e alteração de pet
 *
 * O QUE FAZ: valida os dados de cadastro e alteração de pet antes de
 * chegarem ao service.
 *
 * COMO FARÁ: objeto Zod exigindo nome, espécie, raça e porte, os campos
 * mínimos da RN0029. É aplicado pelo middleware `validar`. Espelha o
 * schema yup equivalente do front-end, para que as duas pontas recusem os
 * mesmos dados.
 */

import { z } from 'zod';

/** O DRS trata porte e peso como a mesma informação; aqui vêm os dois. */
export const petSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome do pet.'),
  especie: z.enum(['CAO', 'GATO', 'OUTRO'], {
    message: 'Espécie deve ser cão, gato ou outro.',
  }),
  raca: z.string().trim().min(2, 'Informe a raça do pet.'),
  porte: z.enum(['PP', 'P', 'M', 'G', 'GG'], {
    message: 'Porte deve ser PP, P, M, G ou GG.',
  }),
  peso: z.coerce
    .number()
    .positive('O peso deve ser maior que zero.')
    .max(999.99, 'Peso acima do que o cadastro comporta.'),
});

export const idPetSchema = z.object({
  id: z.coerce.number().int().positive('Id de pet inválido.'),
});

export const clienteDoPetSchema = z.object({
  clienteId: z.coerce.number().int().positive('Id de cliente inválido.'),
});
