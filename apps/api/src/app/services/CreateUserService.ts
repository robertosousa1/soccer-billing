import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { UsersRepository } from "../repositories/UsersRepository";

interface Request {
  name: string;
  email: string;
  password: string;
}

export class CreateUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ name, email, password }: Request): Promise<User> {
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) throw new AppError("E-mail já cadastrado", 409);

    const hashedPassword = await bcrypt.hash(password, 8);
    return this.usersRepository.create({ name, email, password: hashedPassword });
  }
}
