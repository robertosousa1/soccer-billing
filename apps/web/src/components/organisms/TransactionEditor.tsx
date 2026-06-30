"use client";

import { useState, type FormEvent } from "react";
import { formatBRL, parseMoneyToCents } from "@pelada/core";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { ptBR } from "@/i18n/pt-BR";
import type { TransactionDTO } from "@/services/transactions";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface TransactionEditorProps {
  transaction: TransactionDTO;
  onSave: (data: {
    data?: string;
    valor?: number;
    competencia: string;
    outflowCategory?: "QUADRA" | "OUTRA_SAIDA";
    ignorada: boolean;
  }) => Promise<void>;
  onClose: () => void;
}

export function TransactionEditor({ transaction, onSave, onClose }: TransactionEditorProps) {
  useEscapeKey(onClose);
  const isManual = transaction.origem === "MANUAL";
  const [data, setData] = useState(transaction.data);
  const [valorTexto, setValorTexto] = useState(formatBRL(Math.abs(parseMoneyToCents(transaction.valor))));
  const [competencia, setCompetencia] = useState(transaction.competencia);
  const [outflowCategory, setOutflowCategory] = useState<"QUADRA" | "OUTRA_SAIDA">(
    transaction.outflowCategory ?? "OUTRA_SAIDA",
  );
  const [ignorada, setIgnorada] = useState(transaction.ignorada);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let valor: number | undefined;
    if (isManual) {
      valor = parseMoneyToCents(valorTexto);
      if (valor <= 0) {
        setError("Informe um valor maior que zero.");
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        data: isManual ? data : undefined,
        valor,
        competencia,
        outflowCategory: transaction.isOutflow ? outflowCategory : undefined,
        ignorada,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-card bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-lg">{ptBR.importar.editarPagamento}</h2>

        {error && (
          <div className="mb-3">
            <AlertBanner tone="error">{error}</AlertBanner>
          </div>
        )}

        <div className="space-y-3">
          {transaction.isOutflow && (
            <Select
              value={outflowCategory}
              onChange={(e) => setOutflowCategory(e.target.value as "QUADRA" | "OUTRA_SAIDA")}
            >
              <option value="QUADRA">Pagamento da Quadra</option>
              <option value="OUTRA_SAIDA">Saída</option>
            </Select>
          )}
          {isManual && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-muted">Data</label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-muted">
                  {ptBR.importar.valor}
                </label>
                <Input
                  value={valorTexto}
                  onChange={(e) => setValorTexto(e.target.value)}
                  onBlur={(e) => setValorTexto(formatBRL(parseMoneyToCents(e.target.value)))}
                  required
                />
              </div>
            </div>
          )}
          <Input
            type="month"
            placeholder={ptBR.importar.competencia}
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={ignorada} onChange={(e) => setIgnorada(e.target.checked)} />
            {ptBR.importar.ignorarLancamento}
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {ptBR.importar.cancelar}
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {ptBR.pagantes.salvar}
          </Button>
        </div>
      </form>
    </div>
  );
}
