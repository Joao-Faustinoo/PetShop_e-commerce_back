/**
 * [MODEL] Service de cupons
 *
 * O QUE FAZ: valida a existência e a validade do cupom, impede mais de um
 * promocional por compra (RN0033) e gera o cupom de troco quando o valor
 * supera a compra (RN0036).
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/cupons/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RF0037, RF0045, RN0033, RN0036, RN0037
 */

// TODO: implementar as regras de negócio.
