export function normalizeDate(s: string): string {
  s = (s ?? "").toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m as [string, string, string, string];
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return ""; // serial do Excel: resolver no parser do extrato (XLSX.SSF)
}

export const ymOf = (data: string): string => (data ?? "").slice(0, 7);

/**
 * Competência padrão de uma entrada: mês do pagamento, ou o mês seguinte se o dia do pagamento
 * for posterior a `diaCorte` (lido sempre da config — nunca um dia fixo no código, ver DOMAIN.md).
 * É só a sugestão inicial: continua editável por lançamento na conciliação/edição manual.
 */
export function competenciaPadrao(data: string, diaCorte: number): string {
  const dia = Number((data ?? "").slice(8, 10));
  const ym = ymOf(data);
  return dia > diaCorte ? addMonths(ym, 1) : ym;
}

/** Formata uma data (Date ou ISO string) como "DD/MM/AAAA" — usado em colunas de auditoria (ex.: "cadastrado em"). */
export function formatDateBR(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Soma (ou subtrai, com delta negativo) meses a uma competência "YYYY-MM". */
export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = (y as number) * 12 + ((m as number) - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (((total % 12) + 12) % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}
