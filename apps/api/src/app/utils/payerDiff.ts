import type { PayerType } from "@prisma/client";

export interface DiffablePayer {
  nome: string;
  tipo: PayerType;
  ativo: boolean;
  desde: string | null;
  telefone: string | null;
}

export interface PayerFieldChange {
  campo: string;
  de: string | null;
  para: string | null;
}

const TIPO_LABEL: Record<PayerType, string> = { MENSALISTA: "Mensalista", AVULSO: "Avulso" };

function ativoLabel(ativo: boolean): string {
  return ativo ? "Ativo" : "Inativo";
}

/**
 * Diff campo a campo entre dois snapshots de pagante. `before = null` (criação) gera uma
 * entrada por campo com `de: null`. Campos iguais não entram na lista.
 */
export function buildPayerDiff(before: DiffablePayer | null, after: DiffablePayer): PayerFieldChange[] {
  const changes: PayerFieldChange[] = [];
  const push = (campo: string, de: string | null, para: string | null) => {
    if (de !== para) changes.push({ campo, de, para });
  };

  push("Nome", before?.nome ?? null, after.nome);
  push("Tipo", before ? TIPO_LABEL[before.tipo] : null, TIPO_LABEL[after.tipo]);
  push("Ativo", before ? ativoLabel(before.ativo) : null, ativoLabel(after.ativo));
  push("Mensalista desde", before?.desde ?? null, after.desde);
  push("Telefone", before?.telefone ?? null, after.telefone);

  return changes;
}
