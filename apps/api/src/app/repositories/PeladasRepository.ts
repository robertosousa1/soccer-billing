import type { Pelada, PrismaClient } from "@prisma/client";

export class PeladasRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<Pelada | null> {
    return this.prisma.pelada.findFirst({ where: { id, deletedAt: null } });
  }

  listForUser(userId: string) {
    return this.prisma.peladaMember.findMany({
      where: { userId, deletedAt: null, pelada: { deletedAt: null } },
      include: { pelada: { include: { config: true } } },
    });
  }

  update(id: string, data: { nome: string }): Promise<Pelada> {
    return this.prisma.pelada.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Pelada> {
    return this.prisma.pelada.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
