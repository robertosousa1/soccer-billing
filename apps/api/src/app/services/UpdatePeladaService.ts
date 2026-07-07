import type { Pelada } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { PeladasRepository } from "../repositories/PeladasRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

export class UpdatePeladaService {
  constructor(
    private readonly peladasRepository: PeladasRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(peladaId: string, nome: string, actorUserId: string | null): Promise<Pelada> {
    const pelada = await this.peladasRepository.findById(peladaId);
    if (!pelada) throw new AppError("Pelada não encontrada", 404);

    const updated = await this.peladasRepository.update(peladaId, { nome });

    if (pelada.nome !== nome) {
      this.auditRepository.fire({
        peladaId,
        userId: actorUserId,
        tipo: "PELADA_EDITADA",
        sujeito: nome,
        alteracoes: [{ campo: "Nome", de: pelada.nome, para: nome }],
      });
    }

    return updated;
  }
}
