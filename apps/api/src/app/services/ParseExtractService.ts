import * as XLSX from "xlsx";
import { normalizeDate, parseMoneyToCents, ymOf } from "@pelada/core";

export interface ParsedLine {
  data: string; // "YYYY-MM-DD"
  hora: string;
  nomeOriginal: string;
  valor: number; // centavos
  formaPagamento: string | null;
  competencia: string;
}

/** Normaliza removendo acentos/maiúsculas — igual ao protótipo, tolera ruído de BOM no início. */
function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Casa por inclusão (não igualdade exata) para sobreviver a prefixos de BOM corrompido na 1ª coluna. */
function pick(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const target = normalizeHeader(candidate);
    const key = keys.find((k) => normalizeHeader(k).includes(target));
    if (key) return row[key];
  }
  return undefined;
}

function resolveDate(raw: unknown): string {
  if (typeof raw === "number") {
    // serial do Excel (só ocorre em .xlsx real; CSV é tratado como texto puro)
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (!parsed) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }
  return normalizeDate(String(raw ?? ""));
}

/** Direção da transação pela coluna "tipo" — mais confiável que o sinal em "valor", que pode
 * vir com o caractere de "-" corrompido por encoding em extratos de alguns bancos. */
function signFromTipo(tipoRaw: unknown): 1 | -1 | null {
  const tipo = normalizeHeader(String(tipoRaw ?? ""));
  if (tipo.startsWith("pix enviado") || tipo.startsWith("enviado")) return -1;
  if (tipo.startsWith("pix recebido") || tipo.startsWith("recebido")) return 1;
  return null;
}

export class ParseExtractService {
  execute(buffer: Buffer): ParsedLine[] {
    const rows = this.parseRows(buffer);

    return rows
      .map((row) => {
        const data = resolveDate(pick(row, ["data"]));
        const hora = String(pick(row, ["hora"]) ?? "");
        const nomeOriginal = String(pick(row, ["origem / destino", "origem/destino", "origem", "destino"]) ?? "");
        const valorRaw = pick(row, ["valor"]);
        const sinal = signFromTipo(pick(row, ["tipo"]));
        const valorAbs = Math.abs(parseMoneyToCents(valorRaw as number | string));
        const valor = sinal === null ? parseMoneyToCents(valorRaw as number | string) : sinal * valorAbs;
        const formaPagamento = String(pick(row, ["forma de pagamento"]) ?? "") || null;
        return { data, hora, nomeOriginal, valor, formaPagamento, competencia: ymOf(data) };
      })
      .filter((line) => line.data && line.nomeOriginal && line.valor !== 0);
  }

  /** XLSX.read autodetecta zip (xlsx real) vs. CSV/texto pela assinatura do buffer; cobre
   * ambos os formatos com o mesmo parser RFC4180 (aspas, vírgula decimal dentro de aspas etc.).
   * `raw: true` evita que datas em texto de CSV ("2026-06-08") sejam reinterpretadas como
   * serial do Excel via Date/UTC — isso introduzia um deslocamento de ±1 dia pelo fuso
   * horário local. Não afeta células numéricas/data genuínas de um .xlsx real, cujo tipo já
   * vem definido pelo próprio arquivo binário. */
  private parseRows(buffer: Buffer): Record<string, unknown>[] {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, raw: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
  }
}
