import type { Request, Response } from "express";
import { prisma } from "../../database/client";
import { UsersRepository } from "../repositories/UsersRepository";
import { CreateUserService } from "../services/CreateUserService";

export class UsersController {
  async create(req: Request, res: Response): Promise<void> {
    const { name, email, password } = req.body;
    const service = new CreateUserService(new UsersRepository(prisma));
    const user = await service.execute({ name, email, password });
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  }
}
