"use client";

import { useState, type FormEvent } from "react";
import { toTitle } from "@pelada/core";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { ptBR } from "@/i18n/pt-BR";
import type { PayerDTO, PayerType } from "@/services/payers";

interface PayerEditorProps {
  initial?: PayerDTO;
  onSave: (data: {
    nome: string;
    tipo: PayerType;
    telefone: string | null;
    desde: string | null;
    vigenteDesde?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function PayerEditor({ initial, onSave, onClose }: PayerEditorProps) {
  const [nome, setNome] = useState(initial ? toTitle(initial.nome) : "");
  const [tipo, setTipo] = useState<PayerType>(initial?.tipo ?? "MENSALISTA");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [desde, setDesde] = useState(initial?.desde ?? "");
  const [vigenteDesde, setVigenteDesde] = useState("");
  const [saving, setSaving] = useState(false);

  const tipoMudou = !!initial && tipo !== initial.tipo;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nome,
        tipo,
        telefone: telefone || null,
        desde: tipo === "MENSALISTA" ? desde || null : null,
        vigenteDesde: tipoMudou ? (tipo === "MENSALISTA" ? desde : vigenteDesde) || undefined : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-card bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-lg">{initial ? ptBR.pagantes.nome : ptBR.pagantes.novo}</h2>

        <div className="space-y-3">
          <Input placeholder={ptBR.pagantes.nome} value={nome} onChange={(e) => setNome(e.target.value)} required />
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as PayerType)}>
            <option value="MENSALISTA">Mensalista</option>
            <option value="AVULSO">Avulso</option>
          </Select>
          {tipo === "MENSALISTA" && (
            <Input
              type="month"
              placeholder={ptBR.pagantes.desde}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              required={tipoMudou}
            />
          )}
          {tipoMudou && tipo === "AVULSO" && (
            <Input
              type="month"
              placeholder={ptBR.pagantes.vigenteDesde}
              value={vigenteDesde}
              onChange={(e) => setVigenteDesde(e.target.value)}
              required
            />
          )}
          <Input
            placeholder={ptBR.pagantes.telefone}
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          {initial && initial.apelidos.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted">{ptBR.pagantes.apelidos}</p>
              <div className="flex flex-wrap gap-1">
                {initial.apelidos.map((a) => (
                  <span key={a} className="rounded-full bg-chalk px-2 py-0.5 text-xs text-muted">
                    {toTitle(a)}
                  </span>
                ))}
              </div>
            </div>
          )}
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
