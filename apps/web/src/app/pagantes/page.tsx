"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, GitMerge } from "lucide-react";
import { toTitle } from "@pelada/core";
import { PageShell } from "@/components/templates/PageShell";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { PayerEditor } from "@/components/organisms/PayerEditor";
import { MergePayersModal } from "@/components/organisms/MergePayersModal";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { createPayer, deletePayer, listPayers, updatePayer, type PayerDTO } from "@/services/payers";
import { ptBR, interpolate } from "@/i18n/pt-BR";
import { mesLabel } from "@/lib/competencia";

export default function PagantesPage() {
  const { token } = useAuth();
  const { current } = usePelada();
  const [payers, setPayers] = useState<PayerDTO[]>([]);
  const [editing, setEditing] = useState<PayerDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<PayerDTO | null>(null);
  const [merging, setMerging] = useState<PayerDTO | null>(null);
  const [loading, setLoading] = useState(false);

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

  const semWhatsapp = payers.filter((p) => p.tipo === "MENSALISTA" && p.ativo && !p.telefone).length;

  async function handleSave(data: { nome: string; tipo: PayerDTO["tipo"]; telefone: string | null; desde: string | null }) {
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl">{ptBR.pagantes.titulo}</h1>
        <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
          {ptBR.pagantes.novo}
        </Button>
      </div>

      {semWhatsapp > 0 && (
        <p className="mb-3 text-sm text-clay">{interpolate(ptBR.pagantes.semWhatsapp, { n: semWhatsapp })}</p>
      )}

      {loading && <p className="text-sm text-muted">Carregando...</p>}

      <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">{ptBR.pagantes.nome}</th>
              <th className="px-4 py-3">{ptBR.pagantes.tipo}</th>
              <th className="px-4 py-3">{ptBR.pagantes.desde}</th>
              <th className="px-4 py-3">{ptBR.pagantes.telefone}</th>
              <th className="px-4 py-3">{ptBR.pagantes.cadastradoEm}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {payers.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-chalk">
                <td className="px-4 py-3">{toTitle(p.nome)}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.tipo === "MENSALISTA" ? "mensal" : "avulso"}>
                    {p.tipo === "MENSALISTA" ? "Mensalista" : "Avulso"}
                  </Badge>
                </td>
                <td className="px-4 py-3">{p.desde ? mesLabel(p.desde) : "—"}</td>
                <td className="px-4 py-3">
                  {p.telefone ?? <span className="text-clay">sem WhatsApp</span>}
                </td>
                <td className="px-4 py-3">{p.cadastradoEm}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-2"
                      title={ptBR.pagantes.mesclarTitulo}
                      aria-label={ptBR.pagantes.mesclarTitulo}
                      onClick={() => setMerging(p)}
                    >
                      <GitMerge className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!px-2"
                      title={ptBR.pagantes.editar}
                      aria-label={ptBR.pagantes.editar}
                      onClick={() => setEditing(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="!px-2"
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
