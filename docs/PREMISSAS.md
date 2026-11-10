# Premissas de implementação

O DRS é a única referência do projeto, mas em alguns pontos ele não decide:
pede um comportamento sem dizer a fórmula, o limite ou o gatilho. Cada
decisão tomada nesses pontos está aqui, com o motivo. São as respostas para
"por que isso funciona assim?" numa banca.

Decisões que o DRS determina não aparecem nesta lista — elas estão no
código, citadas pelo requisito.

---

## Produto e precificação

**RN0013 e RF0052 — a margem incide sobre o custo.**
`valorVenda = valorCusto × (1 + margem/100)`. O DRS diz "o valor de venda
será o valor de compra mais o percentual definido no grupo de precificação",
que é markup sobre o custo, não margem sobre o preço final. Os dois cálculos
dão números diferentes; adotamos a leitura literal do RF0052.

**RN0051 — "o maior valor de custo" é entre os lotes com saldo.**
A regra manda todos os itens valerem pelo maior custo quando há lotes de
custos diferentes, mas não diz de qual universo sai esse maior. Considerar
todos os lotes que já existiram faria um lote caro de dois anos atrás, há
muito vendido, manter o preço inflado para sempre. Filtrar pelos lotes com
saldo responde à pergunta que a regra quer fazer: quanto custa o que está no
depósito agora.

**RN0014 — a autorização do gerente é um aceite de quem altera.**
A regra exige "autorização de um gerente de vendas" para baixar o preço
abaixo da margem. As premissas do próprio DRS, porém, definem apenas dois
perfis mockados — cliente e administrador: não existe gerente para
autorizar. A autorização entra como aceite explícito de quem está alterando,
e fica registrada no log junto do valor anterior e do novo. A regra é
aplicada de verdade — sem o aceite o preço é recusado —, e a decisão fica
auditável, em vez de inventarmos um perfil que o DRS não prevê.

**RF0013 — o gatilho da inativação automática.**
A frase "produtos sem estoque e que não possuem venda com valor inferior a
um parâmetro predefinido no sistema" admite mais de uma leitura, não nomeia
o parâmetro nem dá valor. Adotamos o gatilho mais verificável: a verificação
roda logo depois da baixa da venda, dentro da mesma transação, porque é ali
que o saldo chega a zero. O parâmetro é `ESTOQUE_MINIMO_INATIVACAO`, no
`.env`, com zero como padrão — a leitura literal de "produtos sem estoque".

**RF0016 e RN0017 — a reativação automática distingue quem inativou.**
Quando entra estoque, o produto volta à vitrine sozinho, com motivo
"Reposição de estoque". Mas só se tiver sido o sistema que o inativou. Um
produto que o administrador tirou do catálogo por defeito no lote não
retorna só porque chegou mercadoria: aquela decisão foi de uma pessoa, e só
uma pessoa deve revertê-la. O campo `automatico` do motivo de inativação é
o que permite a distinção.

**RN0015 e RN0017 — as categorias de motivo.**
O DRS exige motivo além da justificativa, mas só nomeia um: FORA DE LINHA
(RN0016). Os demais são decisão de projeto, carregados pelo seed —
inativação: "Descontinuado pelo fornecedor", "Defeito identificado no lote",
"Baixa procura"; ativação: "Reposição de estoque", "Retorno ao catálogo",
"Correção de inativação indevida".

**RNF0021 — o formato do SKU.**
Exige-se apenas que seja único. Usamos `PET-0000`, derivado do id dentro da
transação do cadastro, no mesmo molde do código do cliente (RNF0035) e do
número do pedido. Derivar do id, e não de uma contagem de linhas, mantém a
unicidade mesmo com dois cadastros simultâneos.

---

## Cliente

**RN0027 — a fórmula e as faixas do ranking.**
O DRS pede "um ranking numérico com base em seu perfil de compras" e não diz
mais nada: nem fórmula, nem escala, nem faixas, nem quando recalcular.

Adotamos a soma gasta em compras efetivadas (os três status da RN0074),
reavaliada no momento em que a compra é aprovada, dentro da mesma transação.
As faixas são calibradas pela base real, em que os clientes vão de pouco mais
de mil a quase treze mil reais em dois anos:

| Total gasto | Ranking |
|---|---|
| ≥ R$ 10.000 | 5 |
| ≥ R$ 7.500 | 4 |
| ≥ R$ 5.000 | 3 |
| > R$ 0 | 2 |
| sem compras | 1 |

Faixas mais apertadas colocariam todos os clientes em 5, que é um ranking
que não distingue ninguém — e deixaria a consulta por ranking da RF0024 sem
o que filtrar.

**RF0025 — o que é uma "transação".**
O DRS não define. Adotamos a compra: é o que o sistema registra, é o que a
tela do administrador exibe dentro do cadastro, e é do que o ranking
depende.

---

## Venda

**RF0034 — o critério do frete.**
O DRS exige o cálculo "com base nos itens selecionados e no endereço", mas
não dá a fórmula; o enunciado da entrega pede explicitamente que o critério
seja explicado na apresentação. O adotado:

```
peso cubado      = (altura × largura × profundidade ÷ 6000) × quantidade
peso considerado = maior entre o peso real e o peso cubado
frete            = (R$ 12,90 + peso considerado × R$ 3,40) × multiplicador do estado
```

