import type { MemberRole, PeladaMember } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { MembersRepository } from "../repositories/MembersRepository";
import type { UsersRepository } from "../repositories/UsersRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  READER: "Leitor",
};

export class UpdateMemberRoleService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(
    peladaId: string,
    userId: string,
    role: MemberRole,
    actorUserId: string | null,
  ): Promise<PeladaMember> {
    const member = await this.membersRepository.findByPeladaAndUser(peladaId, userId);
    if (!member) throw new AppError("Membro não encontrado", 404);

    if (member.role === "OWNER" && role !== "OWNER") {
      const owners = await this.membersRepository.countOwners(peladaId);
      if (owners <= 1) throw new AppError("A pelada precisa ter ao menos um OWNER", 409);
    }

    const updated = await this.membersRepository.updateRole(member.id, role);

    const user = await this.usersRepository.findById(userId);
    this.auditRepository.fire({
      peladaId,
      userId: actorUserId,
      tipo: "MEMBRO_PERFIL_ALTERADO",
      sujeito: user?.name ?? userId,
      alteracoes: [{ campo: "Perfil", de: ROLE_LABEL[member.role], para: ROLE_LABEL[role] }],
    });

    return updated;
  }
}
