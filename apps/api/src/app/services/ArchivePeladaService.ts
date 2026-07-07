import { AppError } from "../utils/AppError";
import type { PeladasRepository } from "../repositories/PeladasRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

export class ArchivePeladaService {
  constructor(
    private readonly peladasRepository: PeladasRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(peladaId: string, actorUserId: string, unarchive = false): Promise<void> {
    const pelada = await this.peladasRepository.findById(peladaId);
    if (!pelada) throw new AppError("Pelada não encontrada", 404);

    if (!unarchive && pelada.archivedAt) throw new AppError("Pelada já está arquivada", 409);
    if (unarchive && !pelada.archivedAt) throw new AppError("Pelada não está arquivada", 409);

    if (unarchive) {
      await this.peladasRepository.unarchive(peladaId);
    } else {
      await this.peladasRepository.archive(peladaId);
    }

    this.auditRepository.fire({
      peladaId,
      userId: actorUserId,
      tipo: unarchive ? "PELADA_DESARQUIVADA" : "PELADA_ARQUIVADA",
      sujeito: pelada.nome,
    });
  }
}
