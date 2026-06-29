import { AppError } from "../utils/AppError";
import type { PayersRepository } from "../repositories/PayersRepository";

export class DeletePayerService {
  constructor(private readonly payersRepository: PayersRepository) {}

  async execute(peladaId: string, id: string): Promise<void> {
    const existing = await this.payersRepository.findById(peladaId, id);
    if (!existing) throw new AppError("Pagante não encontrado", 404);
    await this.payersRepository.delete(id);
  }
}
