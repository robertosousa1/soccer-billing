-- CreateEnum
CREATE TYPE "PayerHistoryAction" AS ENUM ('CRIACAO', 'EDICAO');

-- CreateTable
CREATE TABLE "PayerHistoryEntry" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "userId" TEXT,
    "acao" "PayerHistoryAction" NOT NULL,
    "motivo" TEXT,
    "alteracoes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayerHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayerHistoryEntry_payerId_idx" ON "PayerHistoryEntry"("payerId");

-- AddForeignKey
ALTER TABLE "PayerHistoryEntry" ADD CONSTRAINT "PayerHistoryEntry_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerHistoryEntry" ADD CONSTRAINT "PayerHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
