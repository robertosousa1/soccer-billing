import { randomUUID } from "crypto";
import { sendForgotPasswordEmail } from "../../adapters/email";
import { env } from "../../config/env";
import type { UsersRepository } from "../repositories/UsersRepository";
import type { PasswordResetRepository } from "../repositories/PasswordResetRepository";

export class ForgotPasswordService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
  ) {}

  async execute({ email }: { email: string }): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);
    // Sempre retorna sem erro para não revelar se o e-mail está cadastrado
    if (!user) return;

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.passwordResetRepository.create({ userId: user.id, token, expiresAt });

    await sendForgotPasswordEmail({
      to: user.email,
      name: user.name,
      resetUrl: `${env.appUrl}/redefinir-senha?token=${token}`,
    });
  }
}
