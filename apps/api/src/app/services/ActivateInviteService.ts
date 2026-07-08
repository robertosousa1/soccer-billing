import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError";
import { sendWelcomeEmail } from "../../adapters/email";
import type { UserInviteRepository } from "../repositories/UserInviteRepository";
import type { UsersRepository } from "../repositories/UsersRepository";
import type { MembersRepository } from "../repositories/MembersRepository";
import type { PeladasRepository } from "../repositories/PeladasRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  READER: "Leitor",
};

export class ActivateInviteService {
  constructor(
    private readonly inviteRepository: UserInviteRepository,
    private readonly usersRepository: UsersRepository,
    private readonly membersRepository: MembersRepository,
    private readonly peladasRepository: PeladasRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute({ token, password }: { token: string; password: string }): Promise<{ userId: string }> {
    const invite = await this.inviteRepository.findByToken(token);
    if (!invite) throw new AppError("Convite não encontrado", 404);

    if (invite.usedAt) throw new AppError("Convite já utilizado", 410);
    if (invite.expiresAt < new Date()) throw new AppError("Convite expirado", 410);

    const existing = await this.usersRepository.findByEmail(invite.email);
    if (existing) throw new AppError("Este e-mail já possui uma conta", 409);

    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await this.usersRepository.create({
      name: invite.name,
      email: invite.email,
      password: hashedPassword,
    });

    await this.membersRepository.create({
      peladaId: invite.peladaId,
      userId: user.id,
      role: invite.role,
    });

    await this.inviteRepository.markUsed(invite.id);

    const pelada = await this.peladasRepository.findById(invite.peladaId);
    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      peladaNome: pelada?.nome ?? "sua pelada",
    });

    this.auditRepository.fire({
      peladaId: invite.peladaId,
      userId: user.id,
      tipo: "CONVITE_ATIVADO",
      sujeito: `${user.name} <${user.email}>`,
      alteracoes: [{ campo: "Perfil", de: null, para: ROLE_LABEL[invite.role] ?? invite.role }],
    });

    return { userId: user.id };
  }
}
