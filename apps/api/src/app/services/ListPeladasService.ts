import type { PeladasRepository } from "../repositories/PeladasRepository";

export class ListPeladasService {
  constructor(private readonly peladasRepository: PeladasRepository) {}

  async execute(userId: string) {
    const memberships = await this.peladasRepository.listForUser(userId);
    return memberships.map((m) => ({
      id: m.pelada.id,
      nome: m.pelada.nome,
      role: m.role,
    }));
  }
}
