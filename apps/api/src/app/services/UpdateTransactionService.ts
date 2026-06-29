import { naturalKey } from "@pelada/core";
import { AppError } from "../utils/AppError";
import type { TransactionsRepository } from "../repositories/TransactionsRepository";
import type { PayersRepository } from "../repositories/PayersRepository";

interface Request {
  peladaId: string;
  id: string;
  data?: string;
  valor?: number;
  competencia?: string;
  outflowCategory?: "QUADRA" | "OUTRA_SAIDA";
  ignorada?: boolean;
  userId: string;
}

export class UpdateTransactionService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly payersRepository: PayersRepository,
  ) {}

  async execute(req: Request) {
    const existing = await this.transactionsRepository.findById(req.peladaId, req.id);
    if (!existing) throw new AppError("Lançamento não encontrado", 404);

    const alterandoDataOuValor = req.data !== undefined || req.valor !== undefined;
    if (alterandoDataOuValor && existing.importId) {
      throw new AppError("Só é possível alterar data e valor de lançamentos manuais.", 400);
    }

    if (req.valor !== undefined && req.valor <= 0) {
      throw new AppError("Valor deve ser maior que zero.", 400);
    }

    const novaData = req.data ?? existing.data;
    const novoValorAssinado = req.valor === undefined ? existing.valor : existing.valor < 0 ? -req.valor : req.valor;

    const chaveNatural = alterandoDataOuValor
      ? naturalKey({ data: novaData, hora: existing.hora, nomeOriginal: existing.nomeOriginal, valor: novoValorAssinado })
      : undefined;

    try {
      const updated = await this.transactionsRepository.update(req.id, {
        data: req.data,
        valor: req.valor !== undefined ? novoValorAssinado : undefined,
        chaveNatural,
        competencia: req.competencia,
        outflowCategory: req.outflowCategory,
        ignorada: req.ignorada,
      });

      if (req.valor !== undefined && existing.shares[0]) {
        await this.transactionsRepository.updateShareValor(existing.shares[0].id, req.valor);
      }

      // competência é a verdade absoluta de quando o mensalista começou a pagar (DOMAIN.md) —
      // se ela mudou (ou o lançamento passou a ser ignorado), `desde` precisa acompanhar.
      if (req.competencia !== undefined || req.ignorada !== undefined) {
        const mensalidade = existing.shares.find((s) => s.categoria === "MENSALIDADE" && s.payerId);
        if (mensalidade?.payerId) await this.syncPayerDesde(req.peladaId, mensalidade.payerId, req.userId);
      }

      return updated;
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        throw new AppError("Já existe um lançamento idêntico (mesma data, hora, nome e valor).", 409);
      }
      throw err;
    }
  }

  private async syncPayerDesde(peladaId: string, payerId: string, userId: string): Promise<void> {
    const payer = await this.payersRepository.findById(peladaId, payerId);
    if (!payer || payer.tipo !== "MENSALISTA") return;
    const desde = await this.transactionsRepository.minMensalidadeCompetencia(payerId);
    if (desde !== payer.desde) {
      await this.payersRepository.update(payerId, { desde }, { userId, motivo: "Ajuste automático de lançamento" });
    }
  }
}
