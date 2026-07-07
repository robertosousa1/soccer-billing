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

  /** Fire-and-forget: não bloqueia a request; erros são logados mas não propagados. */
  fire(params: CreateParams): void {
    this.create(params).catch((err) => console.error("[audit]", err));
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
