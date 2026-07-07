"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/templates/PageShell";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { FieldLabeled } from "@/components/molecules/FieldLabeled";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { getConfig, updateConfig, applyConfigSnapshots } from "@/services/config";
import { ConfigImpactoModal } from "@/components/organisms/ConfigImpactoModal";
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

type FormErrors = Partial<Record<keyof ConfigForm, string>>;

const EMPTY_FORM: ConfigForm = {
  valorMensalidade: "",
  valorAvulso: "",
  valorAluguel: "",
  diaPagamentoQuadra: "",
  identificadoresQuadra: "",
};

function isValidMoney(v: string): boolean {
  let s = v.replace(/r\$/i, "").replace(/\s/g, "").trim();
  if (!s) return false;
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(s) && parseFloat(s) > 0;
}

function validateForm(form: ConfigForm): FormErrors {
  const errors: FormErrors = {};
  const moneyFields = [
    { key: "valorMensalidade", label: "mensalidade" },
    { key: "valorAvulso", label: "avulso" },
    { key: "valorAluguel", label: "aluguel" },
  ] as const;
  for (const { key, label } of moneyFields) {
    if (!isValidMoney(form[key])) errors[key] = `Valor inválido para ${label} (ex.: 70,00)`;
  }
  const dia = Number(form.diaPagamentoQuadra);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    errors.diaPagamentoQuadra = "O dia deve ser um número inteiro entre 1 e 31";
  }
  return errors;
}

type ImpactoTipo = "importacao" | "historico";

const IMPACTO_CONFIG: Record<ImpactoTipo, { label: string; cor: string }> = {
  importacao: { label: "Só importações",  cor: "bg-slate-100 text-slate-600" },
  historico:  { label: "Altera histórico", cor: "bg-amber-100 text-amber-700" },
};

const CAMPO_IMPACTO: { campo: string; tipo: ImpactoTipo; descricao: string }[] = [
  {
    campo: "Mensalidade",
    tipo: "importacao",
    descricao:
      "Usado como valor padrão ao reconhecer pagamentos na importação. Meses já lançados não são recalculados.",
  },
  {
    campo: "Avulso",
    tipo: "importacao",
    descricao:
      "Valor padrão para avulsos na importação. Meses já lançados não são recalculados.",
  },
  {
    campo: "Aluguel da quadra",
    tipo: "historico",
    descricao:
      "Define se a quadra foi paga num mês. Ao salvar, você escolhe quais meses passados devem usar o novo valor.",
  },
  {
    campo: "Dia de pagamento",
    tipo: "historico",
    descricao:
      "Controla a antecipação: pagamentos antes deste dia migram para o mês anterior. Ao salvar, você escolhe quais meses aplicar.",
  },
  {
    campo: "Identificadores da quadra",
    tipo: "importacao",
    descricao:
      "Chaves Pix que identificam saídas de aluguel na importação. Não recalcula lançamentos anteriores.",
  },
];

