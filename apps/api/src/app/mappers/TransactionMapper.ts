import type { Payer, Share, Transaction } from "@prisma/client";
import { formatBRL } from "@pelada/core";

type TransactionWithShares = Transaction & { shares: (Share & { payer: Payer | null })[] };

export class TransactionMapper {
  static toDTO(transaction: TransactionWithShares) {
    return {
      id: transaction.id,
      data: transaction.data,
      hora: transaction.hora,
      nomeOriginal: transaction.nomeOriginal,
      valor: formatBRL(transaction.valor),
      isOutflow: transaction.valor < 0,
      outflowCategory: transaction.outflowCategory,
      competencia: transaction.competencia,
      ignorada: transaction.ignorada,
      origem: transaction.importId ? ("IMPORTACAO" as const) : ("MANUAL" as const),
      cotas: transaction.shares.map((s) => ({
        categoria: s.categoria,
        valor: formatBRL(s.valor),
        payerId: s.payer?.id ?? null,
        payerNome: s.payer?.nome ?? null,
      })),
    };
  }
}
