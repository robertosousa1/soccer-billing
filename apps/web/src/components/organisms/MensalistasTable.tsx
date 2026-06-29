"use client";

import { useState } from "react";
import { toTitle } from "@pelada/core";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { ptBR } from "@/i18n/pt-BR";
import { getChargeMessage } from "@/services/payers";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import type { MonthlyReportDTO } from "@/services/reports";

export function MensalistasTable({
  mensalistas,
  competencia,
}: {
  mensalistas: MonthlyReportDTO["mensalistas"];
  competencia: string;
}) {
  const { token } = useAuth();
  const { current } = usePelada();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (mensalistas.length === 0) {
    return <p className="text-sm text-muted">{ptBR.painel.semDados}</p>;
  }

  const ordenados = [...mensalistas].sort((a, b) => Number(b.pago) - Number(a.pago));

  async function cobrar(payerId: string) {
    if (!token || !current) return;
    setLoadingId(payerId);
    try {
      const { link } = await getChargeMessage(token, current.id, payerId, competencia);
      window.open(link, "_blank");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">{ptBR.pagantes.nome}</th>
            <th className="px-4 py-3">{ptBR.painel.mensalistasPagaram}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {ordenados.map((m) => (
            <tr key={m.id} className="border-b border-line last:border-0 hover:bg-chalk">
              <td className="px-4 py-3">{toTitle(m.nome)}</td>
              <td className="px-4 py-3">
                {m.pago ? <Badge variant="ok">{ptBR.situacao.pago}</Badge> : <Badge variant="due">{ptBR.situacao.emAberto}</Badge>}
              </td>
              <td className="px-4 py-3 text-right">
                {!m.pago && (
                  <Button
                    variant="gold"
                    size="sm"
                    loading={loadingId === m.id}
                    disabled={!m.telefone}
                    title={!m.telefone ? "Sem WhatsApp cadastrado" : undefined}
                    onClick={() => cobrar(m.id)}
                  >
                    {ptBR.whatsapp.cobrar}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
