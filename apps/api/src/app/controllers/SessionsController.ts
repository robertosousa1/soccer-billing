import type { Request, Response } from "express";
import { prisma } from "../../database/client";
import { UsersRepository } from "../repositories/UsersRepository";
import { AuthenticateUserService } from "../services/AuthenticateUserService";

export class SessionsController {
  async create(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const service = new AuthenticateUserService(new UsersRepository(prisma));
    const result = await service.execute({ email, password });
    res.status(200).json(result);
  }
}
