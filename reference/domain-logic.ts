/**
 * Caixa da Pelada — lógica de domínio (porte do protótipo validado).
 * Sem dependência de framework/ORM. Destino: packages/core/src/*.
 *
 * Dinheiro em CENTAVOS (inteiro). Datas: "YYYY-MM-DD"; competência: "YYYY-MM".
 *
 * Os cenários de teste no fim deste arquivo (comentados) foram validados no protótipo e
 * devem virar testes unitários do @pelada/core.
 */

// ----------------------------------------------------------------------------- tipos
export type PayerType = "MENSALISTA" | "AVULSO";
export type ShareCategory = "MENSALIDADE" | "AVULSO" | "OUTRO";
export type OutflowCategory = "QUADRA" | "OUTRA_SAIDA";

export interface Config {
  valorMensalidade: number; // centavos
  valorAvulso: number; // centavos
  valorAluguel: number; // centavos
  diaPagamentoQuadra: number;
  identificadoresQuadra: string[];
}

export interface Payer {
  id: string;
  nome: string;
  tipo: PayerType;
  ativo: boolean;
  desde?: string | null; // "YYYY-MM"
  telefone?: string | null;
  apelidos: string[];
}

export interface Share {
  valor: number; // centavos
  categoria: ShareCategory;
  payerId: string | null;
  ordem: number; // 0 = pagador real
}

export interface Transaction {
  id: string;
  data: string; // "YYYY-MM-DD"
  hora: string;
  nomeOriginal: string;
  valor: number; // centavos; <0 = saída
  formaPagamento?: string | null;
  competencia: string; // "YYYY-MM"
  chaveNatural: string;
  ignorada?: boolean;
  outflowCategory?: OutflowCategory | null; // saídas
  shares?: Share[]; // entradas
}

