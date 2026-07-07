import { prisma } from "../../database/client";
import { AppError } from "../utils/AppError";

export class PayerAbonoRepository {
  async create(data: {
    payerId: string;
    peladaId: string;
    competencia: string;
    motivo: string;
    createdByUserId: string | null;
  }) {
    const existing = await prisma.payerAbono.findUnique({
      where: { payerId_competencia: { payerId: data.payerId, competencia: data.competencia } },
    });
    if (existing && existing.deletedAt === null) {
      throw new AppError("Já existe um abono para este pagante nesta competência.", 409);
    }
    if (existing) {
      // restore soft-deleted abono
      return prisma.payerAbono.update({
        where: { id: existing.id },
        data: { motivo: data.motivo, createdByUserId: data.createdByUserId, deletedAt: null },
      });
    }
    return prisma.payerAbono.create({ data });
  }

  async delete(payerId: string, competencia: string) {
    const existing = await prisma.payerAbono.findUnique({
      where: { payerId_competencia: { payerId, competencia } },
    });
    if (!existing || existing.deletedAt !== null) throw new AppError("Abono não encontrado.", 404);
    await prisma.payerAbono.update({
      where: { payerId_competencia: { payerId, competencia } },
      data: { deletedAt: new Date() },
    });
  }

  findByPeladaAndCompetencia(peladaId: string, competencia: string) {
    return prisma.payerAbono.findMany({
      where: { peladaId, competencia, deletedAt: null },
      select: { payerId: true, motivo: true },
    });
  }
}
