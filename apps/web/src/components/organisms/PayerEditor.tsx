"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { toTitle } from "@pelada/core";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { ptBR } from "@/i18n/pt-BR";
import { createAlias, deleteAlias, type PayerDTO, type PayerType } from "@/services/payers";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface PayerEditorProps {
  initial?: PayerDTO;
  onSave: (data: {
    nome: string;
    tipo: PayerType;
    ativo: boolean;
    telefone: string | null;
    desde: string | null;
    vigenteDesde?: string;
  }) => Promise<void>;
  onClose: () => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs font-medium text-muted">{children}</p>;
}

export function PayerEditor({ initial, onSave, onClose }: PayerEditorProps) {
  useEscapeKey(onClose);
  const { token } = useAuth();
  const { current } = usePelada();

  const [nome, setNome] = useState(initial ? toTitle(initial.nome) : "");
  const [tipo, setTipo] = useState<PayerType>(initial?.tipo ?? "MENSALISTA");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [desde, setDesde] = useState(initial?.desde ?? "");
  const [vigenteDesde, setVigenteDesde] = useState("");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  const [apelidos, setApelidos] = useState<{ id: string; alias: string }[]>(initial?.apelidos ?? []);
  const [adicionando, setAdicionando] = useState(false);
  const [novoApelido, setNovoApelido] = useState("");
  const [addingAlias, setAddingAlias] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [confirmarRemocao, setConfirmarRemocao] = useState<{ id: string; alias: string } | null>(null);
  const [removingAlias, setRemovingAlias] = useState(false);

  const tipoMudou = !!initial && tipo !== initial.tipo;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nome,
        tipo,
        ativo,
        telefone: telefone || null,
        desde: tipo === "MENSALISTA" ? desde || null : null,
        vigenteDesde: tipoMudou ? (tipo === "MENSALISTA" ? desde : vigenteDesde) || undefined : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAlias() {
    const trimmed = novoApelido.trim();
    if (!trimmed || !token || !current || !initial) return;
    setAddingAlias(true);
    setAliasError(null);
    try {
      const created = await createAlias(token, current.id, initial.id, trimmed);
      setApelidos((prev) => [...prev, created]);
      setNovoApelido("");
      setAdicionando(false);
    } catch {
      setAliasError("Apelido já existe ou inválido.");
    } finally {
      setAddingAlias(false);
    }
  }

  async function handleConfirmRemove() {
    if (!confirmarRemocao || !token || !current || !initial) return;
    setRemovingAlias(true);
    try {
      await deleteAlias(token, current.id, initial.id, confirmarRemocao.id);
      setApelidos((prev) => prev.filter((a) => a.id !== confirmarRemocao.id));
      setConfirmarRemocao(null);
    } catch {
      setConfirmarRemocao(null);
    } finally {
      setRemovingAlias(false);
    }
  }

  function handleAliasKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAddAlias(); }
    if (e.key === "Escape") { setAdicionando(false); setNovoApelido(""); setAliasError(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-card bg-card shadow-card">

        {/* Header */}
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-base">
            {initial ? ptBR.pagantes.editarTitulo : ptBR.pagantes.novo}
          </h2>
          {initial && (
            <p className="mt-0.5 text-sm text-muted">{toTitle(initial.nome)}</p>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-4 px-5 py-4">

          <div>
            <FieldLabel>{ptBR.pagantes.nome}</FieldLabel>
            <Input
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div>
            <FieldLabel>{ptBR.pagantes.tipo}</FieldLabel>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as PayerType)}>
              <option value="MENSALISTA">Mensalista</option>
              <option value="AVULSO">Avulso</option>
            </Select>
          </div>

          {tipo === "MENSALISTA" && (
            <div>
              <FieldLabel>{ptBR.pagantes.desde}</FieldLabel>
              <Input
                type="month"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                required={tipoMudou}
              />
            </div>
          )}

          {tipoMudou && tipo === "AVULSO" && (
            <div>
              <FieldLabel>{ptBR.pagantes.vigenteDesde}</FieldLabel>
              <Input
                type="month"
                value={vigenteDesde}
                onChange={(e) => setVigenteDesde(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <FieldLabel>{ptBR.pagantes.telefone}</FieldLabel>
            <Input
              placeholder={ptBR.pagantes.telefoneDica}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          {initial && (
            <>
              <div className="border-t border-line pt-4">
                <label className="flex cursor-pointer items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{ptBR.pagantes.ativo}</p>
                    <p className="text-xs text-muted">{ativo ? "Participa das peladas normalmente" : "Não aparece nos lançamentos"}</p>
                  </div>
                  <span
                    role="switch"
                    aria-checked={ativo}
                    onClick={() => setAtivo((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${ativo ? "bg-pitch" : "bg-muted/30"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${ativo ? "translate-x-4" : "translate-x-0.5"}`} />
                  </span>
                </label>
              </div>

              <div className="border-t border-line pt-4">
                <FieldLabel>{ptBR.pagantes.apelidos}</FieldLabel>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                  {apelidos.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-chalk px-2.5 py-1 text-xs text-ink"
                    >
                      {toTitle(a.alias)}
                      <button
                        type="button"
                        onClick={() => setConfirmarRemocao(a)}
                        aria-label={`Remover ${toTitle(a.alias)}`}
                        className="text-muted transition-colors hover:text-clay"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {adicionando && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-chalk px-2.5 py-1 text-xs ring-1 ring-muted/30">
                      <input
                        autoFocus
                        value={novoApelido}
                        onChange={(e) => { setNovoApelido(e.target.value); setAliasError(null); }}
                        onKeyDown={handleAliasKeyDown}
                        placeholder="apelido..."
                        className="w-24 bg-transparent text-xs text-ink outline-none placeholder:text-muted/50"
                      />
                      <button
                        type="button"
                        onClick={() => { setAdicionando(false); setNovoApelido(""); setAliasError(null); }}
                        aria-label="Cancelar"
                        className="text-muted transition-colors hover:text-clay"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}

                  {!adicionando && (
                    <button
                      type="button"
                      onClick={() => setAdicionando(true)}
                      aria-label="Adicionar apelido"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted/50 text-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {aliasError && <p className="mt-1.5 text-xs text-clay">{aliasError}</p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {ptBR.pagantes.cancelar}
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {ptBR.pagantes.salvar}
          </Button>
        </div>
      </form>

      {confirmarRemocao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-xs rounded-card bg-card p-5 shadow-card">
            <p className="mb-4 text-sm">
              Remover o apelido{" "}
              <span className="font-semibold">{toTitle(confirmarRemocao.alias)}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmarRemocao(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" size="sm" loading={removingAlias} onClick={handleConfirmRemove}>
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
