"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toTitle } from "@pelada/core";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { ptBR } from "@/i18n/pt-BR";
import { getPayerHistory, type PayerDTO, type PayerHistoryEntryDTO } from "@/services/payers";
import { mesLabel } from "@/lib/competencia";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const CAMPOS_COMPETENCIA = new Set(["Mensalista desde", "Vigência da troca de tipo"]);

function formatValue(campo: string, value: string | null): string {
  if (value === null) return ptBR.pagantes.vazio;
  if (CAMPOS_COMPETENCIA.has(campo)) return mesLabel(value);
  return value;
}

interface PayerHistoryModalProps {
  token: string;
  peladaId: string;
  payer: PayerDTO;
  onClose: () => void;
}

export function PayerHistoryModal({ token, peladaId, payer, onClose }: PayerHistoryModalProps) {
  useEscapeKey(onClose);
  const [entries, setEntries] = useState<PayerHistoryEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPayerHistory(token, peladaId, payer.id)
      .then(setEntries)
      .catch(() => setError("Não foi possível carregar o histórico."))
      .finally(() => setLoading(false));
  }, [token, peladaId, payer.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-card bg-card shadow-card" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="font-display text-lg">{ptBR.pagantes.historicoTitulo}</h2>
            <p className="text-sm text-muted">{toTitle(payer.nome)}</p>
          </div>
          <Button variant="ghost" size="sm" className="!px-2" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading && <p className="text-sm text-muted">Carregando...</p>}
          {error && <p className="text-sm text-clay">{error}</p>}

          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-muted">{ptBR.pagantes.historicoVazio}</p>
          )}

          {!loading && !error && entries.length > 0 && (
            <ol className="space-y-4">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-soft border border-line p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={entry.acao === "CRIACAO" ? "ok" : "novo"}>
                      {entry.acao === "CRIACAO" ? ptBR.pagantes.historicoCriacao : ptBR.pagantes.historicoEdicao}
                    </Badge>
                    <span className="text-xs text-muted">
                      {entry.data} {entry.hora}
                    </span>
                    <span className="text-xs font-medium">{entry.usuario}</span>
                  </div>

                  {entry.motivo && (
                    <p className="mb-2 text-xs italic text-muted">{entry.motivo}</p>
                  )}

                  {entry.alteracoes.length > 0 && (
                    <ul className="space-y-1">
                      {entry.alteracoes.map((alt, i) => (
                        <li key={i} className="text-xs">
                          <span className="font-medium">{alt.campo}:</span>{" "}
                          <span className="text-muted">{formatValue(alt.campo, alt.de)}</span>
                          {" → "}
                          <span>{formatValue(alt.campo, alt.para)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
