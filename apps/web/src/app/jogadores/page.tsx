"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, GitMerge, History, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { toTitle } from "@pelada/core";
import { PageShell } from "@/components/templates/PageShell";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { PayerEditor } from "@/components/organisms/PayerEditor";
import { MergePayersModal } from "@/components/organisms/MergePayersModal";
import { PayerHistoryModal } from "@/components/organisms/PayerHistoryModal";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { createPayer, deletePayer, listPayers, updatePayer, type PayerDTO } from "@/services/payers";
import { ptBR, interpolate } from "@/i18n/pt-BR";
import { mesLabel } from "@/lib/competencia";
import { Skeleton } from "@/components/atoms/Skeleton";

function TruncatedName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setTruncated(el.scrollWidth > el.clientWidth);
  }, [name]);
  return (
    <span ref={ref} className="block truncate" title={truncated ? name : undefined}>
      {name}
    </span>
  );
}

export default function PagantesPage() {
  const { token } = useAuth();
  const { current } = usePelada();
  const [payers, setPayers] = useState<PayerDTO[]>([]);
  const [editing, setEditing] = useState<PayerDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<PayerDTO | null>(null);
  const [merging, setMerging] = useState<PayerDTO | null>(null);
  const [viewingHistory, setViewingHistory] = useState<PayerDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "MENSALISTA" | "AVULSO">("");
  const [filtroStatus, setFiltroStatus] = useState<"" | "ativo" | "inativo">("");
  const [pagina, setPagina] = useState(1);
  const [sortCol, setSortCol] = useState<"nome" | "tipo" | "telefone" | "cadastradoEm">("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const PAGE_SIZE = 15;

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
    setPagina(1);
  }

  async function reload() {
    if (!token || !current) return;
    setLoading(true);
    try {
      setPayers(await listPayers(token, current.id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, current]);

  useEffect(() => {
    setPagina(1);
  }, [filtroNome, filtroTipo, filtroStatus]);

  const semWhatsapp = payers.filter((p) => p.tipo === "MENSALISTA" && p.ativo && !p.telefone).length;

  const payersFiltrados = payers
    .filter((p) => !filtroNome || toTitle(p.nome).toLowerCase().includes(filtroNome.toLowerCase()))
    .filter((p) => !filtroTipo || p.tipo === filtroTipo)
    .filter((p) => !filtroStatus || (filtroStatus === "ativo" ? p.ativo : !p.ativo))
    .slice()
    .sort((a, b) => {
      let cmp = 0;
      if (sortCol === "nome") cmp = toTitle(a.nome).localeCompare(toTitle(b.nome), "pt-BR");
      else if (sortCol === "tipo") cmp = a.tipo.localeCompare(b.tipo);
      else if (sortCol === "telefone") cmp = (a.telefone ?? "").localeCompare(b.telefone ?? "", "pt-BR");
      else if (sortCol === "cadastradoEm") cmp = a.cadastradoEm.localeCompare(b.cadastradoEm);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPaginas = Math.max(1, Math.ceil(payersFiltrados.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const payersPagina = payersFiltrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);

  async function handleSave(data: {
    nome: string;
    tipo: PayerDTO["tipo"];
    ativo: boolean;
    telefone: string | null;
    desde: string | null;
    vigenteDesde?: string;
  }) {
    if (!token || !current) return;
    if (editing === "new") {
      await createPayer(token, current.id, data);
    } else if (editing) {
      await updatePayer(token, current.id, editing.id, data);
    }
    setEditing(null);
    await reload();
  }

  async function handleDelete(id: string) {
    if (!token || !current) return;
    await deletePayer(token, current.id, id);
    setDeleting(null);
    await reload();
  }

  return (
    <PageShell>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="font-display text-xl">{ptBR.pagantes.titulo}</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nome..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            className="w-52"
          />
          <Select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as "" | "MENSALISTA" | "AVULSO")}
            className="w-auto"
          >
            <option value="">Tipo: todos</option>
            <option value="MENSALISTA">Mensalista</option>
            <option value="AVULSO">Avulso</option>
          </Select>
          <Select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as "" | "ativo" | "inativo")}
            className="w-auto"
          >
            <option value="">Status: todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </Select>
          <Button variant="primary" size="sm" className="whitespace-nowrap" onClick={() => setEditing("new")}>
            {ptBR.pagantes.novo}
          </Button>
        </div>
      </div>

      {semWhatsapp > 0 && (
        <p className="mb-3 text-sm text-clay">{interpolate(ptBR.pagantes.semWhatsapp, { n: semWhatsapp })}</p>
      )}

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      )}

      {!loading && (<><div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-36" />
          </colgroup>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              {(["nome", "tipo", "telefone", "cadastradoEm"] as const).map((col) => (
                <th key={col} className="px-4 py-3 whitespace-nowrap">
                  <button
                    className="flex items-center gap-1 hover:text-ink"
                    onClick={() => toggleSort(col)}
                  >
                    {col === "nome" ? ptBR.pagantes.nome
                      : col === "tipo" ? ptBR.pagantes.tipo
                      : col === "telefone" ? ptBR.pagantes.telefone
                      : ptBR.pagantes.cadastradoEm}
                    {sortCol === col
                      ? sortDir === "asc"
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                      : <ChevronUp className="h-3 w-3 opacity-20" />}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {payersPagina.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-chalk">
                <td className="max-w-0 px-4 py-3"><TruncatedName name={toTitle(p.nome)} /></td>
                <td className="px-4 py-3">
                  <Badge variant={p.tipo === "MENSALISTA" ? "mensal" : "avulso"}>
                    {p.tipo === "MENSALISTA" ? "Mensalista" : "Avulso"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {p.telefone ?? <span className="text-clay">sem WhatsApp</span>}
                </td>
                <td className="px-4 py-3">{p.cadastradoEm}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-1.5"
                      title={ptBR.pagantes.historico}
                      aria-label={ptBR.pagantes.historico}
                      onClick={() => setViewingHistory(p)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-1.5"
                      title={ptBR.pagantes.mesclarTitulo}
                      aria-label={ptBR.pagantes.mesclarTitulo}
                      onClick={() => setMerging(p)}
                    >
                      <GitMerge className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-1.5"
                      title={ptBR.pagantes.editar}
                      aria-label={ptBR.pagantes.editar}
                      onClick={() => setEditing(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="!px-1.5"
                      title={ptBR.pagantes.excluir}
                      aria-label={ptBR.pagantes.excluir}
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
            {(paginaAtual - 1) * PAGE_SIZE + 1}–{Math.min(paginaAtual * PAGE_SIZE, payersFiltrados.length)} de {payersFiltrados.length}
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
            <span className="px-2 tabular">{paginaAtual} / {totalPaginas}</span>
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
      </>)}

      {editing && (
        <PayerEditor
          initial={editing === "new" ? undefined : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {merging && token && current && (
        <MergePayersModal
          token={token}
          peladaId={current.id}
          initialPayerId={merging.id}
          onMerged={reload}
          onClose={() => setMerging(null)}
        />
      )}

      {viewingHistory && token && current && (
        <PayerHistoryModal
          token={token}
          peladaId={current.id}
          payer={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-card bg-card p-5 shadow-card">
            <h2 className="mb-2 font-display text-lg">{ptBR.pagantes.confirmarExclusaoTitulo}</h2>
            <p className="mb-5 text-sm text-muted">
              {interpolate(ptBR.pagantes.confirmarExclusaoTexto, { nome: toTitle(deleting.nome) })}
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
