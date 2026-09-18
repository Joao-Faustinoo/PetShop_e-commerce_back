/**
 * [MODEL] Service de carrinho
 *
 * O QUE FAZ: bloqueia temporariamente o item ao adicioná-lo (RN0044),
 * libera os expirados retirando-os do carrinho (RN0045) e revalida a
 * disponibilidade antes do checkout.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/carrinho/service.ts`, onde as mesmas regras
 * já estão escritas sobre dados mockados.
 *
 * ATENDE: RF0031, RF0032, RN0044, RN0045, RNF0042
 */

// TODO: implementar as regras de negócio.
