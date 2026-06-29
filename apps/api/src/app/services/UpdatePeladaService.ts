import type { Pelada } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { PeladasRepository } from "../repositories/PeladasRepository";

export class UpdatePeladaService {
  constructor(private readonly peladasRepository: PeladasRepository) {}

  async execute(peladaId: string, nome: string): Promise<Pelada> {
    const pelada = await this.peladasRepository.findById(peladaId);
    if (!pelada) throw new AppError("Pelada não encontrada", 404);
    return this.peladasRepository.update(peladaId, { nome });
  }
}
