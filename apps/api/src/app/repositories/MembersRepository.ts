import type { MemberRole, PeladaMember, PrismaClient } from "@prisma/client";

export class MembersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByPelada(peladaId: string) {
    return this.prisma.peladaMember.findMany({
      where: { peladaId },
      include: { user: true },
    });
  }

  findByPeladaAndUser(peladaId: string, userId: string): Promise<PeladaMember | null> {
    return this.prisma.peladaMember.findUnique({ where: { peladaId_userId: { peladaId, userId } } });
  }

  create(data: { peladaId: string; userId: string; role: MemberRole }): Promise<PeladaMember> {
    return this.prisma.peladaMember.create({ data });
  }

  updateRole(id: string, role: MemberRole): Promise<PeladaMember> {
    return this.prisma.peladaMember.update({ where: { id }, data: { role } });
  }

  delete(id: string): Promise<PeladaMember> {
    return this.prisma.peladaMember.delete({ where: { id } });
  }

  countOwners(peladaId: string): Promise<number> {
    return this.prisma.peladaMember.count({ where: { peladaId, role: "OWNER" } });
  }
}
