import { AppError } from "../utils/AppError";
import type { PayersRepository } from "../repositories/PayersRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

export class DeletePayerService {
  constructor(
    private readonly payersRepository: PayersRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(peladaId: string, id: string, actorUserId: string | null): Promise<void> {
    const existing = await this.payersRepository.findById(peladaId, id);
    if (!existing) throw new AppError("Pagante não encontrado", 404);
    await this.payersRepository.softDelete(id);
    this.auditRepository.fire({
      peladaId,
      userId: actorUserId,
      tipo: "JOGADOR_EXCLUIDO",
      sujeito: existing.nome,
    });
  }
}
