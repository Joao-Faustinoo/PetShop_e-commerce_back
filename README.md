# API — E-commerce Petshop

API REST do trabalho de Laboratório de Engenharia de Software. Consumida pelo
front-end em `../e-commerce`.

## Organização

O padrão é MVC adaptado a uma API REST — não há camada de View, porque a
resposta JSON cumpre esse papel. Cada arquivo abre com um cabeçalho que declara
seu papel, o que faz, como faz e quais requisitos do DRS atende, na mesma
convenção usada no front-end.

| Pasta | Papel | Responsabilidade |
|---|---|---|
| `src/types/` | Model | Contratos de dados. Só interfaces, sem lógica |
| `src/models/` | Model | Acesso ao banco via Prisma. Só consulta e grava |
| `src/services/` | Model | Regras de negócio do DRS. Não conhece HTTP |
| `src/controllers/` | Controller | Lê a requisição, chama o service, monta a resposta |
| `src/routes/` | Controller | Associa cada rota ao seu controller e middlewares |
| `src/middlewares/` | Controller | Autenticação, autorização, validação e erros |
| `src/validations/` | Model | Schemas Zod que validam o corpo das requisições |
| `prisma/` | Model | Schema do banco, migrations e carga inicial |

A dependência é unidirecional: rota → controller → service → model → banco.
Um service nunca conhece `req` ou `res`; um controller nunca conversa com o
Prisma direto.

## Primeiros passos

```bash
npm install
cp .env.example .env        # preencher DATABASE_URL e JWT_SECRET
npx prisma migrate dev --name inicial
npm run seed
npm run dev
```

## Ponto de atenção

O `POST /pedidos` substitui as dez chamadas que o front encadeia hoje ao
finalizar a compra. Precisa executar dentro de uma transação do Prisma: pedido,
cupons, pagamento, baixa de estoque e ranking. Se qualquer etapa falhar, nada
pode ser gravado.
