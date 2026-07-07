import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError";
import type { PasswordResetRepository } from "../repositories/PasswordResetRepository";
import type { UsersRepository } from "../repositories/UsersRepository";

export class ResetPasswordService {
  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute({ token, password }: { token: string; password: string }): Promise<void> {
    const reset = await this.passwordResetRepository.findByToken(token);
    if (!reset) throw new AppError("Token inválido ou não encontrado", 404);
    if (reset.usedAt) throw new AppError("Este link já foi utilizado", 410);
    if (reset.expiresAt < new Date()) throw new AppError("Este link expirou", 410);

    const hashed = await bcrypt.hash(password, 8);
    await this.usersRepository.updatePassword(reset.userId, hashed);
    await this.passwordResetRepository.markUsed(reset.id);
  }
}
