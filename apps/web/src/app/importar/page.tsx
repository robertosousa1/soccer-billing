"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, GitMerge, ChevronUp, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { addMonths, toTitle, ymOf } from "@pelada/core";
import { PageShell } from "@/components/templates/PageShell";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { Select } from "@/components/atoms/Select";
import { ImportModal } from "@/components/organisms/ImportModal";
import { ManualTransactionModal } from "@/components/organisms/ManualTransactionModal";
import { TransactionEditor } from "@/components/organisms/TransactionEditor";
import { MergePayersModal } from "@/components/organisms/MergePayersModal";
import { AbonoModal } from "@/components/organisms/AbonoModal";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { listTransactions, updateTransaction, deleteTransaction, type TransactionDTO } from "@/services/transactions";
import { getMonthlyReport, getCompetenciaRange, type MonthlyReportDTO } from "@/services/reports";
import { deleteAbono } from "@/services/payers";
import { ptBR, interpolate } from "@/i18n/pt-BR";
import { mesLabel } from "@/lib/competencia";

/** "YYYY-MM-DD" -> "DD/MM/YYYY", sem passar por Date (evita bug de fuso horário). */
function formatDataBR(data: string): string {
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}

export default function PagamentosPage() {
  const { token } = useAuth();
  const { current } = usePelada();
  const [competencia, setCompetencia] = useState(() => ymOf(new Date().toISOString()));
  const [range, setRange] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });
  const [report, setReport] = useState<MonthlyReportDTO | null>(null);
  const [payments, setPayments] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [motivoAberto, setMotivoAberto] = useState<{ nome: string; motivo: string } | null>(null);
  const [abonadosColapsados, setAbonadosColapsados] = useState(true);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);
  const [mergingPayerId, setMergingPayerId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "entrada" | "saida">("");
  const [filtroOrigem, setFiltroOrigem] = useState<"" | "IMPORTACAO" | "MANUAL">("");
  const [pagina, setPagina] = useState(1);
  const PAGE_SIZE = 15;

  function flashSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function reload() {
    if (!token || !current) return;
    setLoading(true);
    try {
      const [txs, rep] = await Promise.all([
        listTransactions(token, current.id),
        getMonthlyReport(token, current.id, competencia),
      ]);
      setPayments(txs);
      setReport(rep);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, current, competencia]);

  useEffect(() => {
    if (!token || !current) return;
    getCompetenciaRange(token, current.id).then(setRange);
  }, [token, current]);

  useEffect(() => {
    setPagina(1);
  }, [filtroNome, filtroTipo, filtroOrigem, competencia]);

  async function handleSave(data: {
    data?: string;
    valor?: number;
    competencia: string;
    outflowCategory?: "QUADRA" | "OUTRA_SAIDA";
    ignorada: boolean;
  }) {
    if (!token || !current || !editing) return;
    await updateTransaction(token, current.id, editing.id, data);
    await reload();
    setEditing(null);
    flashSuccess(ptBR.importar.pagamentoAtualizado);
  }

  async function handleDelete(id: string) {
    if (!token || !current) return;
    await deleteTransaction(token, current.id, id);
    await reload();
    setDeleting(null);
    flashSuccess(ptBR.importar.pagamentoExcluido);
  }

  const podeAvancar = range.max !== null && addMonths(competencia, 1) <= range.max;
  const podeVoltar = range.min !== null && addMonths(competencia, -1) >= range.min;

  const paymentsDaCompetencia = payments.filter((p) => p.competencia === competencia);
  const elegíveisParaAbono = report?.mensalistas.filter((m) => !m.pago && !m.abonado) ?? [];

  const paymentsFiltrados = paymentsDaCompetencia
    .filter((p) => !filtroNome || p.nomeOriginal.toLowerCase().includes(filtroNome.toLowerCase()))
    .filter((p) => !filtroTipo || (filtroTipo === "saida" ? p.isOutflow : !p.isOutflow))
    .filter((p) => !filtroOrigem || p.origem === filtroOrigem);

  const totalPaginas = Math.max(1, Math.ceil(paymentsFiltrados.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paymentsPagina = paymentsFiltrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);

  return (
    <PageShell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-muted">{ptBR.painel.mes}</label>
          <div className="flex items-center gap-1">
            <Input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              min={range.min ?? undefined}
              max={range.max ?? undefined}
              className="w-40"
            />
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="!px-1.5 !py-0.5"
                disabled={!podeAvancar}
                title={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, 1)) })}
                aria-label={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, 1)) })}
                onClick={() => setCompetencia(addMonths(competencia, 1))}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="!px-1.5 !py-0.5"
                disabled={!podeVoltar}
                title={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, -1)) })}
                aria-label={interpolate(ptBR.painel.irPara, { mes: mesLabel(addMonths(competencia, -1)) })}
                onClick={() => setCompetencia(addMonths(competencia, -1))}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={!report || elegíveisParaAbono.length === 0}
            title={report && elegíveisParaAbono.length === 0 ? ptBR.painel.semElegíveis : undefined}
            onClick={() => setShowAbonoModal(true)}
          >
            {ptBR.painel.concederAbono}
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowManualModal(true)}>
            {ptBR.importar.registrarBtn}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowImportModal(true)}>
            {ptBR.importar.importarBtn}
          </Button>
        </div>
      </div>

      {success && <div className="mb-4"><AlertBanner tone="ok">{success}</AlertBanner></div>}

      {loading && <p className="text-sm text-muted">Carregando...</p>}

      {!loading && report && (
        <div className="space-y-6">
          {/* Abonos da competência */}
          <section>
            <button
              className="mb-2 flex items-center gap-2 text-left"
              onClick={() => setAbonadosColapsados((v) => !v)}
            >
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform duration-300 ${abonadosColapsados ? "-rotate-90" : "rotate-0"}`}
              />
              <h2 className="font-display text-lg flex items-center gap-2">
                {ptBR.painel.abonados}
                {report.abonados.length > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-muted/20 px-2 py-0.5 text-xs font-semibold text-muted">
                    {report.abonados.length}
                  </span>
                )}
              </h2>
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${abonadosColapsados ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
              <div className="overflow-hidden">
                {report.abonados.length === 0 ? (
                  <p className="pb-1 pt-1 text-sm text-muted">{ptBR.painel.semAbonos}</p>
                ) : (
                  <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">{ptBR.pagantes.nome}</th>
                      <th className="px-4 py-3">Justificativa</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {report.abonados.map((a) => (
                      <tr key={a.id} className="border-b border-line last:border-0 hover:bg-chalk">
                        <td className="px-4 py-3 font-medium">{toTitle(a.nome)}</td>
                        <td className="max-w-[200px] px-4 py-3 text-sm text-muted">
                          <span className="block truncate">{a.motivo}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMotivoAberto({ nome: toTitle(a.nome), motivo: a.motivo })}
                            >
                              Ver Motivo
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await deleteAbono(token!, current!.id, a.id, competencia);
                                await reload();
                              }}
                            >
                              {ptBR.painel.removerAbono}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Transações da competência */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-display text-lg">{ptBR.importar.pagamentosTitulo}</h2>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar por nome..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  className="w-52"
                />
                <Select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as "" | "entrada" | "saida")}
                  className="w-auto"
                >
                  <option value="">Tipo: todos</option>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                </Select>
                <Select
                  value={filtroOrigem}
                  onChange={(e) => setFiltroOrigem(e.target.value as "" | "IMPORTACAO" | "MANUAL")}
                  className="w-auto"
                >
                  <option value="">Origem: todas</option>
                  <option value="IMPORTACAO">{ptBR.importar.origemImportacao}</option>
                  <option value="MANUAL">{ptBR.importar.origemManual}</option>
                </Select>
              </div>
            </div>

            {paymentsDaCompetencia.length === 0 ? (
              <p className="text-sm text-muted">{ptBR.importar.semPagamentos}</p>
            ) : paymentsFiltrados.length === 0 ? (
              <p className="text-sm text-muted">Nenhum pagamento encontrado com os filtros aplicados.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3">{ptBR.importar.origem}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsPagina.map((p) => (
                        <tr
                          key={p.id}
                          className={`border-b border-line last:border-0 hover:bg-chalk ${p.ignorada ? "opacity-50" : ""}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">{formatDataBR(p.data)}</td>
                          <td className="px-4 py-3">{toTitle(p.nomeOriginal)}</td>
                          <td className={`px-4 py-3 tabular font-semibold ${p.isOutflow ? "text-clay" : "text-pitch"}`}>
                            {p.valor}
                          </td>
                          <td className="px-4 py-3">
                            {p.isOutflow ? (
                              <Badge variant={p.outflowCategory === "QUADRA" ? "quadra" : "saida"}>
                                {p.outflowCategory === "QUADRA" ? "Pagamento da Quadra" : "Outro"}
                              </Badge>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {p.cotas.map((c, i) => (
                                  <span key={i} className="flex items-center gap-1 text-xs text-muted">
                                    {ptBR.importar.categoriaCota[c.categoria]}
                                    {c.payerNome ? ` · ${toTitle(c.payerNome)}` : ""}
                                    {c.payerId && (
                                      <button
                                        type="button"
                                        title={ptBR.pagantes.mesclarTitulo}
                                        aria-label={ptBR.pagantes.mesclarTitulo}
                                        onClick={() => setMergingPayerId(c.payerId)}
                                        className="text-muted hover:text-pitch"
                                      >
                                        <GitMerge className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={p.origem === "IMPORTACAO" ? "importacao" : "manual"}>
                              {p.origem === "IMPORTACAO" ? ptBR.importar.origemImportacao : ptBR.importar.origemManual}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="!px-2"
                                title={ptBR.importar.editarPagamento}
                                aria-label={ptBR.importar.editarPagamento}
                                onClick={() => setEditing(p)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="!px-2"
                                title={ptBR.importar.excluirPagamento}
                                aria-label={ptBR.importar.excluirPagamento}
                                onClick={() => setDeleting(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <div className="mt-3 flex items-center justify-between text-sm text-muted">
                    <span>
                      {((paginaAtual - 1) * PAGE_SIZE) + 1}–{Math.min(paginaAtual * PAGE_SIZE, paymentsFiltrados.length)} de {paymentsFiltrados.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        disabled={paginaAtual <= 1}
                        onClick={() => setPagina((p) => p - 1)}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-2 tabular">
                        {paginaAtual} / {totalPaginas}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!px-2"
                        disabled={paginaAtual >= totalPaginas}
                        onClick={() => setPagina((p) => p + 1)}
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImported={reload} />
      )}

      {showManualModal && (
        <ManualTransactionModal
          onClose={() => setShowManualModal(false)}
          onCreated={async () => {
            await reload();
            flashSuccess(ptBR.importar.pagamentoRegistrado);
          }}
        />
      )}

      {showAbonoModal && token && current && (
        <AbonoModal
          token={token}
          peladaId={current.id}
          payers={elegíveisParaAbono}
          competencia={competencia}
          onSuccess={async () => {
            setShowAbonoModal(false);
            await reload();
          }}
          onClose={() => setShowAbonoModal(false)}
        />
      )}

      {editing && (
        <TransactionEditor transaction={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}

      {mergingPayerId && token && current && (
        <MergePayersModal
          token={token}
          peladaId={current.id}
          initialPayerId={mergingPayerId}
          onMerged={reload}
          onClose={() => setMergingPayerId(null)}
        />
      )}

      {motivoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-card bg-card p-5 shadow-card">
            <h2 className="mb-1 font-display text-lg">{ptBR.painel.abonarTitulo}</h2>
            <p className="mb-3 text-sm font-medium">{motivoAberto.nome}</p>
            <p className="whitespace-pre-wrap text-sm text-muted">{motivoAberto.motivo}</p>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setMotivoAberto(null)}>
                {ptBR.pagantes.cancelar}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-card bg-card p-5 shadow-card">
            <h2 className="mb-2 font-display text-lg">{ptBR.importar.confirmarExclusaoPagamentoTitulo}</h2>
            <p className="mb-5 text-sm text-muted">
              {interpolate(ptBR.importar.confirmarExclusaoPagamentoTexto, { nome: toTitle(deleting.nomeOriginal) })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                {ptBR.pagantes.cancelar}
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleting.id)}>
                {ptBR.pagantes.excluir}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
