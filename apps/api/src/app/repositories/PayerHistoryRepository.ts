import type { Prisma, PrismaClient } from "@prisma/client";
import { buildPayerDiff, type DiffablePayer, type PayerFieldChange } from "../utils/payerDiff";

type Client = PrismaClient | Prisma.TransactionClient;

function toJson(alteracoes: PayerFieldChange[]): Prisma.InputJsonValue {
  return alteracoes as unknown as Prisma.InputJsonValue;
}

export class PayerHistoryRepository {
  constructor(private readonly prisma: Client) {}

  async recordCreation(payerId: string, userId: string, after: DiffablePayer, motivo?: string): Promise<void> {
    const alteracoes = buildPayerDiff(null, after);
    await this.prisma.payerHistoryEntry.create({
      data: { payerId, userId, acao: "CRIACAO", motivo: motivo ?? null, alteracoes: toJson(alteracoes) },
    });
  }

  async recordEdit(
    payerId: string,
    userId: string,
    before: DiffablePayer,
    after: DiffablePayer,
    motivo?: string,
    extra: PayerFieldChange[] = [],
  ): Promise<void> {
    const alteracoes = [...buildPayerDiff(before, after), ...extra];
    if (alteracoes.length === 0) return;
    await this.prisma.payerHistoryEntry.create({
      data: { payerId, userId, acao: "EDICAO", motivo: motivo ?? null, alteracoes: toJson(alteracoes) },
    });
  }

  findByPayer(payerId: string) {
    return this.prisma.payerHistoryEntry.findMany({
      where: { payerId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
