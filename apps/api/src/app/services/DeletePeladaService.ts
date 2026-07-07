import type { PeladasRepository } from "../repositories/PeladasRepository";

export class DeletePeladaService {
  constructor(private readonly peladasRepository: PeladasRepository) {}

  async execute(peladaId: string): Promise<void> {
    await this.peladasRepository.softDelete(peladaId);
  }
}
