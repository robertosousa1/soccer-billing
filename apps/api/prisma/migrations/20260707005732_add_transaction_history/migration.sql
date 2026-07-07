-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "editada" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TransactionHistoryEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT,
    "alteracoes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionHistoryEntry_transactionId_idx" ON "TransactionHistoryEntry"("transactionId");

-- AddForeignKey
ALTER TABLE "TransactionHistoryEntry" ADD CONSTRAINT "TransactionHistoryEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistoryEntry" ADD CONSTRAINT "TransactionHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
