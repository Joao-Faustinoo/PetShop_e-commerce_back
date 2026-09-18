/**
 * [MODEL] Schema de validação — cadastro e alteração de cliente
 *
 * O QUE FAZ: valida os dados de cadastro e alteração de cliente antes de
 * chegarem ao service.
 *
 * COMO FARÁ: objeto Zod exigindo nome, gênero, data de nascimento, CPF
 * válido, e-mail único e telefone. É aplicado pelo middleware `validar`.
 * Espelha o schema yup equivalente do front-end, para que as duas pontas
 * recusem os mesmos dados.
 *
 * A unicidade de CPF e e-mail não cabe aqui — depende do banco e fica no
 * service, que é quem consulta antes de gravar.
 */

import { z } from 'zod';

/** Deixa só os dígitos, como o front faz antes de comparar documentos. */
export const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '');

/**
 * Validação de CPF pelos dois dígitos verificadores. Rejeita também as
 * sequências repetidas (111.111.111-11), que passam no cálculo mas não são
 * documentos válidos.
 */
export const cpfValido = (valor: string): boolean => {
  const digitos = apenasDigitos(valor);

  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const verificador = (ate: number): number => {
    let soma = 0;

    for (let i = 0; i < ate; i += 1) {
      soma += Number(digitos[i]) * (ate + 1 - i);
    }

    const resto = (soma * 10) % 11;

    return resto === 10 ? 0 : resto;
  };

  return (
    verificador(9) === Number(digitos[9]) &&
    verificador(10) === Number(digitos[10])
  );
};

const generoSchema = z.enum(['MASCULINO', 'FEMININO', 'OUTRO'], {
  errorMap: () => ({ message: 'Gênero deve ser MASCULINO, FEMININO ou OUTRO.' }),
});

/** RN0026: tipo, DDD e número, os três obrigatórios. */
const telefoneSchema = z.object({
  tipoId: z.number().int().positive('Informe o tipo do telefone.'),
  ddd: z
    .string()
    .transform(apenasDigitos)
    .refine(v => v.length === 2, 'DDD deve ter 2 dígitos.'),
  numero: z
    .string()
    .transform(apenasDigitos)
    .refine(
      v => v.length === 8 || v.length === 9,
      'Número de telefone deve ter 8 ou 9 dígitos.',
    ),
});

/** RN0023: todos obrigatórios menos `observacoes`. */
const enderecoSchema = z.object({
  apelido: z.string().trim().min(1, 'Informe um apelido para o endereço.'),
  tipoResidenciaId: z.number().int().positive('Informe o tipo de residência.'),
  tipoLogradouroId: z.number().int().positive('Informe o tipo de logradouro.'),
  logradouro: z.string().trim().min(1, 'Informe o logradouro.'),
  numero: z.string().trim().min(1, 'Informe o número.'),
  bairro: z.string().trim().min(1, 'Informe o bairro.'),
  cep: z
    .string()
    .transform(apenasDigitos)
    .refine(v => v.length === 8, 'CEP deve ter 8 dígitos.'),
  cidade: z.string().trim().min(1, 'Informe a cidade.'),
  estado: z
    .string()
    .trim()
    .toUpperCase()
    .refine(v => v.length === 2, 'Estado deve ser a sigla de 2 letras.'),
  pais: z.string().trim().min(1, 'Informe o país.'),
  observacoes: z.string().trim().optional(),
});

/** RN0026: o conjunto obrigatório, comum ao cadastro e à alteração. */
const dadosPessoais = {
  nome: z
    .string()
    .trim()
    .min(3, 'Nome deve ter ao menos 3 caracteres.')
    .max(120, 'Nome deve ter no máximo 120 caracteres.'),
  genero: generoSchema,
  dataNascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar em AAAA-MM-DD.')
    .refine(valor => {
      const data = new Date(`${valor}T00:00:00Z`);

      return !Number.isNaN(data.getTime()) && data <= new Date();
    }, 'Data de nascimento inválida ou no futuro.'),
  cpf: z.string().refine(cpfValido, 'CPF inválido.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  telefone: telefoneSchema,
};

/** RN0021/RN0022: os dois endereços entram junto com o cadastro. */
export const criarClienteSchema = z.object({
  ...dadosPessoais,
  enderecoCobranca: enderecoSchema,
  enderecoEntrega: enderecoSchema,
});

export const alterarClienteSchema = z.object(dadosPessoais);

/** RF0023: inativar e reativar exigem justificativa. */
export const alterarSituacaoSchema = z.object({
  ativo: z.boolean({ required_error: 'Informe a situação desejada.' }),
  justificativa: z
    .string()
    .trim()
    .min(10, 'A justificativa deve ter ao menos 10 caracteres.')
    .max(500, 'A justificativa deve ter no máximo 500 caracteres.'),
});

/** `:id` chega como string na URL e precisa virar número para o service. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Id de cliente inválido.'),
});

/** RF0024: filtros combináveis, todos opcionais. */
export const clienteFiltrosSchema = z.object({
  nome: z.string().trim().optional(),
  codigo: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  email: z.string().trim().optional(),
  genero: generoSchema.optional(),
  rankingMinimo: z.coerce.number().int().min(1).max(5).optional(),
  // Query string traz "true"/"false" como texto; convertemos na entrada.
  ativo: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
  pagina: z.coerce.number().int().positive().optional(),
  itensPorPagina: z.coerce.number().int().positive().optional(),
});
