import { apiFetch, ApiError } from "./api";

export interface MonthlyReportDTO {
  competencia: string;
  periodo: { inicio: string; fim: string };
  entrou: string;
  saiu: string;
  saldo: string;
  caixaInicial: string;
  caixaFinal: string;
  caixaVariacaoPct: number | null;
  quadra: {
    paga: boolean;
    total: string;
    pagamentos: { data: string; valor: string }[];
    diaPagamento: number | null;
    valorReferencia: string | null;
  };
  mensalistas: { id: string; nome: string; pago: boolean; abonado: boolean; telefone: string | null }[];
  avulsoCount: number;
  avulsos: { id: string; nome: string; telefone: string | null; vezes: number }[];
  inadimplentes: { id: string; nome: string; telefone: string | null }[];
  abonados: { id: string; nome: string; motivo: string }[];
  contribuicoes: { nome: string; valor: string }[];
}

export function getMonthlyReport(token: string, peladaId: string, competencia: string) {
  return apiFetch<MonthlyReportDTO>(`/peladas/${peladaId}/reports/${competencia}`, { token });
}

export function getCompetenciaRange(token: string, peladaId: string) {
  return apiFetch<{ min: string | null; max: string | null }>(
    `/peladas/${peladaId}/reports/competencia-range`,
    { token },
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** Baixa o PDF do resumo da competência. Faz fetch próprio (não usa apiFetch, que sempre espera JSON). */
export async function exportMonthlyReportPdf(token: string, peladaId: string, competencia: string): Promise<void> {
  const res = await fetch(`${API_URL}/peladas/${peladaId}/reports/${competencia}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message ?? "Erro inesperado", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resumo-${competencia}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
