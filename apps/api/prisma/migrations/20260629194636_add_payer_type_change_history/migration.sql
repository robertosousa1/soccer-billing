-- CreateTable
CREATE TABLE "PayerTypeChange" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "tipo" "PayerType" NOT NULL,
    "vigenteDesde" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayerTypeChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayerTypeChange_payerId_idx" ON "PayerTypeChange"("payerId");

-- CreateIndex
CREATE UNIQUE INDEX "PayerTypeChange_payerId_vigenteDesde_key" ON "PayerTypeChange"("payerId", "vigenteDesde");

-- AddForeignKey
ALTER TABLE "PayerTypeChange" ADD CONSTRAINT "PayerTypeChange_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
