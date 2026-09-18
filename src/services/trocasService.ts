/**
 * [MODEL] Service de trocas
 *
 * O QUE FAZ: aceita solicitação apenas de pedido entregue, autoriza a
 * troca notificando o cliente (RN0046) e, no recebimento, gera o cupom e
 * decide sobre o retorno dos itens ao estoque — tudo em uma transação.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/trocas/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RF0041-RF0045, RN0038-RN0043, RN0046
 */

// TODO: implementar as regras de negócio.
