"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { addMonths, formatBRL, shareNeedsName, toTitle, type ImportLineDraft, type ImportShareDraft } from "@pelada/core";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { SplitModal } from "@/components/organisms/SplitModal";
import { ptBR } from "@/i18n/pt-BR";
import { mesLabel } from "@/lib/competencia";

/** Intervalo de meses selecionáveis: do mais antigo ao mais recente do próprio lote, com 1 mês de folga pra cada lado. */
function buildMonthOptions(linhas: ImportLineDraft[]): string[] {
  const competencias = linhas.map((l) => l.competencia).filter(Boolean).sort();
  if (competencias.length === 0) return [];
  const min = addMonths(competencias[0]!, -1);
  const max = addMonths(competencias[competencias.length - 1]!, 1);
  const out: string[] = [];
  for (let ym = min; ym <= max; ym = addMonths(ym, 1)) out.push(ym);
  return out;
}

interface ReconciliationTableProps {
  linhas: ImportLineDraft[];
  onChange: (linhas: ImportLineDraft[]) => void;
  valorAvulso: number;
  valorMensalidade: number;
}

/** "Dividir" só faz sentido pra valor fora do padrão de 1 avulso/1 mensalidade: entre os dois (ambíguo) ou acima da mensalidade (pode ser múltiplo/combinação). */
function podeDividir(valor: number, valorAvulso: number, valorMensalidade: number): boolean {
  return (valor > valorAvulso && valor < valorMensalidade) || valor > valorMensalidade;
}

