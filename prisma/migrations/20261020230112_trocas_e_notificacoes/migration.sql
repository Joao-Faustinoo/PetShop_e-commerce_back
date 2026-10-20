-- CreateEnum
CREATE TYPE "StatusTroca" AS ENUM ('EM_TROCA', 'TROCA_AUTORIZADA', 'TROCADO');

-- CreateTable
CREATE TABLE "troca" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(16) NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" "StatusTroca" NOT NULL DEFAULT 'EM_TROCA',
    "troca_total" BOOLEAN NOT NULL DEFAULT false,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "data_solicitacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retornou_ao_estoque" BOOLEAN,
    "cupom_gerado_id" INTEGER,

    CONSTRAINT "troca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_troca" (
    "id" SERIAL NOT NULL,
    "troca_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "produto_nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "item_troca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedido_id" INTEGER,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "troca_numero_key" ON "troca"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "troca_cupom_gerado_id_key" ON "troca"("cupom_gerado_id");

-- CreateIndex
CREATE INDEX "troca_pedido_id_idx" ON "troca"("pedido_id");

-- CreateIndex
CREATE INDEX "troca_cliente_id_idx" ON "troca"("cliente_id");

-- CreateIndex
CREATE INDEX "troca_status_idx" ON "troca"("status");

-- CreateIndex
CREATE INDEX "item_troca_troca_id_idx" ON "item_troca"("troca_id");

-- CreateIndex
CREATE INDEX "notificacao_cliente_id_lida_idx" ON "notificacao"("cliente_id", "lida");

-- AddForeignKey
ALTER TABLE "troca" ADD CONSTRAINT "troca_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "troca" ADD CONSTRAINT "troca_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "troca" ADD CONSTRAINT "troca_cupom_gerado_id_fkey" FOREIGN KEY ("cupom_gerado_id") REFERENCES "cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_troca" ADD CONSTRAINT "item_troca_troca_id_fkey" FOREIGN KEY ("troca_id") REFERENCES "troca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_troca" ADD CONSTRAINT "item_troca_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
