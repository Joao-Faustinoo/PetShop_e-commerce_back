-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoEndereco" AS ENUM ('ENTREGA', 'COBRANCA');

-- CreateEnum
CREATE TYPE "Especie" AS ENUM ('CAO', 'GATO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PorteSigla" AS ENUM ('PP', 'P', 'M', 'G', 'GG');

-- CreateTable
CREATE TABLE "tipo_telefone" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "tipo_telefone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_residencia" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "tipo_residencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_logradouro" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "tipo_logradouro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bandeira_cartao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "bandeira_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "genero" "Genero" NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ranking" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "justificativa_inativacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telefone" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "tipo_id" INTEGER NOT NULL,
    "ddd" VARCHAR(3) NOT NULL,
    "numero" VARCHAR(15) NOT NULL,

    CONSTRAINT "telefone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endereco" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "apelido" TEXT NOT NULL,
    "tipo" "TipoEndereco" NOT NULL,
    "tipo_residencia_id" INTEGER NOT NULL,
    "tipo_logradouro_id" INTEGER NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cep" VARCHAR(9) NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" VARCHAR(2) NOT NULL,
    "pais" TEXT NOT NULL,
    "observacoes" TEXT,

    CONSTRAINT "endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartao" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "numero" VARCHAR(19) NOT NULL,
    "nome_impresso" TEXT NOT NULL,
    "bandeira_id" INTEGER NOT NULL,
    "codigo_seguranca" VARCHAR(4) NOT NULL,
    "preferencial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cartao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "especie" "Especie" NOT NULL,
    "raca" TEXT NOT NULL,
    "porte" "PorteSigla" NOT NULL,
    "peso" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "pet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_telefone_nome_key" ON "tipo_telefone"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_residencia_nome_key" ON "tipo_residencia"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_logradouro_nome_key" ON "tipo_logradouro"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "bandeira_cartao_nome_key" ON "bandeira_cartao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_codigo_key" ON "cliente"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_cpf_key" ON "cliente"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_email_key" ON "cliente"("email");

-- CreateIndex
CREATE INDEX "cliente_nome_idx" ON "cliente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "telefone_cliente_id_key" ON "telefone"("cliente_id");

-- CreateIndex
CREATE INDEX "endereco_cliente_id_idx" ON "endereco"("cliente_id");

-- CreateIndex
CREATE INDEX "cartao_cliente_id_idx" ON "cartao"("cliente_id");

-- CreateIndex
CREATE INDEX "pet_cliente_id_idx" ON "pet"("cliente_id");

-- AddForeignKey
ALTER TABLE "telefone" ADD CONSTRAINT "telefone_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telefone" ADD CONSTRAINT "telefone_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "tipo_telefone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_tipo_residencia_id_fkey" FOREIGN KEY ("tipo_residencia_id") REFERENCES "tipo_residencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_tipo_logradouro_id_fkey" FOREIGN KEY ("tipo_logradouro_id") REFERENCES "tipo_logradouro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartao" ADD CONSTRAINT "cartao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartao" ADD CONSTRAINT "cartao_bandeira_id_fkey" FOREIGN KEY ("bandeira_id") REFERENCES "bandeira_cartao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet" ADD CONSTRAINT "pet_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
