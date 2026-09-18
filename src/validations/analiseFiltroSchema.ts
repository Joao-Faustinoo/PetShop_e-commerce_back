/**
 * [MODEL] Schema de validação — filtro da análise gerencial
 *
 * O QUE FAZ: valida os dados de filtro da análise gerencial antes de
 * chegarem ao service.
 *
 * COMO FARÁ: objeto Zod exigindo período entre 1 e 24 meses (RN0072) e ao
 * menos uma categoria selecionada. É aplicado pelo middleware `validar`.
 * Espelha o schema yup equivalente do front-end, para que as duas pontas
 * recusem os mesmos dados.
 */

// TODO: implementar o schema.
