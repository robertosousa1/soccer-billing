import type { PasswordReset, PrismaClient } from "@prisma/client";

export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: { userId: string; token: string; expiresAt: Date }): Promise<PasswordReset> {
    return this.prisma.passwordReset.create({ data });
  }

  findByToken(token: string): Promise<PasswordReset | null> {
    return this.prisma.passwordReset.findUnique({ where: { token } });
  }

  markUsed(id: string): Promise<void> {
    return this.prisma.passwordReset
      .update({ where: { id }, data: { usedAt: new Date() } })
      .then(() => undefined);
  }
}
