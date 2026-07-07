import type { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { ConfigHistoryRepository } from "../repositories/ConfigHistoryRepository";

interface Request {
  peladaId: string;
  competencias: string[];
}

export class ApplyConfigSnapshotsService {
  constructor(private readonly prisma: PrismaClient) {}

  async execute({ peladaId, competencias }: Request): Promise<void> {
    if (!competencias.length) return;

    const config = await this.prisma.config.findUnique({ where: { peladaId } });
    if (!config) throw new AppError("Configuração não encontrada", 404);

    await new ConfigHistoryRepository(this.prisma).upsertMany(peladaId, competencias, {
      valorAluguel: config.valorAluguel,
      diaPagamentoQuadra: config.diaPagamentoQuadra,
    });
  }
}
