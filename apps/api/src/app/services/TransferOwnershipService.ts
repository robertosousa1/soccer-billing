import { AppError } from "../utils/AppError";
import type { MembersRepository } from "../repositories/MembersRepository";
import type { UsersRepository } from "../repositories/UsersRepository";
import type { PeladasRepository } from "../repositories/PeladasRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

export class TransferOwnershipService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly peladasRepository: PeladasRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(peladaId: string, currentOwnerId: string, newOwnerUserId: string): Promise<void> {
    if (currentOwnerId === newOwnerUserId) {
      throw new AppError("Você já é o proprietário desta pelada", 409);
    }

    const pelada = await this.peladasRepository.findById(peladaId);
    if (!pelada) throw new AppError("Pelada não encontrada", 404);

    const currentMember = await this.membersRepository.findByPeladaAndUser(peladaId, currentOwnerId);
    if (!currentMember || currentMember.role !== "OWNER") {
      throw new AppError("Apenas o proprietário pode transferir a pelada", 403);
    }

    const targetMember = await this.membersRepository.findByPeladaAndUser(peladaId, newOwnerUserId);
    if (!targetMember) throw new AppError("O novo proprietário precisa ser membro desta pelada", 404);

    // Promove o novo owner e rebaixa o atual para ADMIN atomicamente
    await Promise.all([
      this.membersRepository.updateRole(targetMember.id, "OWNER"),
      this.membersRepository.updateRole(currentMember.id, "ADMIN"),
    ]);

    const newOwner = await this.usersRepository.findById(newOwnerUserId);
    this.auditRepository.fire({
      peladaId,
      userId: currentOwnerId,
      tipo: "OWNERSHIP_TRANSFERIDA",
      sujeito: newOwner?.name ?? newOwnerUserId,
      alteracoes: [{ campo: "Proprietário", de: "Você", para: newOwner?.name ?? newOwnerUserId }],
    });
  }
}
