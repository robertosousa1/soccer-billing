import type { PayersRepository } from "../repositories/PayersRepository";

export class ListPayersService {
  constructor(private readonly payersRepository: PayersRepository) {}

  execute(peladaId: string) {
    return this.payersRepository.listByPelada(peladaId);
  }
}
