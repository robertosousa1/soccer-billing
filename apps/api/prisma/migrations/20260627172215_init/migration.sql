-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('MENSALISTA', 'AVULSO');

-- CreateEnum
CREATE TYPE "ShareCategory" AS ENUM ('MENSALIDADE', 'AVULSO', 'OUTRO');

-- CreateEnum
CREATE TYPE "OutflowCategory" AS ENUM ('QUADRA', 'OUTRA_SAIDA');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'READER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pelada" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pelada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeladaMember" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'READER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeladaMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "valorMensalidade" INTEGER NOT NULL,
    "valorAvulso" INTEGER NOT NULL,
    "valorAluguel" INTEGER NOT NULL,
    "diaPagamentoQuadra" INTEGER NOT NULL DEFAULT 10,
    "whatsappRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappReminderDay" INTEGER,
    "whatsappTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtIdentifier" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "configId" TEXT NOT NULL,

    CONSTRAINT "CourtIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payer" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "PayerType" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "desde" TEXT,
    "telefone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayerAlias" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasNorm" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,

    CONSTRAINT "PayerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "rawFileKey" TEXT,
    "qtdNovas" INTEGER NOT NULL,
    "qtdDuplicadas" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "formaPagamento" TEXT,
    "competencia" TEXT NOT NULL,
    "chaveNatural" TEXT NOT NULL,
    "ignorada" BOOLEAN NOT NULL DEFAULT false,
    "outflowCategory" "OutflowCategory",
    "importId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "categoria" "ShareCategory" NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "transactionId" TEXT NOT NULL,
    "payerId" TEXT,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PeladaMember_userId_idx" ON "PeladaMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PeladaMember_peladaId_userId_key" ON "PeladaMember"("peladaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Config_peladaId_key" ON "Config"("peladaId");

-- CreateIndex
CREATE INDEX "Payer_peladaId_idx" ON "Payer"("peladaId");

-- CreateIndex
CREATE INDEX "PayerAlias_payerId_idx" ON "PayerAlias"("payerId");

-- CreateIndex
CREATE UNIQUE INDEX "PayerAlias_peladaId_aliasNorm_key" ON "PayerAlias"("peladaId", "aliasNorm");

-- CreateIndex
CREATE INDEX "Import_peladaId_idx" ON "Import"("peladaId");

-- CreateIndex
CREATE INDEX "Transaction_peladaId_competencia_idx" ON "Transaction"("peladaId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_peladaId_chaveNatural_key" ON "Transaction"("peladaId", "chaveNatural");

-- CreateIndex
CREATE INDEX "Share_payerId_idx" ON "Share"("payerId");

-- CreateIndex
CREATE INDEX "Share_transactionId_idx" ON "Share"("transactionId");

-- AddForeignKey
ALTER TABLE "PeladaMember" ADD CONSTRAINT "PeladaMember_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeladaMember" ADD CONSTRAINT "PeladaMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtIdentifier" ADD CONSTRAINT "CourtIdentifier_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payer" ADD CONSTRAINT "Payer_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerAlias" ADD CONSTRAINT "PayerAlias_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
