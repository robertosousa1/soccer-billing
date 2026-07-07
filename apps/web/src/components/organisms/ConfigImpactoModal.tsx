"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { listCompetencias } from "@/services/config";

interface Props {
  token: string;
  peladaId: string;
  /** Chamado com os meses selecionados (vazio = apenas futuro). Responsável por salvar o config. */
  onSave: (competencias: string[]) => void;
  /** Aborta — não salva nada. */
  onClose: () => void;
}

function mesLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[Number(month) - 1]}/${year}`;
}

export function ConfigImpactoModal({ token, peladaId, onSave, onClose }: Props) {
  useEscapeKey(onClose);

  const [competencias, setCompetencias] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCompetencias(token, peladaId)
      .then((list) => {
        setCompetencias(list);
        setSelected(new Set(list));
      })
      .finally(() => setLoading(false));
  }, [token, peladaId]);

  function toggleAll() {
    if (selected.size === competencias.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(competencias));
    }
  }

  function toggle(ym: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });
  }

  const allSelected = competencias.length > 0 && selected.size === competencias.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-card bg-card shadow-card">
        {/* Header */}
        <div className="flex flex-none items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-lg">Impacto nos meses anteriores</h2>
            <p className="mt-0.5 text-sm text-muted">
              Alteração de aluguel ou dia de vencimento afeta o cálculo de meses já lançados.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-3 text-sm text-ink">
            Selecione quais meses devem usar a nova configuração:
          </p>

          {loading && (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          )}

          {!loading && competencias.length === 0 && (
            <p className="text-sm text-muted">Nenhum mês com lançamentos encontrado.</p>
          )}

          {!loading && competencias.length > 0 && (
            <>
              <button
                type="button"
                className="mb-3 text-xs font-medium text-pitch underline-offset-2 hover:underline"
                onClick={toggleAll}
              >
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </button>

              <div className="space-y-1">
                {competencias.map((ym) => (
                  <label
                    key={ym}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-chalk"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(ym)}
                      onChange={() => toggle(ym)}
                      className="h-4 w-4 rounded accent-pitch"
                    />
                    <span className="font-medium">{mesLabel(ym)}</span>
                    <span className="text-xs text-muted">{ym}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {error && <p className="mt-3 text-sm text-clay">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center justify-between border-t border-line px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => onSave([])} disabled={loading}>
              Apenas para o futuro
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSave([...selected])}
              disabled={loading || selected.size === 0}
            >
              {selected.size === 0
                ? "Nenhum mês selecionado"
                : `Aplicar a ${selected.size} ${selected.size === 1 ? "mês" : "meses"}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
