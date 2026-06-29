import type { PayerHistoryAction } from "@prisma/client";
import { formatDateBR } from "@pelada/core";
import type { PayerFieldChange } from "../utils/payerDiff";

type PayerHistoryEntryWithUser = {
  id: string;
  acao: PayerHistoryAction;
  motivo: string | null;
  alteracoes: unknown;
  createdAt: Date;
  user: { name: string } | null;
};

export class PayerHistoryMapper {
  static toDTO(entry: PayerHistoryEntryWithUser) {
    const createdAt = entry.createdAt;
    const hora = `${String(createdAt.getUTCHours()).padStart(2, "0")}:${String(createdAt.getUTCMinutes()).padStart(2, "0")}`;
    return {
      id: entry.id,
      acao: entry.acao,
      motivo: entry.motivo,
      alteracoes: entry.alteracoes as PayerFieldChange[],
      usuario: entry.user?.name ?? "Sistema",
      data: formatDateBR(createdAt),
      hora,
    };
  }
}
