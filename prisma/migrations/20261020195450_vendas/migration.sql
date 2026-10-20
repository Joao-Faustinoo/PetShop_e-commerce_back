-- CreateEnum
CREATE TYPE "TipoCupom" AS ENUM ('TROCA', 'PROMOCIONAL');

-- CreateEnum
CREATE TYPE "SituacaoPedido" AS ENUM ('EM_PROCESSAMENTO', 'APROVADA', 'REPROVADA', 'EM_TRANSPORTE', 'ENTREGUE', 'EM_TROCA', 'TROCA_AUTORIZADA', 'TROCADO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('CARTAO', 'CUPOM_TROCA', 'CUPOM_PROMOCIONAL');

-- CreateTable
CREATE TABLE "grupo_precificacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "margem_lucro" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "grupo_precificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marca" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "cor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "porte" (
    "id" SERIAL NOT NULL,
    "sigla" "PorteSigla" NOT NULL,
    "nome" TEXT NOT NULL,
    "peso_min" DECIMAL(5,2) NOT NULL,
    "peso_max" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "porte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(16) NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "marca_id" INTEGER NOT NULL,
    "especie" "Especie" NOT NULL,
    "porte" "PorteSigla" NOT NULL,
    "cor_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "altura" DECIMAL(6,2) NOT NULL,
    "largura" DECIMAL(6,2) NOT NULL,
    "profundidade" DECIMAL(6,2) NOT NULL,
    "peso" DECIMAL(6,3) NOT NULL,
    "codigo_barras" VARCHAR(20) NOT NULL,
    "grupo_precificacao_id" INTEGER NOT NULL,
    "valor_custo" DECIMAL(10,2) NOT NULL,
    "valor_venda" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "imagem" TEXT,
    "total_vendido" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto_categoria" (
    "produto_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,

    CONSTRAINT "produto_categoria_pkey" PRIMARY KEY ("produto_id","categoria_id")
);

-- CreateTable
CREATE TABLE "item_estoque" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_custo" DECIMAL(10,2) NOT NULL,
    "fornecedor_id" INTEGER NOT NULL,
    "data_entrada" DATE NOT NULL,

    CONSTRAINT "item_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupom" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(24) NOT NULL,
    "tipo" "TipoCupom" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "validade" DATE NOT NULL,
    "utilizado" BOOLEAN NOT NULL DEFAULT false,
    "cliente_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrinho" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_carrinho" (
    "id" SERIAL NOT NULL,
    "carrinho_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "item_carrinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(16) NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "endereco_entrega_id" INTEGER NOT NULL,
    "frete" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "situacao" "SituacaoPedido" NOT NULL DEFAULT 'EM_PROCESSAMENTO',
    "data_compra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cupom_troco_codigo" VARCHAR(24),

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_pedido" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "produto_nome" TEXT NOT NULL,
    "produto_sku" VARCHAR(16) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "item_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "forma" "FormaPagamento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "cartao_id" INTEGER,
    "cupom_id" INTEGER,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_transacao" (
    "id" SERIAL NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" INTEGER NOT NULL,
    "operacao" VARCHAR(20) NOT NULL,
    "entidade" VARCHAR(40) NOT NULL,
    "entidade_id" VARCHAR(24),
    "dados_anteriores" JSONB,
    "dados_novos" JSONB,

    CONSTRAINT "log_transacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grupo_precificacao_nome_key" ON "grupo_precificacao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "marca_nome_key" ON "marca"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nome_key" ON "categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "cor_nome_key" ON "cor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "material_nome_key" ON "material"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "porte_sigla_key" ON "porte"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_nome_key" ON "fornecedor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_cnpj_key" ON "fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "produto_sku_key" ON "produto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "produto_codigo_barras_key" ON "produto"("codigo_barras");

-- CreateIndex
CREATE INDEX "produto_nome_idx" ON "produto"("nome");

-- CreateIndex
CREATE INDEX "produto_ativo_idx" ON "produto"("ativo");

-- CreateIndex
CREATE INDEX "item_estoque_produto_id_idx" ON "item_estoque"("produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "cupom_codigo_key" ON "cupom"("codigo");

-- CreateIndex
CREATE INDEX "cupom_cliente_id_idx" ON "cupom"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "carrinho_cliente_id_key" ON "carrinho"("cliente_id");

-- CreateIndex
CREATE INDEX "item_carrinho_carrinho_id_idx" ON "item_carrinho"("carrinho_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_carrinho_carrinho_id_produto_id_key" ON "item_carrinho"("carrinho_id", "produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_numero_key" ON "pedido"("numero");

-- CreateIndex
CREATE INDEX "pedido_cliente_id_idx" ON "pedido"("cliente_id");

-- CreateIndex
CREATE INDEX "pedido_situacao_idx" ON "pedido"("situacao");

-- CreateIndex
CREATE INDEX "item_pedido_pedido_id_idx" ON "item_pedido"("pedido_id");

-- CreateIndex
CREATE INDEX "pagamento_pedido_id_idx" ON "pagamento"("pedido_id");

-- CreateIndex
CREATE INDEX "log_transacao_entidade_entidade_id_idx" ON "log_transacao"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "log_transacao_data_hora_idx" ON "log_transacao"("data_hora");

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "cor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_grupo_precificacao_id_fkey" FOREIGN KEY ("grupo_precificacao_id") REFERENCES "grupo_precificacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_categoria" ADD CONSTRAINT "produto_categoria_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_categoria" ADD CONSTRAINT "produto_categoria_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_estoque" ADD CONSTRAINT "item_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_estoque" ADD CONSTRAINT "item_estoque_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupom" ADD CONSTRAINT "cupom_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrinho" ADD CONSTRAINT "carrinho_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_carrinho" ADD CONSTRAINT "item_carrinho_carrinho_id_fkey" FOREIGN KEY ("carrinho_id") REFERENCES "carrinho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_carrinho" ADD CONSTRAINT "item_carrinho_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_endereco_entrega_id_fkey" FOREIGN KEY ("endereco_entrega_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_cartao_id_fkey" FOREIGN KEY ("cartao_id") REFERENCES "cartao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
