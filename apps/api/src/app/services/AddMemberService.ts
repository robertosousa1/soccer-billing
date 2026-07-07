import { randomUUID } from "crypto";
import type { MemberRole, PeladaMember } from "@prisma/client";
import { AppError } from "../utils/AppError";
import { sendInviteEmail } from "../../adapters/email";
import { env } from "../../config/env";
import type { MembersRepository } from "../repositories/MembersRepository";
import type { UsersRepository } from "../repositories/UsersRepository";
import type { UserInviteRepository } from "../repositories/UserInviteRepository";
import type { PeladasRepository } from "../repositories/PeladasRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

interface Request {
  peladaId: string;
  email: string;
  name: string;
  role: MemberRole;
  actorUserId?: string | null;
}

type Result =
  | { type: "added"; member: PeladaMember }
  | { type: "invited"; email: string; name: string };

const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  READER: "Leitor",
};

export class AddMemberService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly inviteRepository: UserInviteRepository,
    private readonly peladasRepository: PeladasRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute({ peladaId, email, name, role, actorUserId }: Request): Promise<Result> {
    const user = await this.usersRepository.findByEmail(email);

    if (user) {
      const existing = await this.membersRepository.findByPeladaAndUser(peladaId, user.id);
      if (existing) throw new AppError("Usuário já é membro desta pelada", 409);
      const member = await this.membersRepository.create({ peladaId, userId: user.id, role });
      this.auditRepository.fire({
        peladaId,
        userId: actorUserId ?? null,
        tipo: "MEMBRO_ADICIONADO",
        sujeito: user.name,
        alteracoes: [{ campo: "Perfil", de: null, para: ROLE_LABEL[role] }],
      });
      return { type: "added", member };
    }

    const pelada = await this.peladasRepository.findById(peladaId);
    if (!pelada) throw new AppError("Pelada não encontrada", 404);

    const token = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    await this.inviteRepository.create({
      email,
      name,
      peladaId,
      role,
      token,
      expiresAt,
      lastSentAt: now,
    });

    await sendInviteEmail({
      to: email,
      name,
      inviteUrl: `${env.appUrl}/convite?token=${token}`,
      peladaNome: pelada.nome,
      role,
    });

    this.auditRepository.fire({
      peladaId,
      userId: actorUserId ?? null,
      tipo: "CONVITE_ENVIADO",
      sujeito: email,
      alteracoes: [{ campo: "Nome", de: null, para: name }, { campo: "Perfil", de: null, para: ROLE_LABEL[role] }],
    });

    return { type: "invited", email, name };
  }
}
