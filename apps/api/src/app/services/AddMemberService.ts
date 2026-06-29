import type { MemberRole, PeladaMember } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { MembersRepository } from "../repositories/MembersRepository";
import type { UsersRepository } from "../repositories/UsersRepository";

interface Request {
  peladaId: string;
  email: string;
  role: MemberRole;
}

export class AddMemberService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute({ peladaId, email, role }: Request): Promise<PeladaMember> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new AppError("Usuário não encontrado para este e-mail", 404);

    const existing = await this.membersRepository.findByPeladaAndUser(peladaId, user.id);
    if (existing) throw new AppError("Usuário já é membro desta pelada", 409);

    return this.membersRepository.create({ peladaId, userId: user.id, role });
  }
}
