-- CreateTable
CREATE TABLE "modelo_recomendacao" (
    "id" SERIAL NOT NULL,
    "versao" INTEGER NOT NULL,
    "pesos" JSONB NOT NULL,
    "exemplos" INTEGER NOT NULL,
    "acuracia_treino" DOUBLE PRECISION NOT NULL,
    "acuracia_validacao" DOUBLE PRECISION NOT NULL,
    "treinado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelo_recomendacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modelo_recomendacao_versao_key" ON "modelo_recomendacao"("versao");
