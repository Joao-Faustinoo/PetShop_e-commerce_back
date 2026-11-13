-- CreateTable
CREATE TABLE "interacao_chat" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "produtos_sugeridos" INTEGER[],
    "util" BOOLEAN,
    "avaliado_em" TIMESTAMP(3),
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacao_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interacao_chat_cliente_id_data_hora_idx" ON "interacao_chat"("cliente_id", "data_hora");

-- CreateIndex
CREATE INDEX "interacao_chat_util_idx" ON "interacao_chat"("util");

-- AddForeignKey
ALTER TABLE "interacao_chat" ADD CONSTRAINT "interacao_chat_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
