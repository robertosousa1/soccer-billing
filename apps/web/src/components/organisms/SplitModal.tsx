"use client";

import { useEffect, useState } from "react";
import { formatBRL, parseMoneyToCents, toTitle, type ImportLineDraft, type ImportShareDraft } from "@pelada/core";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { PayerCombobox } from "@/components/molecules/PayerCombobox";
import { ptBR } from "@/i18n/pt-BR";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { listPayers, type PayerDTO } from "@/services/payers";

interface SplitModalProps {
  linha: ImportLineDraft;
  onClose: () => void;
  onSave: (shares: ImportShareDraft[]) => void;
}

export function SplitModal({ linha, onClose, onSave }: SplitModalProps) {
  const { token } = useAuth();
  const { current } = usePelada();
  const [shares, setShares] = useState<ImportShareDraft[]>(linha.shares ?? []);
  const [payers, setPayers] = useState<PayerDTO[]>([]);

  useEffect(() => {
    if (!token || !current) return;
    listPayers(token, current.id).then(setPayers);
  }, [token, current]);

  const total = shares.reduce((sum, s) => sum + s.valor, 0);
  const bate = total === linha.valor;

  function updateShare(index: number, patch: Partial<ImportShareDraft>) {
    setShares((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addShare() {
    setShares((prev) => [
      ...prev,
      { valor: 0, categoria: "OUTRO", ordem: prev.length, payerId: null, nome: "" },
    ]);
  }

  function removeShare(index: number) {
    setShares((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, ordem: i })));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">{ptBR.importar.dividir}</h2>
          <span className="tabular text-sm text-muted">{formatBRL(linha.valor)}</span>
        </div>

        <div className="space-y-3">
          {shares.map((share, index) => (
            <div key={index} className="flex items-end gap-2 rounded-card border border-line p-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-muted">Nome</label>
                <PayerCombobox
                  payers={payers}
                  value={{ payerId: share.payerId, nome: share.nome }}
                  placeholder={index === 0 ? toTitle(linha.nomeOriginal) : "Nome do amigo"}
                  onChange={({ payerId, nome }) => updateShare(index, { payerId, nome })}
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-semibold uppercase text-muted">Valor</label>
                <Input
                  defaultValue={formatBRL(share.valor)}
                  onBlur={(e) => updateShare(index, { valor: parseMoneyToCents(e.target.value) })}
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs font-semibold uppercase text-muted">Categoria</label>
                <Select
                  value={share.categoria}
                  onChange={(e) => updateShare(index, { categoria: e.target.value as ImportShareDraft["categoria"] })}
                >
                  <option value="MENSALIDADE">Mensalidade</option>
                  <option value="AVULSO">Avulso</option>
                  <option value="CONTRIBUICAO">Contribuição</option>
                  <option value="OUTRO">Outro</option>
                </Select>
              </div>
              {shares.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeShare(index)}>
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="mt-3" onClick={addShare}>
          + adicionar cota
        </Button>

        {!bate && (
          <p className="mt-3 text-sm text-clay">
            Soma das cotas ({formatBRL(total)}) precisa bater com o valor total ({formatBRL(linha.valor)}).
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {ptBR.importar.cancelar}
          </Button>
          <Button variant="primary" disabled={!bate} onClick={() => onSave(shares)}>
            {ptBR.pagantes.salvar}
          </Button>
        </div>
      </div>
    </div>
  );
}
