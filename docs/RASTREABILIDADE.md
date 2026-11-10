# Matriz de rastreabilidade — Petshop e-commerce

Para cada requisito do DRS, onde ele está implementado e qual caso de
teste o exercita. A coluna "onde" é coletada dos cabeçalhos `ATENDE:` e
dos comentários de regra do próprio código: a matriz não inventa
vínculo, ela reúne o que o código declara.

Gerada por `api/scripts/matriz.py`. Para refazer depois de mexer no
código, rode `python scripts/matriz.py` dentro de `api`.

| Requisito | Título | Onde | Testes |
|---|---|---|---|
| **RF0011** | Cadastrar produto | `api/controllers/produtosController.ts`, `api/models/produtosModel.ts`, `api/routes/produtosRoutes.ts` _(+9)_ | — |
| **RF0012** | Inativar cadastro de produto | `api/controllers/produtosController.ts`, `api/models/produtosModel.ts`, `api/routes/produtosRoutes.ts` _(+6)_ | — |
| **RF0013** | Inativar produto de forma automática | `api/config/env.ts`, `api/models/produtosModel.ts`, `api/services/estoqueService.ts` _(+7)_ | — |
| **RF0014** | Alterar cadastro de produto | `api/controllers/produtosController.ts`, `api/models/produtosModel.ts`, `api/routes/produtosRoutes.ts` _(+7)_ | — |
| **RF0015** | Consulta de produtos | `api/types/produtos/types.ts`, `front/app/(loja)/produtos/[id]/page.tsx`, `front/app/(loja)/produtos/page.tsx` _(+12)_ | — |
| **RF0016** | Ativar cadastro de produtos | `api/controllers/produtosController.ts`, `api/models/produtosModel.ts`, `api/routes/produtosRoutes.ts` _(+9)_ | — |
| **RF0021** | Cadastrar cliente | `api/controllers/authController.ts`, `api/controllers/clientesController.ts`, `api/models/clientesModel.ts` _(+11)_ | CT-01 |
| **RF0022** | Alterar cliente | `api/controllers/clientesController.ts`, `api/middlewares/autorizacao.ts`, `api/services/clientesService.ts` _(+9)_ | CT-05, CT-06 |
| **RF0023** | Inativar cadastro de cliente | `api/controllers/clientesController.ts`, `api/models/authModel.ts`, `api/models/clientesModel.ts` _(+10)_ | CT-07, CT-08, CT-09 |
| **RF0024** | Consulta de clientes | `api/controllers/clientesController.ts`, `api/models/clientesModel.ts`, `api/services/clientesService.ts` _(+12)_ | CT-03, CT-04 |
| **RF0025** | Consulta de transações | `api/controllers/clientesController.ts`, `api/middlewares/autorizacao.ts`, `api/models/clientesModel.ts` _(+15)_ | CT-05 |
| **RF0026** | Cadastro de endereços de entrega | `api/controllers/enderecosController.ts`, `api/models/enderecosModel.ts`, `api/routes/enderecosRoutes.ts` _(+10)_ | — |
| **RF0027** | Cadastro de cartões de crédito | `api/controllers/cartoesController.ts`, `api/models/cartoesModel.ts`, `api/routes/cartoesRoutes.ts` _(+10)_ | — |
| **RF0028** | Cadastrar pet  (novo) | `api/controllers/petsController.ts`, `api/models/petsModel.ts`, `api/routes/petsRoutes.ts` _(+10)_ | — |
| **RF0029** | Alterar/remover pet  (novo) | `api/controllers/petsController.ts`, `api/models/petsModel.ts`, `api/routes/petsRoutes.ts` _(+10)_ | — |
| **RF0031** | Gerenciar carrinho de compra | `api/controllers/carrinhoController.ts`, `api/models/carrinhoModel.ts`, `api/routes/carrinhoRoutes.ts` _(+11)_ | CT-01 |
| **RF0032** | Definir quantidade de itens no carrinho | `api/controllers/carrinhoController.ts`, `api/models/carrinhoModel.ts`, `api/routes/carrinhoRoutes.ts` _(+12)_ | CT-01 |
| **RF0033** | Realizar compra | `api/controllers/pedidosController.ts`, `api/models/pedidosModel.ts`, `api/routes/pedidosRoutes.ts` _(+7)_ | CT-02 |
| **RF0034** | Calcular frete | `api/controllers/carrinhoController.ts`, `api/models/carrinhoModel.ts`, `api/routes/carrinhoRoutes.ts` _(+7)_ | CT-02 |
| **RF0035** | Selecionar endereço de entrega | `api/controllers/enderecosController.ts`, `api/models/enderecosModel.ts`, `api/routes/cartoesRoutes.ts` _(+11)_ | CT-02, CT-03 |
| **RF0036** | Selecionar forma de pagamento | `api/controllers/cartoesController.ts`, `api/models/cartoesModel.ts`, `api/routes/cartoesRoutes.ts` _(+13)_ | CT-02, CT-03 |
| **RF0037** | Uso de cupom para pagamento | `api/controllers/cuponsController.ts`, `api/models/cuponsModel.ts`, `api/models/pedidosModel.ts` _(+12)_ | CT-06 |
| **RF0038** | Finalizar compra | `api/controllers/pedidosController.ts`, `api/models/pedidosModel.ts`, `api/routes/pedidosRoutes.ts` _(+11)_ | CT-02, CT-07 |
| **RF0039** | Despachar produtos para entrega | `api/controllers/pedidosController.ts`, `api/models/pedidosModel.ts`, `api/routes/pedidosRoutes.ts` _(+7)_ | — |
| **RF0040** | Produtos entregues | `api/controllers/pedidosController.ts`, `api/models/pedidosModel.ts`, `api/routes/pedidosRoutes.ts` _(+9)_ | — |
| **RF0041** | Solicitar troca | `api/controllers/trocasController.ts`, `api/models/pedidosModel.ts`, `api/models/trocasModel.ts` _(+13)_ | — |
| **RF0042** | Autorizar trocas | `api/controllers/trocasController.ts`, `api/models/trocasModel.ts`, `api/routes/trocasRoutes.ts` _(+5)_ | — |
| **RF0043** | Visualização de trocas | `api/controllers/trocasController.ts`, `api/models/trocasModel.ts`, `api/routes/trocasRoutes.ts` _(+4)_ | — |
| **RF0044** | Confirmar recebimento de itens para troca | `api/controllers/trocasController.ts`, `api/models/cuponsModel.ts`, `api/models/trocasModel.ts` _(+12)_ | — |
| **RF0045** | Gerar cupom de troca após recebimento de itens | `api/controllers/cuponsController.ts`, `api/models/cuponsModel.ts`, `api/services/cuponsService.ts` _(+11)_ | — |
| **RF0051** | Realizar entrada em estoque | `api/controllers/estoqueController.ts`, `api/models/estoqueModel.ts`, `api/routes/estoqueRoutes.ts` _(+10)_ | — |
| **RF0052** | Calcular valor de venda | `api/services/estoqueService.ts`, `api/services/produtosService.ts`, `front/components/Forms/ProdutoForm/ProdutoForm.tsx` _(+4)_ | — |
| **RF0053** | Dar baixa em estoque | `api/controllers/estoqueController.ts`, `api/models/estoqueModel.ts`, `api/routes/estoqueRoutes.ts` _(+2)_ | — |
| **RF0054** | Realizar reentrada em estoque | `api/controllers/estoqueController.ts`, `api/controllers/trocasController.ts`, `api/models/estoqueModel.ts` _(+9)_ | — |
| **RF0055** | Analisar histórico de vendas | `api/controllers/analiseController.ts`, `api/models/analiseModel.ts`, `api/routes/analiseRoutes.ts` _(+8)_ | — |
| **RF0056** | Filtrar período de análise de vendas | `api/controllers/analiseController.ts`, `api/routes/analiseRoutes.ts`, `api/services/analiseService.ts` _(+4)_ | — |
| **RF0057** | Selecionar categorias para comparação | `api/controllers/analiseController.ts`, `api/models/analiseModel.ts`, `api/routes/analiseRoutes.ts` _(+7)_ | — |
| **RF0058** | Exportar dados do gráfico de vendas | `api/types/analise/types.ts`, `front/app/(admin)/admin/analise/page.tsx`, `front/components/pages/AdminAnalise/page.tsx` _(+3)_ | — |
| **RNF0011** | Tempo de resposta para consultas | `api/models/estoqueModel.ts`, `front/components/Inputs/SearchInput/input.tsx`, `front/components/pages/Catalogo/page.tsx` _(+7)_ | — |
| **RNF0012** | Log de transação | `api/controllers/cartoesController.ts`, `api/controllers/enderecosController.ts`, `api/controllers/estoqueController.ts` _(+25)_ | CT-10 |
| **RNF0021** | Código de produto | `api/models/produtosModel.ts`, `api/services/produtosService.ts`, `api/types/produtos/types.ts` _(+1)_ | — |
| **RNF0013** | Cadastro de domínios | `api/controllers/dominiosController.ts`, `api/models/dominiosModel.ts`, `api/routes/dominiosRoutes.ts` _(+7)_ | — |
| **RNF0034** | Alteração apenas de endereços | `api/controllers/enderecosController.ts`, `api/models/enderecosModel.ts`, `api/routes/enderecosRoutes.ts` _(+7)_ | — |
| **RNF0035** | Código de cliente | `api/controllers/clientesController.ts`, `api/models/clientesModel.ts`, `api/models/pedidosModel.ts` _(+7)_ | CT-01, CT-03 |
| **RNF0042** | Apresentar itens retirados do carrinho | `api/controllers/carrinhoController.ts`, `api/models/carrinhoModel.ts`, `api/routes/carrinhoRoutes.ts` _(+7)_ | — |
| **RNF0043** | Gráfico de linhas | `api/controllers/analiseController.ts`, `api/services/analiseService.ts`, `api/types/analise/types.ts` _(+8)_ | — |
| **RNF0044** | Formatação monetária do eixo de valores | `front/components/Charts/LineChart/index.tsx`, `front/utils/formatCurrency.ts` | — |
| **RNF0045** | Legenda do gráfico | `api/services/analiseService.ts`, `api/types/analise/types.ts`, `front/components/Charts/LineChart/index.tsx` _(+4)_ | — |
| **RNF0046** | Interatividade do gráfico | `api/controllers/analiseController.ts`, `api/controllers/trocasController.ts`, `api/models/notificacoesModel.ts` _(+13)_ | — |
| **RNF0047** | Recomendação com IA generativa | `api/config/env.ts`, `api/controllers/chatController.ts`, `api/models/chatModel.ts` _(+15)_ | — |
| **RN0011** | Dados obrigatórios para o cadastro de um produto | `api/models/produtosModel.ts`, `api/services/produtosService.ts`, `api/types/produtos/types.ts` _(+7)_ | — |
| **RN0012** | Associação com categorias | `api/models/analiseModel.ts`, `api/models/produtosModel.ts`, `api/services/produtosService.ts` _(+9)_ | — |
| **RN0013** | Definindo valor de venda | `api/models/produtosModel.ts`, `api/services/estoqueService.ts`, `api/services/produtosService.ts` _(+8)_ | — |
| **RN0014** | Validar margem de lucro | `api/services/produtosService.ts`, `api/types/dominios/types.ts`, `api/types/produtos/types.ts` _(+7)_ | — |
| **RN0015** | Associar motivo de inativação | `api/models/produtosModel.ts`, `api/services/produtosService.ts`, `api/types/produtos/types.ts` _(+8)_ | — |
| **RN0016** | Associar motivo de inativação automática | `api/models/produtosModel.ts`, `api/services/estoqueService.ts`, `api/types/dominios/types.ts` _(+3)_ | — |
| **RN0017** | Associar motivo de ativação | `api/models/produtosModel.ts`, `api/services/estoqueService.ts`, `api/services/produtosService.ts` _(+9)_ | — |
| **RN0021** | Cadastro de endereço de cobrança | `api/models/clientesModel.ts`, `api/models/enderecosModel.ts`, `api/services/clientesService.ts` _(+13)_ | CT-01, CT-02b |
| **RN0022** | Cadastro de endereço de entrega | `api/models/clientesModel.ts`, `api/models/enderecosModel.ts`, `api/services/clientesService.ts` _(+13)_ | CT-01, CT-02b |
| **RN0023** | Composição do registro de endereços | `api/controllers/dominiosController.ts`, `api/models/dominiosModel.ts`, `api/models/enderecosModel.ts` _(+19)_ | CT-01, CT-02d, CT-05, CT-03 |
| **RN0024** | Composição do registro de cartões de crédito | `api/models/cartoesModel.ts`, `api/routes/cartoesRoutes.ts`, `api/services/cartoesService.ts` _(+10)_ | CT-03 |
| **RN0025** | Bandeiras permitidas para registro de cartões de crédi | `api/controllers/dominiosController.ts`, `api/models/cartoesModel.ts`, `api/models/dominiosModel.ts` _(+16)_ | CT-03 |
| **RN0026** | Dados obrigatórios para o cadastro de um cliente | `api/models/clientesModel.ts`, `api/services/clientesService.ts`, `api/types/clientes/types.ts` _(+9)_ | CT-01, CT-02, CT-02c |
| **RN0027** | Ranking de cliente | `api/models/clientesModel.ts`, `api/models/pedidosModel.ts`, `api/services/clientesService.ts` _(+9)_ | CT-03, CT-04 |
| **RN0028** | Validar retorno da operadora de cartão de crédito | `api/models/estoqueModel.ts`, `api/services/pedidosService.ts`, `api/types/pedidos/types.ts` _(+1)_ | — |
| **RN0029** | Cadastro de pet  (novo) | `api/controllers/petsController.ts`, `api/models/petsModel.ts`, `api/routes/clientesRoutes.ts` _(+10)_ | — |
| **RN0031** | Validar estoque para adição de itens no carrinho | `api/models/estoqueModel.ts`, `api/models/produtosModel.ts`, `api/services/carrinhoService.ts` _(+13)_ | CT-01 |
| **RN0032** | Validar estoque para compra | `api/models/carrinhoModel.ts`, `api/services/carrinhoService.ts`, `api/services/pedidosService.ts` _(+6)_ | — |
| **RN0033** | Uso de cupom promocional para pagamento | `api/controllers/cuponsController.ts`, `api/routes/cuponsRoutes.ts`, `api/services/cuponsService.ts` _(+8)_ | CT-05 |
| **RN0034** | Uso de diversos cartões de crédito | `api/models/pedidosModel.ts`, `api/services/pedidosService.ts`, `front/components/pages/Checkout/page.tsx` _(+1)_ | CT-04 |
| **RN0035** | Uso de cupons junto a cartão de crédito | `api/services/cuponsService.ts`, `api/services/pedidosService.ts`, `api/types/cupons/types.ts` _(+5)_ | CT-05 |
| **RN0036** | Gerar cupom de troca | `api/controllers/cuponsController.ts`, `api/models/cuponsModel.ts`, `api/models/pedidosModel.ts` _(+13)_ | CT-06 |
| **RN0037** | Validar forma de pagamento para finalização de compra | `api/config/env.ts`, `api/controllers/cuponsController.ts`, `api/models/pedidosModel.ts` _(+10)_ | — |
| **RN0038** | Alterar status da compra conforme processo de aprovaçã | `api/services/pedidosService.ts`, `api/types/trocas/types.ts`, `front/components/pages/Checkout/page.tsx` _(+4)_ | — |
| **RN0039** | Alterar status da compra para transporte | `api/controllers/pedidosController.ts`, `api/services/pedidosService.ts`, `front/components/pages/AdminPedidos/page.tsx` _(+1)_ | — |
| **RN0040** | Alterar status da compra após entrega | `api/controllers/pedidosController.ts`, `api/services/pedidosService.ts`, `front/components/pages/AdminPedidos/page.tsx` _(+2)_ | — |
| **RN0041** | Gerar pedido de troca | `api/models/trocasModel.ts`, `api/services/trocasService.ts`, `api/types/trocas/types.ts` _(+5)_ | — |
| **RN0042** | Alterar status do pedido após recebimento de troca | `api/controllers/trocasController.ts`, `api/models/trocasModel.ts`, `api/services/trocasService.ts` _(+5)_ | — |
| **RN0043** | Validação para solicitar troca | `api/controllers/trocasController.ts`, `api/models/trocasModel.ts`, `api/routes/trocasRoutes.ts` _(+9)_ | — |
| **RN0044** | Bloqueio de produtos | `api/config/env.ts`, `api/controllers/carrinhoController.ts`, `api/models/carrinhoModel.ts` _(+12)_ | — |
| **RN0045** | Retirar item do carrinho | `api/types/carrinho/types.ts`, `front/components/pages/Carrinho/page.tsx`, `front/controllers/carrinho/useBloqueioItemController.ts` _(+1)_ | — |
| **RN0046** | Gerar notificação de autorização de troca | `api/types/trocas/types.ts`, `front/components/pages/AdminTrocas/page.tsx`, `front/controllers/trocas/useAutorizarTrocaController.ts` _(+1)_ | — |
| **RN0050** | Validar dados de estoque | `api/models/estoqueModel.ts`, `api/routes/estoqueRoutes.ts`, `api/services/estoqueService.ts` _(+8)_ | — |
| **RN0051** | Definir valor de item com diferentes custos | `api/models/estoqueModel.ts`, `api/models/produtosModel.ts`, `api/routes/estoqueRoutes.ts` _(+9)_ | — |
| **RN0061** | Quantidade de itens | `api/routes/estoqueRoutes.ts`, `api/services/estoqueService.ts`, `api/types/estoque/types.ts` _(+7)_ | — |
| **RN0062** | Valor de custo | `api/routes/estoqueRoutes.ts`, `api/services/estoqueService.ts`, `api/types/estoque/types.ts` _(+7)_ | — |
| **RNF0064** | Data de entrada | `api/routes/estoqueRoutes.ts`, `api/services/estoqueService.ts`, `api/types/estoque/types.ts` _(+7)_ | — |
| **RN0071** | Granularidade do período | `api/controllers/analiseController.ts`, `api/models/analiseModel.ts`, `api/routes/analiseRoutes.ts` _(+7)_ | — |
| **RN0072** | Período mínimo e máximo de análise | `api/services/analiseService.ts`, `api/types/analise/types.ts`, `api/validations/analiseFiltroSchema.ts` _(+5)_ | — |
| **RN0073** | Categorias sem vendas no período | `api/services/analiseService.ts`, `api/types/analise/types.ts`, `front/components/Charts/LineChart/index.tsx` _(+4)_ | — |
| **RN0074** | Consideração de status para o cálculo | `api/controllers/analiseController.ts`, `api/models/analiseModel.ts`, `api/models/pedidosModel.ts` _(+9)_ | — |

## Resumo

- Requisitos no DRS: **91**
- Com implementação citada no código: **91**
- Sem citação: **0**
