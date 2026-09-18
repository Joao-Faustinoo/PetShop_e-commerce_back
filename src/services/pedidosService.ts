/**
 * [MODEL] Service de pedidos e checkout
 *
 * O QUE FAZ: concentra a finalização da compra em UMA transação: cria o
 * pedido, consome os cupons, valida o pagamento, dá baixa no estoque
 * (RN0028) e atualiza o ranking. Também conduz a máquina de estados do
 * pedido.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/pedidos/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RF0025, RF0033-RF0040, RN0028, RN0031-RN0037
 */

// TODO: implementar as regras de negócio.
