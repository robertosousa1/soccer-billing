import type { MemberRole, PeladaMember } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { MembersRepository } from "../repositories/MembersRepository";

export class UpdateMemberRoleService {
  constructor(private readonly membersRepository: MembersRepository) {}

  async execute(peladaId: string, userId: string, role: MemberRole): Promise<PeladaMember> {
    const member = await this.membersRepository.findByPeladaAndUser(peladaId, userId);
    if (!member) throw new AppError("Membro não encontrado", 404);

    if (member.role === "OWNER" && role !== "OWNER") {
      const owners = await this.membersRepository.countOwners(peladaId);
      if (owners <= 1) throw new AppError("A pelada precisa ter ao menos um OWNER", 409);
    }

    return this.membersRepository.updateRole(member.id, role);
  }
}
