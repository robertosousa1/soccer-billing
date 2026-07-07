import type { MemberRole, PeladaMember, PrismaClient } from "@prisma/client";

export class MembersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByPelada(peladaId: string) {
    return this.prisma.peladaMember.findMany({
      where: { peladaId, deletedAt: null, user: { deletedAt: null } },
      include: { user: true },
    });
  }

  findByPeladaAndUser(peladaId: string, userId: string): Promise<PeladaMember | null> {
    return this.prisma.peladaMember.findFirst({
      where: { peladaId, userId, deletedAt: null },
    });
  }

  async create(data: { peladaId: string; userId: string; role: MemberRole }): Promise<PeladaMember> {
    // restore soft-deleted record if it exists instead of creating a duplicate
    const existing = await this.prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId: data.peladaId, userId: data.userId } },
    });
    if (existing) {
      return this.prisma.peladaMember.update({
        where: { id: existing.id },
        data: { role: data.role, deletedAt: null },
      });
    }
    return this.prisma.peladaMember.create({ data });
  }

  updateRole(id: string, role: MemberRole): Promise<PeladaMember> {
    return this.prisma.peladaMember.update({ where: { id }, data: { role } });
  }

  softDelete(id: string): Promise<PeladaMember> {
    return this.prisma.peladaMember.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  countOwners(peladaId: string): Promise<number> {
    return this.prisma.peladaMember.count({ where: { peladaId, role: "OWNER", deletedAt: null } });
  }
}
