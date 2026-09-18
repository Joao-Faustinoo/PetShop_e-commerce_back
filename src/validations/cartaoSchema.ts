/**
 * [MODEL] Schema de validação — cadastro e alteração de cartão
 *
 * O QUE FAZ: valida os dados de cadastro e alteração de cartão antes de
 * chegarem ao service.
 *
 * COMO FARÁ: objeto Zod exigindo número, nome impresso, bandeira
 * registrada e código de segurança, conforme a RN0024. É aplicado pelo
 * middleware `validar`. Espelha o schema yup equivalente do front-end,
 * para que as duas pontas recusem os mesmos dados.
 */

// TODO: implementar o schema.
