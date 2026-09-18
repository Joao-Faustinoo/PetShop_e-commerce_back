/**
 * [MODEL] Service de produtos
 *
 * O QUE FAZ: calcula o valor de venda pela margem do grupo de precificação
 * (RN0013), gera o SKU único (RNF0021) e exige motivo e justificativa na
 * mudança de situação (RN0015/RN0017).
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/produtos/service.ts`, onde as mesmas regras
 * já estão escritas sobre dados mockados.
 *
 * ATENDE: RF0011-RF0016, RN0012, RN0013, RN0015-RN0017, RNF0021
 */

// TODO: implementar as regras de negócio.
