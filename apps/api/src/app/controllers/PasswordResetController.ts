import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../database/client";
import { UsersRepository } from "../repositories/UsersRepository";
import { PasswordResetRepository } from "../repositories/PasswordResetRepository";
import { ForgotPasswordService } from "../services/ForgotPasswordService";
import { ResetPasswordService } from "../services/ResetPasswordService";
import { verifyRecaptcha } from "../utils/verifyRecaptcha";

export class PasswordResetController {
  async forgot(req: Request, res: Response): Promise<void> {
    const { email, recaptchaToken } = z
      .object({ email: z.string().email(), recaptchaToken: z.string() })
      .parse(req.body);

    await verifyRecaptcha(recaptchaToken);

    const service = new ForgotPasswordService(
      new UsersRepository(prisma),
      new PasswordResetRepository(prisma),
    );
    await service.execute({ email });
    // Responde 200 independente de o e-mail existir
    res.status(200).json({ message: "Se este e-mail estiver cadastrado, você receberá as instruções em breve." });
  }

  async reset(req: Request, res: Response): Promise<void> {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(6) })
      .parse(req.body);

    const service = new ResetPasswordService(
      new PasswordResetRepository(prisma),
      new UsersRepository(prisma),
    );
    await service.execute({ token, password });
    res.status(200).json({ message: "Senha redefinida com sucesso." });
  }
}