export function ReconciliationTable({ linhas, onChange, valorAvulso, valorMensalidade }: ReconciliationTableProps) {
  const [splitIndex, setSplitIndex] = useState<number | null>(null);
  const monthOptions = useMemo(() => buildMonthOptions(linhas), [linhas]);

  function updateLine(index: number, patch: Partial<ImportLineDraft>) {
    onChange(linhas.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function updateShareCategoria(lineIndex: number, shareIndex: number, categoria: ImportShareDraft["categoria"]) {
    const linha = linhas[lineIndex];
    if (!linha) return;
    const shares = (linha.shares ?? []).map((s, i) => (i === shareIndex ? { ...s, categoria } : s));
    updateLine(lineIndex, { shares });
  }

  function updateShareTelefone(lineIndex: number, shareIndex: number, telefone: string) {
    const linha = linhas[lineIndex];
    if (!linha) return;
    const shares = (linha.shares ?? []).map((s, i) => (i === shareIndex ? { ...s, telefone: telefone || null } : s));
    updateLine(lineIndex, { shares });
  }

  /** Remove uma cota e soma o valor dela na 1ª cota restante (ex.: 2 avulsos -> volta a ser 1 pagamento, que pode ser recategorizado como contribuição). */
  function removeShare(lineIndex: number, shareIndex: number) {
    const linha = linhas[lineIndex];
    const shares = linha?.shares ?? [];
    const removida = shares[shareIndex];
    if (!linha || shares.length <= 1 || !removida) return;
    const restantes = shares
      .filter((_, i) => i !== shareIndex)
      .map((s, i) => (i === 0 ? { ...s, valor: s.valor + removida.valor } : s))
      .map((s, i) => ({ ...s, ordem: i }));
    updateLine(lineIndex, { shares: restantes });
  }

  function saveShares(index: number, shares: ImportShareDraft[]) {
    updateLine(index, { shares });
    setSplitIndex(null);
  }

  /** Novas primeiro; já importadas (bloqueadas) num bloco separado ao final. */
  const indicesNovas = linhas.reduce<number[]>((acc, l, i) => (l.duplicada ? acc : [...acc, i]), []);
  const indicesDuplicadas = linhas.reduce<number[]>((acc, l, i) => (l.duplicada ? [...acc, i] : acc), []);

  function renderRow(index: number) {
    const linha = linhas[index]!;
    const isOutflow = linha.valor < 0;
    const bloqueada = linha.duplicada;
    return (
      <tr
        key={linha.chaveNatural}
        className={`border-b border-line last:border-0 hover:bg-chalk ${bloqueada || linha.ignorada ? "opacity-50" : ""}`}
      >
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={!bloqueada && !linha.ignorada}
            disabled={bloqueada}
            onChange={(e) => updateLine(index, { ignorada: !e.target.checked })}
          />
        </td>
        <td className="px-3 py-2 whitespace-nowrap">{linha.data}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {toTitle(linha.nomeOriginal)}
            {linha.novoPagante && <Badge variant="novo">novo</Badge>}
            {bloqueada && <Badge variant="outro">duplicada</Badge>}
          </div>
        </td>
        <td className={`px-3 py-2 tabular font-semibold ${isOutflow ? "text-clay" : "text-pitch"}`}>
          {formatBRL(linha.valor)}
        </td>
        <td className="px-3 py-2">
          {isOutflow ? (
            <Select
              value={linha.outflowCategory ?? "OUTRA_SAIDA"}
              className="w-36"
              disabled={bloqueada}
              onChange={(e) =>
                updateLine(index, { outflowCategory: e.target.value as ImportLineDraft["outflowCategory"] })
              }
            >
              <option value="QUADRA">Pagamento da Quadra</option>
              <option value="OUTRA_SAIDA">Saída</option>
            </Select>
          ) : (
            <div className="flex flex-col gap-1">
              {(linha.shares ?? []).map((s, i) => {
                const isSplit = (linha.shares ?? []).length > 1;
                const faltaNome = shareNeedsName(s);
                return (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <Select
                        value={s.categoria}
                        className="w-36"
                        disabled={bloqueada}
                        onChange={(e) =>
                          updateShareCategoria(index, i, e.target.value as ImportShareDraft["categoria"])
                        }
                      >
                        <option value="MENSALIDADE">{ptBR.importar.categoriaCota.MENSALIDADE}</option>
                        <option value="AVULSO">{ptBR.importar.categoriaCota.AVULSO}</option>
                        <option value="CONTRIBUICAO">{ptBR.importar.categoriaCota.CONTRIBUICAO}</option>
                        <option value="OUTRO">{ptBR.importar.categoriaCota.OUTRO}</option>
                      </Select>
                      {!bloqueada && isSplit && i > 0 && (
                        <button
                          type="button"
                          aria-label="Remover cota e voltar a ser um único pagamento"
                          className="shrink-0 px-1 text-muted hover:text-clay"
                          onClick={() => removeShare(index, i)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {faltaNome && <span className="text-xs text-clay">{ptBR.importar.faltaNomeCota}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </td>
        <td className="px-3 py-2">
          {!isOutflow && (
            <div className="flex flex-col gap-1">
              {(linha.shares ?? []).map((s, i) => (
                <Input
                  key={i}
                  type="tel"
                  value={s.telefone ?? ""}
                  placeholder="(opcional)"
                  disabled={bloqueada}
                  onChange={(e) => updateShareTelefone(index, i, e.target.value)}
                />
              ))}
            </div>
          )}
        </td>
        <td className="px-3 py-2">
          <Select
            value={linha.competencia}
            className="w-32"
            disabled={bloqueada}
            onChange={(e) => updateLine(index, { competencia: e.target.value })}
          >
            {!monthOptions.includes(linha.competencia) && (
              <option value={linha.competencia}>{mesLabel(linha.competencia)}</option>
            )}
            {monthOptions.map((ym) => (
              <option key={ym} value={ym}>
                {mesLabel(ym)}
              </option>
            ))}
          </Select>
        </td>
        <td className="px-3 py-2 text-center">
          {!bloqueada && !isOutflow && podeDividir(linha.valor, valorAvulso, valorMensalidade) && (
            <Button
              variant="ghost"
              size="sm"
              className="!px-2"
              title={ptBR.importar.dividir}
              aria-label={ptBR.importar.dividir}
              onClick={() => setSplitIndex(index)}
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
        <table className="w-full text-sm">
          <colgroup>
            <col className="w-16" />
            <col className="w-28" />
            <col />
            <col className="w-28" />
            <col className="w-44" />
            <col className="w-36" />
            <col className="w-32" />
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3">Incluir</th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Nome no extrato</th>
              <th className="px-3 py-3">Valor</th>
              <th className="px-3 py-3">Categoria</th>
              <th className="px-3 py-3">{ptBR.importar.telefone}</th>
              <th className="px-3 py-3">Competência</th>
              <th className="px-3 py-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody>
            {indicesNovas.map(renderRow)}
            {indicesDuplicadas.length > 0 && (
              <tr>
                <td colSpan={8} className="border-b border-line bg-chalk px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {ptBR.importar.duplicadasAviso}
                </td>
              </tr>
            )}
            {indicesDuplicadas.map(renderRow)}
          </tbody>
        </table>
      </div>

      {splitIndex !== null && (
        <SplitModal
          linha={linhas[splitIndex]!}
          onClose={() => setSplitIndex(null)}
          onSave={(shares) => saveShares(splitIndex, shares)}
        />
      )}
    </>
  );
}
