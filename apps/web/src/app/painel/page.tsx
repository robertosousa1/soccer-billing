"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { addMonths, ymOf } from "@pelada/core";
import { PageShell } from "@/components/templates/PageShell";
import { Scoreboard } from "@/components/organisms/Scoreboard";
import { Stat } from "@/components/atoms/Stat";
import { Button } from "@/components/atoms/Button";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { MensalistasTable } from "@/components/organisms/MensalistasTable";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { getMonthlyReport, getCompetenciaRange, type MonthlyReportDTO } from "@/services/reports";
import { ptBR, interpolate } from "@/i18n/pt-BR";
import { mesLabel } from "@/lib/competencia";

export default function PainelPage() {
  const { token } = useAuth();
  const { current } = usePelada();
  const [competencia, setCompetencia] = useState(() => ymOf(new Date().toISOString()));
  const [report, setReport] = useState<MonthlyReportDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });

  useEffect(() => {
    if (!token || !current) return;
    setLoading(true);
    getMonthlyReport(token, current.id, competencia)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [token, current, competencia]);

  useEffect(() => {
    if (!token || !current) return;
    getCompetenciaRange(token, current.id).then(setRange);
  }, [token, current]);

  const podeAvancar = range.max !== null && addMonths(competencia, 1) <= range.max;
  const podeVoltar = range.min !== null && addMonths(competencia, -1) >= range.min;

  return (
    <PageShell>
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-semibold text-muted">{ptBR.painel.mes}</label>
        <div className="flex items-center gap-1">
          <Input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            min={range.min ?? undefined}
            max={range.max ?? undefined}
            className="w-40"
          />
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="!px-1.5 !py-0.5"
              disabled={!podeAvancar}
              title={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, 1)) })}
              aria-label={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, 1)) })}
              onClick={() => setCompetencia(addMonths(competencia, 1))}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="!px-1.5 !py-0.5"
              disabled={!podeVoltar}
              title={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, -1)) })}
              aria-label={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, -1)) })}
              onClick={() => setCompetencia(addMonths(competencia, -1))}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Carregando...</p>}

      {report && !loading && (
        <div className="space-y-6">
          <Scoreboard entrou={report.entrou} saiu={report.saiu} saldo={report.saldo} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Mensalistas pagos"
              value={`${report.mensalistas.filter((m) => m.pago).length}/${report.mensalistas.length}`}
            />
            <Stat label={ptBR.painel.inadimplentes} value={report.inadimplentes.length} />
            <Stat label={ptBR.painel.avulsosNoMes} value={report.avulsoCount} />
            <Stat label={ptBR.painel.caixaInicial} value={report.caixaInicial} />
            <Stat
              label={ptBR.painel.caixaFinal}
              value={
                <span className="inline-flex items-baseline gap-2">
                  {report.caixaFinal}
                  {report.caixaVariacaoPct !== null && (
                    <span className={`text-xs font-semibold ${report.caixaVariacaoPct >= 0 ? "text-pitch" : "text-clay"}`}>
                      {report.caixaVariacaoPct >= 0 ? "+" : ""}
                      {report.caixaVariacaoPct.toFixed(0)}%
                    </span>
                  )}
                </span>
              }
            />
          </div>

          <AlertBanner tone={report.quadra.paga ? "ok" : "warn"}>
            {report.quadra.paga
              ? ptBR.painel.quadraPaga
              : interpolate(ptBR.painel.quadraEmAberto, {
                  dia: report.quadra.diaPagamento ?? "?",
                  valor: report.quadra.valorReferencia ?? "?",
                })}
          </AlertBanner>

          <section>
            <h2 className="mb-2 font-display text-lg">{ptBR.painel.mensalistasPagaram}</h2>
            <MensalistasTable mensalistas={report.mensalistas} competencia={competencia} />
          </section>
        </div>
      )}
    </PageShell>
  );
}
