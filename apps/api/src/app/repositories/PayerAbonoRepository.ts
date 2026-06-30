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
    const exists = await prisma.payerAbono.findUnique({
      where: { payerId_competencia: { payerId: data.payerId, competencia: data.competencia } },
    });
    if (exists) throw new AppError("Já existe um abono para este pagante nesta competência.", 409);
    return prisma.payerAbono.create({ data });
  }

  async delete(payerId: string, competencia: string) {
    const exists = await prisma.payerAbono.findUnique({
      where: { payerId_competencia: { payerId, competencia } },
    });
    if (!exists) throw new AppError("Abono não encontrado.", 404);
    await prisma.payerAbono.delete({ where: { payerId_competencia: { payerId, competencia } } });
  }

  findByPeladaAndCompetencia(peladaId: string, competencia: string) {
    return prisma.payerAbono.findMany({
      where: { peladaId, competencia },
      select: { payerId: true, motivo: true },
    });
  }
}