// ------------------------------------------------------------------------- nomes
export function normalizeName(s: string): string {
  return (s ?? "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function toTitle(s: string): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------------------------------------------------ dinheiro
/** Aceita number (em reais) ou string pt-BR/en e devolve CENTAVOS (inteiro). */
export function parseMoneyToCents(input: number | string): number {
  if (typeof input === "number") return Math.round(input * 100);
  let s = (input ?? "").toString().replace(/r\$/i, "").replace(/\s/g, "").trim();
  if (!s) return 0;
  const neg = s.startsWith("-");
  s = s.replace(/^-/, "");
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const cents = Math.round((parseFloat(s) || 0) * 100);
  return neg ? -cents : cents;
}

export function formatBRL(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return sign + "R$ " + (Math.abs(cents) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ----------------------------------------------------------------------------- datas
export function normalizeDate(s: string): string {
  s = (s ?? "").toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return ""; // serial do Excel: resolver no parser do extrato (XLSX.SSF)
}
export const ymOf = (data: string): string => (data ?? "").slice(0, 7);

// ------------------------------------------------------------------------- dedup
/** Chave natural: data | hora | nomeNormalizado | valorCentavos. */
export function naturalKey(t: Pick<Transaction, "data" | "hora" | "nomeOriginal" | "valor">): string {
  return `${t.data}|${t.hora}|${normalizeName(t.nomeOriginal)}|${t.valor}`;
}
/** Hash estável do conjunto de chaves (detecta arquivo idêntico). djb2. */
export function fileHash(naturalKeys: string[]): string {
  const str = [...naturalKeys].sort().join("§");
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ------------------------------------------------------------------ índice de pagantes
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
    const n = normalizeName(nome), q = normalizeName(id);
    return q === n || (n.includes(q) && q.length > 4);
  });
}

// ------------------------------------------------------------------- categorização
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
  payersById: Map<string, Payer>
): AutoCategoryResult {
  if (t.valor < 0) {
    return { outflowCategory: isCourt(t.nomeOriginal, cfg) ? "QUADRA" : "OUTRA_SAIDA", payerId: null, novoPagante: false };
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
export function suggestSplit(valor: number, cfg: Config): { k: number; tipo: ShareCategory } | null {
  if (valor <= 0) return null;
  for (const [v, tipo] of [[cfg.valorMensalidade, "MENSALIDADE"], [cfg.valorAvulso, "AVULSO"]] as const) {
    if (v > 0) {
      const k = valor / v;
      if (Math.abs(k - Math.round(k)) < 0.001 && Math.round(k) >= 2) return { k: Math.round(k), tipo };
    }
  }
  return null;
}

/** Cotas default ao abrir o divisor (regra do protótipo). nomePagador = quem mandou o Pix. */
export function defaultShares(valor: number, cfg: Config, nomePagador: string): Array<{ valor: number; categoria: ShareCategory; nome: string }> {
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

// ----------------------------------------------------------- relatório mensal
export interface MonthlyReport {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  totalQuadra: number;
  quadraPaga: boolean;
  mensalistasPagaram: Set<string>;
  avulsoCount: number;
  inadimplentes: Payer[];
}
/** cotas de uma entrada: usa shares se houver, senão sintetiza 1 cota. */
function sharesOf(t: Transaction): Share[] {
  if (t.valor <= 0) return [];
  if (t.shares && t.shares.length) return t.shares;
  return [{ valor: t.valor, categoria: "OUTRO", payerId: null, ordem: 0 }]; // fallback defensivo
}
export function computeReport(ym: string, transactions: Transaction[], payers: Payer[]): MonthlyReport {
  const tx = transactions.filter((t) => t.competencia === ym && !t.ignorada);
  const entradas = tx.filter((t) => t.valor > 0);
  const saidas = tx.filter((t) => t.valor < 0);
  const cotas = entradas.flatMap(sharesOf);
  const totalEntradas = entradas.reduce((s, t) => s + t.valor, 0);
  const totalSaidas = saidas.reduce((s, t) => s + Math.abs(t.valor), 0);
  const quadra = saidas.filter((t) => t.outflowCategory === "QUADRA");
  const totalQuadra = quadra.reduce((s, t) => s + Math.abs(t.valor), 0);
  const mensalistasPagaram = new Set(
    cotas.filter((c) => c.categoria === "MENSALIDADE" && c.payerId).map((c) => c.payerId as string)
  );
  const avulsoCount = cotas.filter((c) => c.categoria === "AVULSO").length;
  const inadimplentes = payers.filter(
    (p) => p.ativo && p.tipo === "MENSALISTA" && (!p.desde || p.desde <= ym) && !mensalistasPagaram.has(p.id)
  );
  return {
    totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas,
    totalQuadra, quadraPaga: quadra.length > 0,
    mensalistasPagaram, avulsoCount, inadimplentes,
  };
}
export function caixaAcumulado(ym: string, transactions: Transaction[], payers: Payer[]): number {
  const meses = [...new Set(transactions.map((t) => t.competencia))].sort();
  let acc = 0;
  for (const m of meses) { if (m > ym) break; const r = computeReport(m, transactions, payers); acc += r.saldo; }
  return acc;
}

// --------------------------------------------------- telefone / WhatsApp
export function telDigits(tel: string): string {
  let d = (tel ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length <= 11 && !d.startsWith("55")) d = "55" + d; // assume Brasil
  return d;
}

/**
 * ALGORITMO DE CONFIRMAÇÃO DA CONCILIAÇÃO (pseudo — implementar no service, com persistência).
 * Ver DOMAIN.md §5–§7 e §13. Pontos não-negociáveis:
 *  - manter um mapa novosPorNome: normalizeName(nome) -> payerId criado NESTE lote;
 *    reaproveitar para não duplicar pagante na mesma importação (bug #1).
 *  - ao reaproveitar mensalista, baixar `desde` para a MENOR competência vista (bug #2).
 *  - apelido do extrato (nomeOriginal) só é adicionado ao pagante da cota ordem=0
 *    (o pagador real). Cotas de amigos usam apenas o nome digitado para elas (bug #3).
 *  - gravar transação + cotas + import dentro de UMA transação de banco.
 */
