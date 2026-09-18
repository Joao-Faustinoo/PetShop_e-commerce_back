/**
 * [MODEL] Schema de validação — cadastro e alteração de endereço
 *
 * O QUE FAZ: valida os dados de cadastro e alteração de endereço antes de
 * chegarem ao service.
 *
 * COMO FARÁ: objeto Zod exigindo a composição exigida pela RN0023: tipo de
 * residência, tipo de logradouro, logradouro, número, bairro, CEP, cidade,
 * estado e país. É aplicado pelo middleware `validar`. Espelha o schema
 * yup equivalente do front-end, para que as duas pontas recusem os mesmos
 * dados.
 */

// TODO: implementar o schema.
