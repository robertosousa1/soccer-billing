import type { PrismaClient } from "@prisma/client";

interface SnapshotValues {
  valorAluguel: number;
  diaPagamentoQuadra: number;
}

export class ConfigHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertMany(peladaId: string, competencias: string[], values: SnapshotValues): Promise<void> {
    await this.prisma.$transaction(
      competencias.map((competencia) =>
        this.prisma.configHistory.upsert({
          where: { peladaId_competencia: { peladaId, competencia } },
          create: { peladaId, competencia, ...values },
          update: values,
        }),
      ),
      { timeout: 30000, maxWait: 10000 },
    );
  }

  async findByCompetencia(peladaId: string, competencia: string) {
    return this.prisma.configHistory.findUnique({
      where: { peladaId_competencia: { peladaId, competencia } },
    });
  }
}
