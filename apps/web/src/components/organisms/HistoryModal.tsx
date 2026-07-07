"use client";

import { Button } from "@/components/atoms/Button";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export interface HistoryEntry {
  id: string;
  data: string;
  hora: string;
  usuario: string;
  acao?: string;
  motivo?: string | null;
  alteracoes: { campo: string; de: string | null; para: string | null }[];
}

interface HistoryModalProps {
  title: string;
  subtitle: string;
  entries: HistoryEntry[];
  loading?: boolean;
  onClose: () => void;
}

const ACAO_LABEL: Record<string, string> = { CRIACAO: "Criação", EDICAO: "Edição" };

export function HistoryModal({ title, subtitle, entries, loading, onClose }: HistoryModalProps) {
  useEscapeKey(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-card bg-card shadow-card">
        <div className="flex flex-none items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-lg">Histórico de alterações</h2>
            <p className="mt-0.5 text-sm text-muted">{title} · <span className="font-medium text-ink">{subtitle}</span></p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-pitch" />
              Carregando...
            </div>
          )}

          {!loading && entries.length === 0 && (
            <p className="text-sm text-muted">Nenhuma alteração registrada.</p>
          )}

          {!loading && entries.length > 0 && (
            <ol className="space-y-4">
              {entries.map((entry) => (
                <li key={entry.id} className="relative border-l-2 border-line pl-4">
                  <div className="mb-1 flex items-center gap-2">
                    {entry.acao && (
                      <span className="rounded-full bg-chalk px-2 py-0.5 text-xs font-semibold text-muted">
                        {ACAO_LABEL[entry.acao] ?? entry.acao}
                      </span>
                    )}
                    <span className="text-xs text-muted">
                      {entry.data} às {entry.hora} · <span className="font-medium text-ink">{entry.usuario}</span>
                    </span>
                  </div>

                  {entry.motivo && (
                    <p className="mb-1.5 text-xs italic text-muted">{entry.motivo}</p>
                  )}

                  {entry.alteracoes.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted">
                          <th className="pb-1 pr-3 font-semibold uppercase tracking-wide">Campo</th>
                          <th className="pb-1 pr-3 font-semibold uppercase tracking-wide">De</th>
                          <th className="pb-1 font-semibold uppercase tracking-wide">Para</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.alteracoes.map((a, i) => (
                          <tr key={i} className="border-t border-line/50">
                            <td className="py-1 pr-3 font-medium">{a.campo}</td>
                            <td className="py-1 pr-3 text-clay">{a.de ?? <span className="italic text-muted">—</span>}</td>
                            <td className="py-1 text-pitch">{a.para ?? <span className="italic text-muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
