import { AppError } from "../utils/AppError";
import type { TransactionsRepository } from "../repositories/TransactionsRepository";
import type { PayersRepository } from "../repositories/PayersRepository";

export class DeleteTransactionService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly payersRepository: PayersRepository,
  ) {}

  async execute(peladaId: string, id: string, userId: string): Promise<void> {
    const existing = await this.transactionsRepository.findById(peladaId, id);
    if (!existing) throw new AppError("Lançamento não encontrado", 404);

    await this.transactionsRepository.delete(id);

    const mensalidade = existing.shares.find((s) => s.categoria === "MENSALIDADE" && s.payerId);
    if (mensalidade?.payerId) {
      const payer = await this.payersRepository.findById(peladaId, mensalidade.payerId);
      if (payer?.tipo === "MENSALISTA") {
        const desde = await this.transactionsRepository.minMensalidadeCompetencia(mensalidade.payerId);
        if (desde !== payer.desde) {
          await this.payersRepository.update(
            mensalidade.payerId,
            { desde },
            { userId, motivo: "Ajuste automático de lançamento" },
          );
        }
      }
    }
  }
}