O multiplicador vai de 1,00 em SP a 1,90 no AM, com 1,50 para os estados não
listados. Cobrar pelo maior entre peso real e cubado é o que as
transportadoras fazem: uma caixa grande e leve ocupa espaço no caminhão. O
cálculo é determinístico e roda no servidor, que é quem registra o valor na
compra — o front apenas exibe o que ele calculou.

**RN0074 — os status que contam como venda efetivada.**
O texto lista três: APROVADA, EM TRANSPORTE e ENTREGUE. O DRS define também
EM TROCA, TROCA AUTORIZADA e TROCADO, e não diz o que fazer com uma venda
que depois virou troca. Seguimos o texto literal: ela sai da conta. A lacuna
fica registrada aqui.

**Produto em várias categorias no gráfico (RN0012 encontrando a RF0055).**
Um produto pode estar em mais de uma categoria, e o DRS não diz como
contabilizá-lo no gráfico por categoria. O valor do item é **rateado** entre
as categorias dele. Contar o item inteiro em cada linha inflaria o gráfico:
na base atual, R$ 62.970 contra os R$ 49.062 realmente vendidos — 28% a
mais. O rateio mantém a soma das linhas igual ao total vendido, que é o que
um avaliador confere somando as colunas.

**RF0035 e RF0036 — o que significa "não incorporar ao perfil".**
As duas regras oferecem a possibilidade de incorporar ao perfil o endereço
ou o cartão cadastrados durante a compra. Mas o pedido aponta para o
endereço e o pagamento aponta para o cartão: os dois precisam existir no
banco de todo jeito. "Não salvar no perfil" não pode significar "não
gravar". A coluna `salvoNoPerfil` separa as duas coisas — o perfil lista só
os salvos, e o checkout enxerga também os não salvos, para que o endereço
criado naquela compra continue selecionável enquanto ela não fecha.

**RN0037 — a operadora de cartão é simulada.**
As premissas do DRS permitem mockar integrações externas. Um cartão cujo
número termina em `FINAL_CARTAO_RECUSADO` (padrão `0000`) é sempre recusado,
o que torna a compra REPROVADA demonstrável sem depender de serviço externo.

**RF0038 — EM PROCESSAMENTO é um estado transitório.**
A compra é criada EM PROCESSAMENTO e, na mesma requisição, a validação do
pagamento (RN0037 e RN0038) a move para APROVADA ou REPROVADA. O estado
inicial não aparece na lista de pedidos, mas **fica registrado**: é o
primeiro degrau do histórico, com data e hora. É por ali que a RF0038 se
demonstra.

---

## Pets

**RF0029 — remover é excluir mesmo.**
Ao contrário do cliente, cujo cadastro a RF0023 manda preservar, o DRS não
pede nada equivalente para o pet, e o histórico de compras não aponta para
ele. A remoção apaga o registro.

**RN0029 — porte e peso são dois campos.**
A regra fala em "porte/peso". O cadastro guarda os dois: o porte como sigla
(PP a GG), que é o que casa com o porte do produto na recomendação, e o peso
em quilos.

---

## Transversais

**RNF0012 — o log cobre inserção e alteração.**
É o que a regra escreve. A exclusão de cartão, endereço e pet fica **sem
registro**, porque o DRS não a menciona. O registro é gravado pelo servidor,
dentro da mesma transação da escrita: assim ele e o dado registrado valem ou
falham juntos, e uma operação feita direto na API — sem passar pela tela —
também fica registrada.

O nome do usuário e a lista de campos alterados são derivados na leitura, e
não gravados. Guardar o nome congelaria um que o cliente pode ter alterado
depois; guardar a comparação duplicaria o dado.

**RNF0047 — contexto, não treinamento.**
O DRS pede um modelo "treinado com base em dados de vendas e feedback dos
usuários". Treinar um modelo generativo não é viável nem apropriado aqui — e
não é o que se faz na prática com modelos de API. O sistema leva esses dados
ao modelo **como contexto da pergunta**: os pets do cliente, o que ele já
comprou, as categorias e marcas que mais se repetem no histórico, e o
catálogo disponível. A instrução de sistema proíbe o modelo de inventar
produto, preço ou prazo, e de sair do assunto da loja.

Só produto ativo e com saldo entra na sugestão: oferecer o que a loja não
pode entregar contraria a RN0031.

**RNF0013 — os valores das tabelas de domínio.**
A regra pede um script de implantação que insira os registros, mas a lista é
exemplificativa ("por ex.", "etc.") e não traz os valores. Marcas,
categorias, cores, materiais, fornecedores, grupos de precificação e seus
percentuais, e os motivos de situação são decisão de projeto, todos no seed.

---

## Numeração do DRS

O DRS deste projeto e os enunciados das entregas divergem na numeração a
partir do RF0038. O código segue **o DRS**, que é a referência declarada.
A correspondência, quando precisar explicar:

| Enunciado diz | DRS diz |
|---|---|
| RF0037 finalizar compra | RF0038 |
| RF0038 despachar | RF0039 |
| RF0039 confirmar entrega | RF0040 |
| RF0040 solicitar troca | RF0041 |
| RF0041 autorizar troca | RF0042 |
| RF0042 visualizar trocas | RF0043 |
| RF0043 confirmar recebimento | RF0044 |
| RF0044 consultar cupons | RF0045 |
| RNF0045 bloqueio no carrinho | **RN0045** (RNF0045 é "Legenda do gráfico") |
| RNF0046 notificação de troca | **RN0046** (RNF0046 é "Interatividade do gráfico") |
