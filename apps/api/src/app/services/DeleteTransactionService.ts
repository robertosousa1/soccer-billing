import { AppError } from "../utils/AppError";
import type { TransactionsRepository } from "../repositories/TransactionsRepository";
import type { PayersRepository } from "../repositories/PayersRepository";
import type { AuditEntryRepository } from "../repositories/AuditEntryRepository";

export class DeleteTransactionService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly payersRepository: PayersRepository,
    private readonly auditRepository: AuditEntryRepository,
  ) {}

  async execute(peladaId: string, id: string, userId: string): Promise<void> {
    const existing = await this.transactionsRepository.findById(peladaId, id);
    if (!existing) throw new AppError("Lançamento não encontrado", 404);

    await this.transactionsRepository.softDelete(id);

    this.auditRepository.fire({
      peladaId,
      userId,
      tipo: "PAGAMENTO_EXCLUIDO",
      sujeito: existing.nomeOriginal,
      alteracoes: [
        { campo: "Data", de: existing.data, para: null },
        { campo: "Competência", de: existing.competencia, para: null },
        { campo: "Valor", de: String(existing.valor), para: null },
      ],
    });

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
