-- CreateTable
CREATE TABLE "ConfigHistory" (
    "id" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,
    "valorAluguel" INTEGER NOT NULL,
    "diaPagamentoQuadra" INTEGER NOT NULL,
    "competencia" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigHistory_peladaId_idx" ON "ConfigHistory"("peladaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigHistory_peladaId_competencia_key" ON "ConfigHistory"("peladaId", "competencia");

-- AddForeignKey
ALTER TABLE "ConfigHistory" ADD CONSTRAINT "ConfigHistory_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
