"use client";

import { useState, type FormEvent } from "react";
import { toTitle } from "@pelada/core";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ptBR } from "@/i18n/pt-BR";
import { createAbono } from "@/services/payers";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface AbonoModalProps {
  token: string;
  peladaId: string;
  /** Jogador único já definido (fluxo direto). */
  payer?: { id: string; nome: string };
  /** Lista de jogadores elegíveis para escolha (fluxo com seletor). */
  payers?: { id: string; nome: string }[];
  competencia: string;
  onSuccess: () => Promise<void> | void;
  onClose: () => void;
}

export function AbonoModal({ token, peladaId, payer, payers, competencia, onSuccess, onClose }: AbonoModalProps) {
  useEscapeKey(onClose);
  const [selectedId, setSelectedId] = useState(payer?.id ?? "");
  const [competenciaLocal, setCompetenciaLocal] = useState(competencia);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPicker = !payer && payers !== undefined;
  const selectedPayer = payer ?? payers?.find((p) => p.id === selectedId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPayer) return;
    setSaving(true);
    setError(null);
    try {
      await createAbono(token, peladaId, selectedPayer.id, { competencia: competenciaLocal, motivo: motivo.trim() });
      await onSuccess();
    } catch {
      setError("Não foi possível registrar o abono. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-lg">{ptBR.painel.abonarTitulo}</h2>

        <label className="mb-1 block text-xs font-semibold uppercase text-muted">{ptBR.painel.mes}</label>
        <Input
          type="month"
          value={competenciaLocal}
          onChange={(e) => setCompetenciaLocal(e.target.value)}
          required
          className="mb-4 w-full"
        />

        {hasPicker ? (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold uppercase text-muted">
              {ptBR.painel.abonarJogador}
            </label>
            <select
              required
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-soft border border-line bg-white p-2 text-sm focus:outline-none focus:ring-1 focus:ring-pitch"
            >
              <option value="">{ptBR.painel.abonarEscolha}</option>
              {payers!.map((p) => (
                <option key={p.id} value={p.id}>
                  {toTitle(p.nome)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mb-4 text-sm font-medium">{toTitle(payer!.nome)}</p>
        )}

        <p className="mb-4 text-sm text-muted">{ptBR.painel.abonarTexto}</p>

        <label className="mb-1 block text-xs font-semibold uppercase text-muted">{ptBR.painel.abonarMotivo}</label>
        <textarea
          className="w-full rounded-soft border border-line bg-white p-2 text-sm focus:outline-none focus:ring-1 focus:ring-pitch"
          rows={3}
          required
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />

        {error && <p className="mt-2 text-sm text-clay">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {ptBR.pagantes.cancelar}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={!motivo.trim() || !competenciaLocal || (hasPicker && !selectedId)}
          >
            {ptBR.painel.abonarBtn}
          </Button>
        </div>
      </form>
    </div>
  );
}
