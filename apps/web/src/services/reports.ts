import { apiFetch } from "./api";

export interface MonthlyReportDTO {
  competencia: string;
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
  mensalistas: { id: string; nome: string; pago: boolean; telefone: string | null }[];
  avulsoCount: number;
  inadimplentes: { id: string; nome: string; telefone: string | null }[];
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
