import type { Pelada, PrismaClient } from "@prisma/client";

export class PeladasRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<Pelada | null> {
    return this.prisma.pelada.findUnique({ where: { id } });
  }

  listForUser(userId: string) {
    return this.prisma.peladaMember.findMany({
      where: { userId },
      include: { pelada: { include: { config: true } } },
    });
  }

  update(id: string, data: { nome: string }): Promise<Pelada> {
    return this.prisma.pelada.update({ where: { id }, data });
  }

  delete(id: string): Promise<Pelada> {
    return this.prisma.pelada.delete({ where: { id } });
  }
}
