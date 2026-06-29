"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, GitMerge } from "lucide-react";
import { toTitle } from "@pelada/core";
import { PageShell } from "@/components/templates/PageShell";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { ImportModal } from "@/components/organisms/ImportModal";
import { ManualTransactionModal } from "@/components/organisms/ManualTransactionModal";
import { TransactionEditor } from "@/components/organisms/TransactionEditor";
import { MergePayersModal } from "@/components/organisms/MergePayersModal";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { listTransactions, updateTransaction, deleteTransaction, type TransactionDTO } from "@/services/transactions";
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
  const [payments, setPayments] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);
  const [mergingPayerId, setMergingPayerId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function flashSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function reload() {
    if (!token || !current) return;
    setLoading(true);
    try {
      setPayments(await listTransactions(token, current.id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, current]);

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

  return (
    <PageShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl">{ptBR.importar.pagamentosTitulo}</h1>
        <div className="flex items-center gap-2">
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

      {!loading && payments.length === 0 && <p className="text-sm text-muted">{ptBR.importar.semPagamentos}</p>}

      {payments.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">{ptBR.importar.competencia}</th>
                <th className="px-4 py-3">{ptBR.importar.origem}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
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
                        {p.outflowCategory === "QUADRA" ? "Pagamento da Quadra" : "Saída"}
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
                  <td className="px-4 py-3">{mesLabel(p.competencia)}</td>
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
