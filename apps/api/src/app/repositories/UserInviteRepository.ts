import type { MemberRole, PrismaClient, UserInvite } from "@prisma/client";

interface CreateParams {
  email: string;
  name: string;
  peladaId: string;
  role: MemberRole;
  token: string;
  expiresAt: Date;
  lastSentAt: Date;
}

export class UserInviteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateParams): Promise<UserInvite> {
    return this.prisma.userInvite.create({ data });
  }

  findByToken(token: string): Promise<UserInvite | null> {
    return this.prisma.userInvite.findUnique({ where: { token } });
  }

  findActiveByEmailAndPelada(email: string, peladaId: string): Promise<UserInvite | null> {
    return this.prisma.userInvite.findFirst({
      where: { email, peladaId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  findPendingByPelada(peladaId: string): Promise<UserInvite[]> {
    return this.prisma.userInvite.findMany({
      where: { peladaId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  markUsed(id: string): Promise<void> {
    return this.prisma.userInvite.update({
      where: { id },
      data: { usedAt: new Date() },
    }).then(() => undefined);
  }

  updateLastSentAt(id: string, expiresAt: Date): Promise<void> {
    return this.prisma.userInvite.update({
      where: { id },
      data: { lastSentAt: new Date(), expiresAt },
    }).then(() => undefined);
  }
}
