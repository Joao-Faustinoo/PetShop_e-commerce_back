/**
 * [MODEL] Service de log de transações
 *
 * O QUE FAZ: registra data, hora, usuário responsável e os dados
 * alterados, como exige a RNF0012. É acionado pelos demais services, não
 * diretamente pelas rotas.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/log/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RNF0012
 */

// TODO: implementar as regras de negócio.
