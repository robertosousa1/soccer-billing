import type { Request, Response } from "express";
import { prisma } from "../../database/client";
import { UsersRepository } from "../repositories/UsersRepository";
import { AuthenticateUserService } from "../services/AuthenticateUserService";
import { verifyRecaptcha } from "../utils/verifyRecaptcha";

export class SessionsController {
  async create(req: Request, res: Response): Promise<void> {
    const { email, password, recaptchaToken } = req.body;
    await verifyRecaptcha(recaptchaToken);
    const service = new AuthenticateUserService(new UsersRepository(prisma));
    const result = await service.execute({ email, password });
    res.status(200).json(result);
  }
}
