/**
 * [MODEL] Service de análise gerencial
 *
 * O QUE FAZ: agrupa por mês (RN0071), considera apenas as compras
 * aprovadas, em transporte ou entregues (RN0074) e devolve zero para
 * categoria sem venda no mês, mantendo a série contínua (RN0073).
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/analise/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RF0055-RF0058, RN0071-RN0074, RNF0043-RNF0046
 */

// TODO: implementar as regras de negócio.
