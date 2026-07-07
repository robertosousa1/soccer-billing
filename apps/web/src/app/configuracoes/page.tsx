"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/templates/PageShell";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { FieldLabeled } from "@/components/molecules/FieldLabeled";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { getConfig, updateConfig } from "@/services/config";
import { ApiError } from "@/services/api";
import { ptBR } from "@/i18n/pt-BR";
import { Skeleton } from "@/components/atoms/Skeleton";

interface ConfigForm {
  valorMensalidade: string;
  valorAvulso: string;
  valorAluguel: string;
  diaPagamentoQuadra: string;
  identificadoresQuadra: string;
}

const EMPTY_FORM: ConfigForm = {
  valorMensalidade: "",
  valorAvulso: "",
  valorAluguel: "",
  diaPagamentoQuadra: "",
  identificadoresQuadra: "",
};

export default function ConfiguracoesPage() {
  const { token } = useAuth();
  const { current, reload } = usePelada();
  const router = useRouter();
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !current) return;
    getConfig(token, current.id)
      .then((c) => {
        setForm({
          valorMensalidade: c.valorMensalidade,
          valorAvulso: c.valorAvulso,
          valorAluguel: c.valorAluguel,
          diaPagamentoQuadra: String(c.diaPagamentoQuadra),
          identificadoresQuadra: c.identificadoresQuadra.join(", "),
        });
        setIsFirstSetup(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setForm(EMPTY_FORM);
          setIsFirstSetup(true);
          return;
        }
        throw err;
      });
  }, [token, current]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !current || !form) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateConfig(token, current.id, {
        valorMensalidade: form.valorMensalidade,
        valorAvulso: form.valorAvulso,
        valorAluguel: form.valorAluguel,
        diaPagamentoQuadra: Number(form.diaPagamentoQuadra),
        identificadoresQuadra: form.identificadoresQuadra
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (isFirstSetup) {
        await reload();
        router.push("/painel");
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ptBR.config.erroSalvar);
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <PageShell>
        <Skeleton className="mb-4 h-8 w-44" />
        <Skeleton className="h-12 max-w-md" />
        <div className="mt-5 max-w-md space-y-4 rounded-card border border-line bg-card p-5 shadow-card">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-10" />
            </div>
          ))}
          <Skeleton className="h-10 w-36" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="mb-4 font-display text-xl">{ptBR.config.titulo}</h1>

      <AlertBanner tone="warn">
        {isFirstSetup ? ptBR.config.avisoPrimeiraConfig : ptBR.config.avisoSnapshot}
      </AlertBanner>

      <form
        onSubmit={handleSubmit}
        className="mt-5 max-w-md space-y-4 rounded-card border border-line bg-card p-5 shadow-card"
      >
        <FieldLabeled label={ptBR.config.valorMensalidade}>
          <Input
            value={form.valorMensalidade}
            onChange={(e) => setForm({ ...form, valorMensalidade: e.target.value })}
            placeholder="R$ 0,00"
            required
          />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.valorAvulso}>
          <Input
            value={form.valorAvulso}
            onChange={(e) => setForm({ ...form, valorAvulso: e.target.value })}
            placeholder="R$ 0,00"
            required
          />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.valorAluguel}>
          <Input
            value={form.valorAluguel}
            onChange={(e) => setForm({ ...form, valorAluguel: e.target.value })}
            placeholder="R$ 0,00"
            required
          />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.diaPagamentoQuadra}>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.diaPagamentoQuadra}
            onChange={(e) => setForm({ ...form, diaPagamentoQuadra: e.target.value })}
            required
          />
        </FieldLabeled>
        <FieldLabeled label={ptBR.config.identificadoresQuadra}>
          <Input
            value={form.identificadoresQuadra}
            onChange={(e) => setForm({ ...form, identificadoresQuadra: e.target.value })}
            placeholder="separe por vírgula"
          />
        </FieldLabeled>

        {error && <p className="text-sm text-clay">{error}</p>}
        {saved && <p className="text-sm text-pitch">{ptBR.config.salvo}</p>}

        <Button type="submit" variant="primary" loading={saving}>
          {isFirstSetup ? ptBR.config.salvarPrimeiraConfig : ptBR.config.salvar}
        </Button>
      </form>

    </PageShell>
  );
}