export default function ConfiguracoesPage() {
  const { token } = useAuth();
  const { current, reload } = usePelada();
  const router = useRouter();
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [savedForm, setSavedForm] = useState<ConfigForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const hasErrors = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showImpacto, setShowImpacto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form || !hasErrors.current) return;
    const erros = validateForm(form);
    setFieldErrors(erros);
    if (Object.keys(erros).length === 0) hasErrors.current = false;
  }, [form]);

  useEffect(() => {
    if (!token || !current) return;
    getConfig(token, current.id)
      .then((c) => {
        const loaded: ConfigForm = {
          valorMensalidade: c.valorMensalidade,
          valorAvulso: c.valorAvulso,
          valorAluguel: c.valorAluguel,
          diaPagamentoQuadra: String(c.diaPagamentoQuadra),
          identificadoresQuadra: c.identificadoresQuadra.join(", "),
        };
        setForm(loaded);
        setSavedForm(loaded);
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

  async function doSave(competencias?: string[]) {
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
      if (competencias?.length) {
        await applyConfigSnapshots(token, current.id, competencias);
      }
      if (isFirstSetup) {
        await reload();
        router.push("/painel");
        return;
      }
      setSavedForm(form);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ptBR.config.erroSalvar);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !current || !form) return;
    const erros = validateForm(form);
    if (Object.keys(erros).length > 0) { hasErrors.current = true; setFieldErrors(erros); return; }
    setFieldErrors({});

    const impactouCalculo =
      !isFirstSetup &&
      savedForm !== null &&
      (form.valorAluguel !== savedForm.valorAluguel ||
        form.diaPagamentoQuadra !== savedForm.diaPagamentoQuadra);

    if (impactouCalculo) {
      setShowImpacto(true);
      return;
    }

    await doSave();
  }

  if (!form) {
    return (
      <PageShell>
        <div className="mb-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-1.5 h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4 rounded-card border border-line bg-card p-5 shadow-card">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-10" />
              </div>
            ))}
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-72 rounded-card" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="font-display text-xl">{ptBR.config.titulo}</h1>
        <p className="mt-1 text-sm text-muted">
          Parâmetros financeiros da pelada. Cada campo tem um alcance diferente ao ser alterado.
        </p>
      </div>

      {isFirstSetup && (
        <div className="mb-5">
          <AlertBanner tone="warn">{ptBR.config.avisoPrimeiraConfig}</AlertBanner>
        </div>
      )}

      {/* Layout duas colunas: formulário | legenda de impacto */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">

        {/* Coluna esquerda — formulário */}
        <form
          onSubmit={handleSubmit}
          className="rounded-card border border-line bg-card p-5 shadow-card"
        >
          {/* Seção: Pagamentos */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Pagamentos</p>
          <div className="space-y-4">
            <FieldLabeled label={ptBR.config.valorMensalidade}>
              <Input
                value={form.valorMensalidade}
                onChange={(e) => setForm({ ...form, valorMensalidade: e.target.value })}
                placeholder="R$ 0,00"
                required
              />
              {fieldErrors.valorMensalidade && (
                <p className="mt-1 text-xs text-clay">{fieldErrors.valorMensalidade}</p>
              )}
            </FieldLabeled>

            <FieldLabeled label={ptBR.config.valorAvulso}>
              <Input
                value={form.valorAvulso}
                onChange={(e) => setForm({ ...form, valorAvulso: e.target.value })}
                placeholder="R$ 0,00"
                required
              />
              {fieldErrors.valorAvulso && (
                <p className="mt-1 text-xs text-clay">{fieldErrors.valorAvulso}</p>
              )}
            </FieldLabeled>
          </div>

          <hr className="my-5 border-line" />

          {/* Seção: Quadra */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Quadra</p>
          <div className="space-y-4">
            <FieldLabeled label={ptBR.config.valorAluguel}>
              <Input
                value={form.valorAluguel}
                onChange={(e) => setForm({ ...form, valorAluguel: e.target.value })}
                placeholder="R$ 0,00"
                required
              />
              {fieldErrors.valorAluguel && (
                <p className="mt-1 text-xs text-clay">{fieldErrors.valorAluguel}</p>
              )}
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
              {fieldErrors.diaPagamentoQuadra && (
                <p className="mt-1 text-xs text-clay">{fieldErrors.diaPagamentoQuadra}</p>
              )}
            </FieldLabeled>

            <FieldLabeled label={ptBR.config.identificadoresQuadra}>
              <Input
                value={form.identificadoresQuadra}
                onChange={(e) => setForm({ ...form, identificadoresQuadra: e.target.value })}
                placeholder="separe por vírgula"
              />
            </FieldLabeled>
          </div>

          <hr className="my-5 border-line" />

          {/* Rodapé do formulário */}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" loading={saving}>
              {isFirstSetup ? ptBR.config.salvarPrimeiraConfig : ptBR.config.salvar}
            </Button>
            {saved && <p className="text-sm text-pitch">{ptBR.config.salvo}</p>}
            {error && <p className="text-sm text-clay">{error}</p>}
          </div>
        </form>

        {/* Coluna direita — legenda de impacto por campo */}
        <div className="rounded-card border border-line bg-card p-4 shadow-card">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Impacto ao alterar
          </h3>
          <div className="space-y-4">
            {CAMPO_IMPACTO.map(({ campo, tipo, descricao }) => {
              const { label, cor } = IMPACTO_CONFIG[tipo];
              return (
                <div key={campo} className="grid grid-cols-[9rem_1fr] items-start gap-2">
                  <span
                    className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${cor}`}
                  >
                    {label}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-ink">{campo}</p>
                    <p className="mt-0.5 text-xs text-muted leading-relaxed">{descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {showImpacto && token && current && (
        <ConfigImpactoModal
          token={token}
          peladaId={current.id}
          onSave={(competencias) => { setShowImpacto(false); doSave(competencias); }}
          onClose={() => setShowImpacto(false)}
        />
      )}
    </PageShell>
  );
}
