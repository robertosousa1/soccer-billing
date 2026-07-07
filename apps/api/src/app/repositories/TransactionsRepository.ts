import type { OutflowCategory, PrismaClient, Share, ShareCategory, Transaction } from "@prisma/client";

export class TransactionsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    peladaId: string;
    data: string;
    hora: string;
    nomeOriginal: string;
    valor: number;
    competencia: string;
    chaveNatural: string;
    outflowCategory?: OutflowCategory | null;
    share?: { payerId: string; categoria: ShareCategory; valor: number } | null;
  }) {
    return this.prisma.transaction.create({
      data: {
        peladaId: data.peladaId,
        data: data.data,
        hora: data.hora,
        nomeOriginal: data.nomeOriginal,
        valor: data.valor,
        competencia: data.competencia,
        chaveNatural: data.chaveNatural,
        outflowCategory: data.outflowCategory ?? null,
        shares: data.share
          ? { create: [{ valor: data.share.valor, categoria: data.share.categoria, ordem: 0, payerId: data.share.payerId }] }
          : undefined,
      },
      include: { shares: { include: { payer: true } } },
    });
  }

  listExistingKeys(peladaId: string): Promise<{ chaveNatural: string }[]> {
    return this.prisma.transaction.findMany({
      where: { peladaId, deletedAt: null },
      select: { chaveNatural: true },
    });
  }

  listByCompetencia(peladaId: string, competencia: string) {
    return this.prisma.transaction.findMany({
      where: { peladaId, competencia, deletedAt: null },
      include: { shares: true },
    });
  }

  listByPelada(peladaId: string) {
    return this.prisma.transaction.findMany({
      where: { peladaId, deletedAt: null },
      include: { shares: { include: { payer: true } } },
      orderBy: [{ competencia: "desc" }, { data: "desc" }, { hora: "desc" }],
    });
  }

  findById(peladaId: string, id: string) {
    return this.prisma.transaction.findFirst({
      where: { id, peladaId, deletedAt: null },
      include: { shares: true },
    });
  }

  update(
    id: string,
    data: {
      data?: string;
      valor?: number;
      chaveNatural?: string;
      competencia?: string;
      outflowCategory?: Transaction["outflowCategory"];
      ignorada?: boolean;
      editada?: boolean;
    },
  ): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data });
  }

  updateShareValor(shareId: string, valor: number): Promise<Share> {
    return this.prisma.share.update({ where: { id: shareId }, data: { valor } });
  }

  /** Menor competência entre as mensalidades não ignoradas de um pagante (base de `Payer.desde`). */
  async minMensalidadeCompetencia(payerId: string): Promise<string | null> {
    const share = await this.prisma.share.findFirst({
      where: { payerId, categoria: "MENSALIDADE", transaction: { ignorada: false, deletedAt: null } },
      orderBy: { transaction: { competencia: "asc" } },
      select: { transaction: { select: { competencia: true } } },
    });
    return share?.transaction.competencia ?? null;
  }

  softDelete(id: string): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Primeira e última competência com lançamentos ativos na pelada. */
  async competenciaRange(peladaId: string): Promise<{ min: string | null; max: string | null }> {
    const [min, max] = await Promise.all([
      this.prisma.transaction.findFirst({
        where: { peladaId, deletedAt: null },
        orderBy: { competencia: "asc" },
        select: { competencia: true },
      }),
      this.prisma.transaction.findFirst({
        where: { peladaId, deletedAt: null },
        orderBy: { competencia: "desc" },
        select: { competencia: true },
      }),
    ]);
    return { min: min?.competencia ?? null, max: max?.competencia ?? null };
  }
}
