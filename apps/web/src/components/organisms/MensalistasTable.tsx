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
  onAbonar,
  onRemoverAbono,
}: {
  mensalistas: MonthlyReportDTO["mensalistas"];
  competencia: string;
  onAbonar?: (payer: { id: string; nome: string }) => void;
  onRemoverAbono?: (payerId: string) => void;
}) {
  const { token } = useAuth();
  const { current } = usePelada();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (mensalistas.length === 0) {
    return <p className="text-sm text-muted">{ptBR.painel.semDados}</p>;
  }

  const scoreOf = (m: MonthlyReportDTO["mensalistas"][number]) => (m.pago ? 2 : m.abonado ? 1 : 0);
  const ordenados = [...mensalistas].sort((a, b) => scoreOf(b) - scoreOf(a));

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
                <div className="flex flex-wrap items-center gap-1">
                  {m.pago ? (
                    <Badge variant="ok">{ptBR.situacao.pago}</Badge>
                  ) : m.abonado ? (
                    <Badge variant="outro">{ptBR.situacao.abonado}</Badge>
                  ) : (
                    <Badge variant="due">{ptBR.situacao.emAberto}</Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {!m.pago && !m.abonado && (
                    <>
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
                      {onAbonar && (
                        <Button variant="ghost" size="sm" onClick={() => onAbonar({ id: m.id, nome: m.nome })}>
                          {ptBR.painel.abonarBtn}
                        </Button>
                      )}
                    </>
                  )}
                  {m.abonado && onRemoverAbono && (
                    <Button variant="ghost" size="sm" onClick={() => onRemoverAbono(m.id)}>
                      {ptBR.painel.removerAbono}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
