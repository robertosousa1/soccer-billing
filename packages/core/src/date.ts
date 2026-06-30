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

/**
 * Primeiro e último dia (calendário) de uma competência "YYYY-MM", como "YYYY-MM-DD".
 * Usa `new Date(ano, mes, 0)` (argumentos numéricos, não parsing de string) pra pegar o
 * último dia do mês sem cair no bug de fuso-horário do `new Date("YYYY-MM-DD")`.
 */
export function competenciaPeriodo(ym: string, dia: number = 1): { inicio: string; fim: string } {
  const parts = ym.split("-").map(Number);
  const y = parts[0] as number;
  const m = parts[1] as number;
  if (dia <= 1) {
    const inicio = `${ym}-01`;
    const ultimoDia = new Date(y, m, 0).getDate();
    const fim = `${ym}-${String(ultimoDia).padStart(2, "0")}`;
    return { inicio, fim };
  }
  // Ciclo começa no dia `dia` do mês anterior e termina no dia (dia-1) do mês atual.
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYm = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const inicio = `${prevYm}-${String(dia).padStart(2, "0")}`;
  const fim = `${ym}-${String(dia - 1).padStart(2, "0")}`;
  return { inicio, fim };
}
