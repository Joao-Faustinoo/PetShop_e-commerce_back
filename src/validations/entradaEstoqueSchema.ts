/**
 * [MODEL] Schema de validação — entrada de itens em estoque
 *
 * O QUE FAZ: valida os dados de entrada de itens em estoque antes de
 * chegarem ao service.
 *
 * COMO FARÁ: objeto Zod exigindo produto, quantidade maior que zero, valor
 * de custo, fornecedor e data, conforme as RN0050, RN0061 e RN0062. É
 * aplicado pelo middleware `validar`. Espelha o schema yup equivalente do
 * front-end, para que as duas pontas recusem os mesmos dados.
 */

// TODO: implementar o schema.
