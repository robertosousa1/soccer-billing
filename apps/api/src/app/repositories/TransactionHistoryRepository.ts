import type { Prisma, PrismaClient } from "@prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

export interface TransactionFieldChange {
  campo: string;
  de: string | null;
  para: string | null;
}

export class TransactionHistoryRepository {
  constructor(private readonly prisma: Client) {}

  async record(transactionId: string, userId: string, alteracoes: TransactionFieldChange[]): Promise<void> {
    if (alteracoes.length === 0) return;
    await this.prisma.transactionHistoryEntry.create({
      data: {
        transactionId,
        userId,
        alteracoes: alteracoes as unknown as Prisma.InputJsonValue,
      },
    });
  }

  findByTransaction(transactionId: string) {
    return this.prisma.transactionHistoryEntry.findMany({
      where: { transactionId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
