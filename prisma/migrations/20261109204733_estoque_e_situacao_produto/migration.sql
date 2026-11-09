-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'BAIXA', 'REENTRADA');

-- AlterTable
ALTER TABLE "produto" ADD COLUMN     "justificativa_situacao" TEXT,
ADD COLUMN     "motivo_ativacao_id" INTEGER,
ADD COLUMN     "motivo_inativacao_id" INTEGER;

-- CreateTable
CREATE TABLE "motivo_inativacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "automatico" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "motivo_inativacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivo_ativacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "motivo_ativacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_estoque" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_custo" DECIMAL(10,2),
    "fornecedor_id" INTEGER,
    "pedido_id" INTEGER,
    "troca_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "observacao" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "motivo_inativacao_nome_key" ON "motivo_inativacao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "motivo_ativacao_nome_key" ON "motivo_ativacao"("nome");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_produto_id_data_hora_idx" ON "movimentacao_estoque"("produto_id", "data_hora");

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_motivo_inativacao_id_fkey" FOREIGN KEY ("motivo_inativacao_id") REFERENCES "motivo_inativacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_motivo_ativacao_id_fkey" FOREIGN KEY ("motivo_ativacao_id") REFERENCES "motivo_ativacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
