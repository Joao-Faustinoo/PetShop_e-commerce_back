/**
 * [MODEL] Service de estoque
 *
 * O QUE FAZ: exige produto, quantidade, custo, fornecedor e data na
 * entrada (RN0050), recusa quantidade zero (RN0061) e custo ausente
 * (RN0062), e calcula o valor de venda pelo maior custo quando há lotes
 * distintos (RN0051).
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/estoque/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RF0051-RF0054, RN0050, RN0051, RN0061, RN0062
 */

// TODO: implementar as regras de negócio.
