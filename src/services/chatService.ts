/**
 * [MODEL] Service de assistente de recomendação
 *
 * O QUE FAZ: monta o contexto do cliente e consulta a API do Google Gemini,
 * devolvendo a resposta com os produtos sugeridos, filtrados pela espécie
 * e pelo porte do pet.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/chat/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: RNF0047
 */

// TODO: implementar as regras de negócio.
