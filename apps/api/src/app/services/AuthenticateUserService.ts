import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { AppError } from "../utils/AppError";
import { authConfig } from "../../config/auth";
import type { UsersRepository } from "../repositories/UsersRepository";

interface Request {
  email: string;
  password: string;
}

interface Response {
  token: string;
  user: { id: string; name: string; email: string };
}

export class AuthenticateUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ email, password }: Request): Promise<Response> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new AppError("E-mail ou senha incorretos", 401);

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new AppError("E-mail ou senha incorretos", 401);

    const signOptions: SignOptions = {
      subject: user.id,
      expiresIn: authConfig.expiresIn as SignOptions["expiresIn"],
    };
    const token = jwt.sign({}, authConfig.secret, signOptions);

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }
}
