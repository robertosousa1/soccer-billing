import { AppError } from "../utils/AppError";
import { sendInviteEmail } from "../../adapters/email";
import { env } from "../../config/env";
import type { UserInviteRepository } from "../repositories/UserInviteRepository";
import type { PeladasRepository } from "../repositories/PeladasRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

interface Request {
  peladaId: string;
  email: string;
  actorUserId?: string | null;
}

export class ResendInviteService {
  constructor(
    private readonly inviteRepository: UserInviteRepository,
    private readonly peladasRepository: PeladasRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute({ peladaId, email, actorUserId }: Request): Promise<void> {
    const invite = await this.inviteRepository.findActiveByEmailAndPelada(email, peladaId);
    if (!invite) throw new AppError("Convite não encontrado", 404);

    const cooldownMs = 60 * 1000;
    if (new Date().getTime() - invite.lastSentAt.getTime() < cooldownMs) {
      throw new AppError("Aguarde 1 minuto antes de reenviar o convite", 429);
    }

    const pelada = await this.peladasRepository.findById(peladaId);
    if (!pelada) throw new AppError("Pelada não encontrada", 404);

    await sendInviteEmail({
      to: invite.email,
      name: invite.name,
      inviteUrl: `${env.appUrl}/convite?token=${invite.token}`,
      peladaNome: pelada.nome,
      role: invite.role,
    });

    const newExpiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    await this.inviteRepository.updateLastSentAt(invite.id, newExpiresAt);

    this.auditRepository.fire({
      peladaId,
      userId: actorUserId ?? null,
      tipo: "CONVITE_REENVIADO",
      sujeito: invite.email,
    });
  }
}
