import { AppError } from "../utils/AppError";
import type { UserInviteRepository } from "../repositories/UserInviteRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

export class CancelInviteService {
  constructor(
    private readonly inviteRepository: UserInviteRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(peladaId: string, inviteId: string, actorUserId: string | null): Promise<void> {
    const invite = await this.inviteRepository.findById(inviteId, peladaId);
    if (!invite) throw new AppError("Convite não encontrado", 404);
    if (invite.usedAt) throw new AppError("Convite já foi utilizado", 409);
    if (invite.cancelledAt) throw new AppError("Convite já foi cancelado", 409);

    await this.inviteRepository.cancel(invite.id);

    this.auditRepository.fire({
      peladaId,
      userId: actorUserId,
      tipo: "CONVITE_CANCELADO",
      sujeito: invite.email,
    });
  }
}
