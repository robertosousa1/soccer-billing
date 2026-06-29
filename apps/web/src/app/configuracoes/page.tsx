"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageShell } from "@/components/templates/PageShell";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { FieldLabeled } from "@/components/molecules/FieldLabeled";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { getConfig, updateConfig, type ConfigDTO } from "@/services/config";
import { ptBR } from "@/i18n/pt-BR";

export default function ConfiguracoesPage() {
  const { token } = useAuth();
  const { current } = usePelada();
  const [config, setConfig] = useState<ConfigDTO | null>(null);
  const [identificadores, setIdentificadores] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token || !current) return;
    getConfig(token, current.id).then((c) => {
      setConfig(c);
      setIdentificadores(c.identificadoresQuadra.join(", "));
    });
  }, [token, current]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !current || !config) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateConfig(token, current.id, {
        valorMensalidade: config.valorMensalidade,
        valorAvulso: config.valorAvulso,
        valorAluguel: config.valorAluguel,
        diaPagamentoQuadra: config.diaPagamentoQuadra,
        identificadoresQuadra: identificadores
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setConfig(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <PageShell>
        <p className="text-sm text-muted">Carregando...</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="mb-4 font-display text-xl">{ptBR.config.titulo}</h1>

      <AlertBanner tone="warn">{ptBR.config.avisoSnapshot}</AlertBanner>

      <form onSubmit={handleSubmit} className="mt-5 max-w-md space-y-4 rounded-card border border-line bg-card p-5 shadow-card">
        <FieldLabeled label={ptBR.config.valorMensalidade}>
          <Input
            value={config.valorMensalidade}
            onChange={(e) => setConfig({ ...config, valorMensalidade: e.target.value })}
          />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.valorAvulso}>
          <Input value={config.valorAvulso} onChange={(e) => setConfig({ ...config, valorAvulso: e.target.value })} />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.valorAluguel}>
          <Input
            value={config.valorAluguel}
            onChange={(e) => setConfig({ ...config, valorAluguel: e.target.value })}
          />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.diaPagamentoQuadra}>
          <Input
            type="number"
            min={1}
            max={31}
            value={config.diaPagamentoQuadra}
            onChange={(e) => setConfig({ ...config, diaPagamentoQuadra: Number(e.target.value) })}
          />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.identificadoresQuadra}>
          <Input
            value={identificadores}
            onChange={(e) => setIdentificadores(e.target.value)}
            placeholder="separe por vírgula"
          />
        </FieldLabeled>

        {saved && <p className="text-sm text-pitch">{ptBR.config.salvo}</p>}

        <Button type="submit" variant="primary" loading={saving}>
          {ptBR.config.salvar}
        </Button>
      </form>
    </PageShell>
  );
}
