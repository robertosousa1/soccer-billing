"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toTitle, normalizeName } from "@pelada/core";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Input } from "@/components/atoms/Input";
import { ptBR } from "@/i18n/pt-BR";
import { listPayers, mergePayers, type PayerDTO } from "@/services/payers";

interface MergePayersModalProps {
  token: string;
  peladaId: string;
  initialPayerId: string;
  onMerged: () => Promise<void> | void;
  onClose: () => void;
}

export function MergePayersModal({ token, peladaId, initialPayerId, onMerged, onClose }: MergePayersModalProps) {
  const [allPayers, setAllPayers] = useState<PayerDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([initialPayerId]);
  const [targetId, setTargetId] = useState(initialPayerId);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPayers(token, peladaId)
      .then(setAllPayers)
      .finally(() => setLoading(false));
  }, [token, peladaId]);

  const byId = useMemo(() => new Map(allPayers.map((p) => [p.id, p])), [allPayers]);
  const selected = selectedIds.map((id) => byId.get(id)).filter((p): p is PayerDTO => Boolean(p));

  const resultados = useMemo(() => {
    const termo = normalizeName(search);
    if (!termo) return [];
    return allPayers
      .filter((p) => !selectedIds.includes(p.id))
      .filter((p) => normalizeName(p.nome).includes(termo) || p.apelidos.some((a) => normalizeName(a).includes(termo)))
      .slice(0, 8);
  }, [allPayers, search, selectedIds]);

  function addPayer(id: string) {
    setSelectedIds((prev) => [...prev, id]);
    setSearch("");
  }

  function removePayer(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    if (id === targetId) {
      const next = selectedIds.find((x) => x !== id);
      if (next) setTargetId(next);
    }
  }

  async function handleConfirm() {
    const sourceIds = selectedIds.filter((id) => id !== targetId);
    setSaving(true);
    setError(null);
    try {
      await mergePayers(token, peladaId, targetId, sourceIds);
      await onMerged();
      onClose();
    } catch {
      setError("Não foi possível mesclar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-card bg-card p-5 shadow-card">
        <h2 className="mb-2 font-display text-lg">{ptBR.pagantes.mesclarTitulo}</h2>
        <p className="mb-4 text-sm text-muted">{ptBR.pagantes.mesclarTexto}</p>

        {loading && <p className="text-sm text-muted">Carregando...</p>}

        {!loading && (
          <>
            <div className="space-y-2">
              {selected.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-soft border border-line p-3 hover:bg-chalk"
                >
                  <input
                    type="radio"
                    name="merge-target"
                    checked={targetId === p.id}
                    onChange={() => setTargetId(p.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{toTitle(p.nome)}</span>
                      <Badge variant={p.tipo === "MENSALISTA" ? "mensal" : "avulso"}>
                        {p.tipo === "MENSALISTA" ? "Mensalista" : "Avulso"}
                      </Badge>
                    </div>
                    {p.apelidos.length > 0 && (
                      <p className="mt-1 text-xs text-muted">{p.apelidos.map(toTitle).join(", ")}</p>
                    )}
                  </div>
                  {targetId === p.id && (
                    <span className="text-xs font-semibold uppercase text-pitch">{ptBR.pagantes.mesclarDestino}</span>
                  )}
                  {selectedIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePayer(p.id)}
                      aria-label="Remover da mescla"
                      className="text-muted hover:text-clay"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3">
              <Input
                placeholder={ptBR.pagantes.mesclarBuscar}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {resultados.length > 0 && (
                <div className="mt-1 overflow-hidden rounded-soft border border-line">
                  {resultados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPayer(p.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-chalk"
                    >
                      <span>{toTitle(p.nome)}</span>
                      <Badge variant={p.tipo === "MENSALISTA" ? "mensal" : "avulso"}>
                        {p.tipo === "MENSALISTA" ? "Mensalista" : "Avulso"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm text-clay">{error}</p>}
        <p className="mt-4 text-xs text-clay">{ptBR.pagantes.mesclarAviso}</p>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {ptBR.importar.cancelar}
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={saving}
            disabled={selectedIds.length < 2}
            onClick={handleConfirm}
          >
            {ptBR.pagantes.mesclarConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
