-- CreateTable
CREATE TABLE "PayerAbono" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayerAbono_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayerAbono_peladaId_competencia_idx" ON "PayerAbono"("peladaId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "PayerAbono_payerId_competencia_key" ON "PayerAbono"("payerId", "competencia");

-- AddForeignKey
ALTER TABLE "PayerAbono" ADD CONSTRAINT "PayerAbono_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerAbono" ADD CONSTRAINT "PayerAbono_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayerAbono" ADD CONSTRAINT "PayerAbono_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
