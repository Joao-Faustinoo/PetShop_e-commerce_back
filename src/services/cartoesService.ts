/**
 * [MODEL] Service de cartões de crédito
 *
 * O QUE FAZ: valida a composição exigida pela RN0024, aceita apenas
 * bandeiras registradas (RN0025) e mantém um único cartão preferencial por
 * cliente.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/cartoes/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RF0027, RF0036, RN0024, RN0025
 */

// TODO: implementar as regras de negócio.
