import { AppError } from "../utils/AppError";
import type { MembersRepository } from "../repositories/MembersRepository";

export class RemoveMemberService {
  constructor(private readonly membersRepository: MembersRepository) {}

  async execute(peladaId: string, userId: string): Promise<void> {
    const member = await this.membersRepository.findByPeladaAndUser(peladaId, userId);
    if (!member) throw new AppError("Membro não encontrado", 404);

    if (member.role === "OWNER") {
      const owners = await this.membersRepository.countOwners(peladaId);
      if (owners <= 1) throw new AppError("A pelada precisa ter ao menos um OWNER", 409);
    }

    await this.membersRepository.delete(member.id);
  }
}
