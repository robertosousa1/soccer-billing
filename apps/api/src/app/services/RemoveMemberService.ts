import { AppError } from "../utils/AppError";
import type { MembersRepository } from "../repositories/MembersRepository";
import type { UsersRepository } from "../repositories/UsersRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

export class RemoveMemberService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(peladaId: string, userId: string, actorUserId: string | null): Promise<void> {
    const member = await this.membersRepository.findByPeladaAndUser(peladaId, userId);
    if (!member) throw new AppError("Membro não encontrado", 404);

    if (member.role === "OWNER") {
      const owners = await this.membersRepository.countOwners(peladaId);
      if (owners <= 1) throw new AppError("A pelada precisa ter ao menos um OWNER", 409);
    }

    await this.membersRepository.softDelete(member.id);

    const user = await this.usersRepository.findById(userId);
    this.auditRepository.fire({
      peladaId,
      userId: actorUserId,
      tipo: "MEMBRO_REMOVIDO",
      sujeito: user ? `${user.name} <${user.email}>` : userId,
    });
  }
}
