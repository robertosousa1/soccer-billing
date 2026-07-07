import { formatDateBR } from "@pelada/core";
import type { TransactionFieldChange } from "../repositories/TransactionHistoryRepository";

type Entry = {
  id: string;
  alteracoes: unknown;
  createdAt: Date;
  user: { name: string } | null;
};

export class TransactionHistoryMapper {
  static toDTO(entry: Entry) {
    const createdAt = entry.createdAt;
    const hora = `${String(createdAt.getUTCHours()).padStart(2, "0")}:${String(createdAt.getUTCMinutes()).padStart(2, "0")}`;
    return {
      id: entry.id,
      alteracoes: entry.alteracoes as TransactionFieldChange[],
      usuario: entry.user?.name ?? "Sistema",
      data: formatDateBR(createdAt),
      hora,
    };
  }
}
