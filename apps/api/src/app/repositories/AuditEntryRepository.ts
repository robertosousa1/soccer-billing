import type { PrismaClient } from "@prisma/client";

interface CreateParams {
  peladaId: string;
  userId?: string | null;
  tipo: string;
  sujeito?: string | null;
  alteracoes?: { campo: string; de: string | null; para: string | null }[] | null;
}

export class AuditEntryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(params: CreateParams): Promise<void> {
    await this.prisma.auditEntry.create({
      data: {
        peladaId: params.peladaId,
        userId: params.userId ?? null,
        tipo: params.tipo,
        sujeito: params.sujeito ?? null,
        alteracoes: params.alteracoes ?? undefined,
      },
    });
  }

  async findByPelada(peladaId: string, tipos?: string[]) {
    return this.prisma.auditEntry.findMany({
      where: {
        peladaId,
        ...(tipos?.length ? { tipo: { in: tipos } } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  }
}
