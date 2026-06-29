import { normalizeName } from "./name";
import type { Config, Payer, ShareCategory, OutflowCategory, Transaction } from "./types";
import type { ImportLineDraft, ImportShareDraft } from "./importDto";

/** nomeNormalizado -> payerId (canônico + apelidos). */
export function buildPayerIndex(payers: Payer[]): Record<string, string> {
  const idx: Record<string, string> = {};
  for (const p of payers) {
    idx[normalizeName(p.nome)] = p.id;
    for (const a of p.apelidos ?? []) idx[normalizeName(a)] = p.id;
  }
  return idx;
}

export function isCourt(nome: string, cfg: Config): boolean {
  return cfg.identificadoresQuadra.some((id) => {
    const n = normalizeName(nome),
      q = normalizeName(id);
    return q === n || (n.includes(q) && q.length > 4);
  });
}

export interface AutoCategoryResult {
  outflowCategory?: OutflowCategory;
  shareCategory?: ShareCategory; // para a cota única default
  payerId: string | null;
  novoPagante: boolean;
}

export function autoCategorize(
  t: Pick<Transaction, "nomeOriginal" | "valor">,
  cfg: Config,
  payerIndex: Record<string, string>,
  payersById: Map<string, Payer>,
): AutoCategoryResult {
  if (t.valor < 0) {
    return {
      outflowCategory: isCourt(t.nomeOriginal, cfg) ? "QUADRA" : "OUTRA_SAIDA",
      payerId: null,
      novoPagante: false,
    };
  }
  const payerId = payerIndex[normalizeName(t.nomeOriginal)] ?? null;
  const p = payerId ? payersById.get(payerId) : undefined;
  let shareCategory: ShareCategory;
  if (p) shareCategory = p.tipo === "MENSALISTA" ? "MENSALIDADE" : "AVULSO";
  else if (Math.abs(t.valor - cfg.valorMensalidade) < 1) shareCategory = "MENSALIDADE";
  else if (Math.abs(t.valor - cfg.valorAvulso) < 1) shareCategory = "AVULSO";
  else shareCategory = "MENSALIDADE"; // chute; usuário ajusta
  return { shareCategory, payerId, novoPagante: !payerId };
}

/** Sugere divisão quando o valor é múltiplo (>=2) da mensalidade ou do avulso. */
export function suggestSplit(
  valor: number,
  cfg: Config,
): { k: number; tipo: ShareCategory } | null {
  if (valor <= 0) return null;
  for (const [v, tipo] of [
    [cfg.valorMensalidade, "MENSALIDADE"],
    [cfg.valorAvulso, "AVULSO"],
  ] as const) {
    if (v > 0) {
      const k = valor / v;
      if (Math.abs(k - Math.round(k)) < 0.001 && Math.round(k) >= 2) return { k: Math.round(k), tipo };
    }
  }
  return null;
}

/** Cotas default ao abrir o divisor (regra do protótipo). nomePagador = quem mandou o Pix. */
export function defaultShares(
  valor: number,
  cfg: Config,
  nomePagador: string,
): Array<{ valor: number; categoria: ShareCategory; nome: string }> {
  const sug = suggestSplit(valor, cfg);
  if (sug) {
    const base = Math.floor(valor / sug.k);
    const resto = valor - base * sug.k;
    return Array.from({ length: sug.k }, (_, i) => ({
      valor: base + (i === 0 ? resto : 0),
      categoria: sug.tipo,
      // mensalidade: 2ª+ provavelmente é amigo (em branco); avulso: assume o pagador
      nome: i === 0 || sug.tipo === "AVULSO" ? nomePagador : "",
    }));
  }
  const meta = Math.floor(valor / 2);
  return [
    { valor: meta, categoria: "MENSALIDADE", nome: nomePagador },
    { valor: valor - meta, categoria: "MENSALIDADE", nome: "" },
  ];
}

/**
 * Cota de mensalidade sem nome nem pagante resolvido não pode ser confirmada: cairia, por
 * fallback, no nome de quem mandou o Pix e creditaria a mesma pessoa duas vezes na mesma
 * competência (DOMAIN.md §5). Recategorizar a cota como CONTRIBUICAO dispensa essa exigência.
 */
export function shareNeedsName(share: Pick<ImportShareDraft, "categoria" | "payerId" | "nome">): boolean {
  return share.categoria === "MENSALIDADE" && !share.payerId && !share.nome?.trim();
}

/** Verdadeiro quando a linha tem alguma cota de mensalidade pendente de nome (ver shareNeedsName). */
export function linhaNeedsSplitNames(linha: Pick<ImportLineDraft, "valor" | "shares">): boolean {
  if (linha.valor <= 0) return false;
  return (linha.shares ?? []).some(shareNeedsName);
}
