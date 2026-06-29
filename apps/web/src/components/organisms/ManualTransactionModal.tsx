"use client";

import { useEffect, useState, type FormEvent } from "react";
import { competenciaPadrao, formatBRL, parseMoneyToCents, toTitle } from "@pelada/core";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { ptBR } from "@/i18n/pt-BR";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { getConfig } from "@/services/config";
import { listPayers, type PayerDTO } from "@/services/payers";
import { createTransaction, type CreateTransactionInput } from "@/services/transactions";

type ShareCategoria = "MENSALIDADE" | "AVULSO" | "CONTRIBUICAO" | "OUTRO";
type OutflowCategory = "QUADRA" | "OUTRA_SAIDA";

interface ManualTransactionModalProps {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

/** Data local (não UTC) — toISOString() viraria o dia em fusos atrás de UTC (ex.: Brasil à noite). */
function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ManualTransactionModal({ onClose, onCreated }: ManualTransactionModalProps) {
  const { token } = useAuth();
  const { current } = usePelada();
  const [payers, setPayers] = useState<PayerDTO[]>([]);
  const [diaPagamentoQuadra, setDiaPagamentoQuadra] = useState(10);
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [data, setData] = useState(() => todayLocalISO());
  const [competencia, setCompetencia] = useState(() => todayLocalISO().slice(0, 7));
  const [valorTexto, setValorTexto] = useState("");
  const [payerId, setPayerId] = useState("");
  const [categoria, setCategoria] = useState<ShareCategoria>("MENSALIDADE");
  const [outflowCategory, setOutflowCategory] = useState<OutflowCategory>("QUADRA");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !current) return;
    listPayers(token, current.id).then((list) => {
      setPayers(list);
      setPayerId((prev) => prev || list[0]?.id || "");
    });
    getConfig(token, current.id).then((c) => setDiaPagamentoQuadra(c.diaPagamentoQuadra));
  }, [token, current]);

  function handleDataChange(value: string) {
    setData(value);
    if (value.length < 10) return;
    setCompetencia(tipo === "ENTRADA" ? competenciaPadrao(value, diaPagamentoQuadra) : value.slice(0, 7));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !current) return;
    setError(null);

    const valor = parseMoneyToCents(valorTexto);
    if (valor <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    if (tipo === "ENTRADA" && !payerId) {
      setError(ptBR.importar.semPagantesCadastrados);
      return;
    }

    const payload: CreateTransactionInput =
      tipo === "ENTRADA"
        ? { tipo, data, competencia, valor, payerId, categoria }
        : { tipo, data, competencia, valor, outflowCategory };

    setSaving(true);
    try {
      await createTransaction(token, current.id, payload);
      await onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-card bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-lg">{ptBR.importar.registrarTitulo}</h2>

        {error && (
          <div className="mb-3">
            <AlertBanner tone="error">{error}</AlertBanner>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted">
              {ptBR.importar.tipoLancamento}
            </label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as "ENTRADA" | "SAIDA")}>
              <option value="ENTRADA">{ptBR.importar.entrada}</option>
              <option value="SAIDA">{ptBR.importar.saida}</option>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-muted">Data</label>
              <Input type="date" value={data} onChange={(e) => handleDataChange(e.target.value)} required />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-muted">
                {ptBR.importar.competencia}
              </label>
              <Input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                required
              />
            </div>
          </div>

          {tipo === "ENTRADA" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted">
                  {ptBR.importar.pagante}
                </label>
                {payers.length === 0 ? (
                  <p className="text-sm text-muted">{ptBR.importar.semPagantesCadastrados}</p>
                ) : (
                  <Select value={payerId} onChange={(e) => setPayerId(e.target.value)} required>
                    {payers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {toTitle(p.nome)}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-muted">
                  {ptBR.importar.categoria}
                </label>
                <Select value={categoria} onChange={(e) => setCategoria(e.target.value as ShareCategoria)}>
                  <option value="MENSALIDADE">{ptBR.importar.categoriaCota.MENSALIDADE}</option>
                  <option value="AVULSO">{ptBR.importar.categoriaCota.AVULSO}</option>
                  <option value="CONTRIBUICAO">{ptBR.importar.categoriaCota.CONTRIBUICAO}</option>
                  <option value="OUTRO">{ptBR.importar.categoriaCota.OUTRO}</option>
                </Select>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted">
                {ptBR.importar.categoriaSaida}
              </label>
              <Select value={outflowCategory} onChange={(e) => setOutflowCategory(e.target.value as OutflowCategory)}>
                <option value="QUADRA">Pagamento da Quadra</option>
                <option value="OUTRA_SAIDA">{ptBR.importar.saida}</option>
              </Select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted">{ptBR.importar.valor}</label>
            <Input
              placeholder={formatBRL(0)}
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              onBlur={(e) => setValorTexto(formatBRL(parseMoneyToCents(e.target.value)))}
              required
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {ptBR.importar.cancelar}
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={tipo === "ENTRADA" && payers.length === 0}>
            {ptBR.pagantes.salvar}
          </Button>
        </div>
      </form>
    </div>
  );
}
