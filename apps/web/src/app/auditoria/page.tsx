"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PageShell } from "@/components/templates/PageShell";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { getAuditLog, type AuditEntryDTO, type AuditTipo } from "@/services/audit";

const TIPO_CONFIG: Record<AuditTipo, { label: string; cor: string }> = {
  JOGADOR_CRIADO:        { label: "Jogador criado",        cor: "bg-emerald-100 text-emerald-700" },
  JOGADOR_EDITADO:       { label: "Jogador editado",       cor: "bg-blue-100 text-blue-700" },
  JOGADOR_EXCLUIDO:      { label: "Jogador excluído",      cor: "bg-red-100 text-red-700" },
  APELIDO_ADICIONADO:    { label: "Apelido adicionado",    cor: "bg-teal-100 text-teal-700" },
  APELIDO_REMOVIDO:      { label: "Apelido removido",      cor: "bg-red-100 text-red-700" },
  PAGAMENTO_CRIADO:      { label: "Pagamento criado",      cor: "bg-emerald-100 text-emerald-700" },
  PAGAMENTO_EDITADO:     { label: "Pagamento editado",     cor: "bg-amber-100 text-amber-700" },
  PAGAMENTO_EXCLUIDO:    { label: "Pagamento excluído",    cor: "bg-red-100 text-red-700" },
  ABONO_CONCEDIDO:       { label: "Abono concedido",       cor: "bg-purple-100 text-purple-700" },
  ABONO_REMOVIDO:        { label: "Abono removido",        cor: "bg-red-100 text-red-700" },
  MEMBRO_ADICIONADO:     { label: "Membro adicionado",     cor: "bg-emerald-100 text-emerald-700" },
  MEMBRO_REMOVIDO:       { label: "Membro removido",       cor: "bg-red-100 text-red-700" },
  MEMBRO_PERFIL_ALTERADO:{ label: "Perfil alterado",       cor: "bg-blue-100 text-blue-700" },
  CONVITE_ENVIADO:       { label: "Convite enviado",       cor: "bg-sky-100 text-sky-700" },
  CONVITE_REENVIADO:     { label: "Convite reenviado",     cor: "bg-sky-100 text-sky-700" },
  CONVITE_ATIVADO:       { label: "Convite ativado",       cor: "bg-emerald-100 text-emerald-700" },
  CONFIG_ALTERADO:       { label: "Config alterada",       cor: "bg-orange-100 text-orange-700" },
  RELATORIO_EXPORTADO:   { label: "Relatório exportado",   cor: "bg-slate-100 text-slate-600" },
};

export default function AuditoriaPage() {
  const { token } = useAuth();
  const { current } = usePelada();
  const [entries, setEntries] = useState<AuditEntryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | AuditTipo>("");
  const [filtroSujeito, setFiltroSujeito] = useState("");
  const [pagina, setPagina] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!token || !current) return;
    setLoading(true);
    getAuditLog(token, current.id)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [token, current]);

  const usuarios = [...new Set(entries.map((e) => e.usuario))].sort();

  const filtradas = entries.filter((e) => {
    if (filtroUsuario && e.usuario !== filtroUsuario) return false;
    if (filtroTipo && e.tipo !== filtroTipo) return false;
    if (filtroSujeito && !e.sujeito.toLowerCase().includes(filtroSujeito.toLowerCase())) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginadas = filtradas.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);

  function mudarFiltro<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPagina(1); };
  }

  return (
    <PageShell>
      {/* Cabeçalho */}
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-xl">Auditoria</h1>
        {!loading && (
          <span className="text-sm text-muted">
            {filtradas.length} {filtradas.length === 1 ? "registro" : "registros"}
          </span>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="mb-5 flex flex-col gap-2 rounded-card border border-line bg-card p-3 sm:flex-row sm:items-center">
        {/* Busca — ocupa o espaço restante */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Buscar jogador ou pagamento..."
            value={filtroSujeito}
            onChange={(e) => mudarFiltro(setFiltroSujeito)(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex gap-2">
          {/* Tipo — largura fixa para caber o label mais longo */}
          <Select
            value={filtroTipo}
            onChange={(e) => mudarFiltro(setFiltroTipo)(e.target.value as "" | AuditTipo)}
            className="w-48"
          >
            <option value="">Tipo: todos</option>
            {(Object.keys(TIPO_CONFIG) as AuditTipo[]).map((t) => (
              <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
            ))}
          </Select>

          {/* Usuário — largura fixa menor, nomes são curtos */}
          <Select
            value={filtroUsuario}
            onChange={(e) => mudarFiltro(setFiltroUsuario)(e.target.value)}
            className="w-40"
          >
            <option value="">Usuário: todos</option>
            {usuarios.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 rounded-card border border-line bg-card p-4">
              <Skeleton className="h-5 w-32 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtradas.length === 0 && (
        <p className="text-sm text-muted">Nenhuma ação registrada.</p>
      )}

      {!loading && filtradas.length > 0 && (
        <>
        <ol className="relative border-l-2 border-line pl-6 space-y-5">
          {paginadas.map((entry) => {
            const cfg = TIPO_CONFIG[entry.tipo];
            return (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-line bg-card" />

                <div className="rounded-card border border-line bg-card p-4 shadow-card">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cor}`}>
                      {cfg.label}
                    </span>
                    <span className="font-medium text-sm">{entry.sujeito}</span>
                    <span className="ml-auto text-xs text-muted">
                      {entry.data} às {entry.hora} · <span className="font-medium text-ink">{entry.usuario}</span>
                    </span>
                  </div>

                  {entry.motivo && (
                    <p className="mb-2 text-xs italic text-muted">{entry.motivo}</p>
                  )}

                  {entry.alteracoes && entry.alteracoes.length > 0 && (
                    <table className="w-full text-xs mt-1">
                      <thead>
                        <tr className="text-left text-muted">
                          <th className="pb-1 pr-3 font-semibold uppercase tracking-wide w-28">Campo</th>
                          <th className="pb-1 pr-3 font-semibold uppercase tracking-wide">Antes</th>
                          <th className="pb-1 font-semibold uppercase tracking-wide">Depois</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.alteracoes.map((a, i) => (
                          <tr key={i} className="border-t border-line/50">
                            <td className="py-1 pr-3 font-medium">{a.campo}</td>
                            <td className="py-1 pr-3 text-clay">{a.de ?? <span className="italic text-muted">—</span>}</td>
                            <td className="py-1 text-pitch">{a.para ?? <span className="italic text-muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

          {totalPaginas > 1 && (
            <div className="mt-5 flex items-center justify-between text-sm text-muted">
              <span>
                {(paginaAtual - 1) * PAGE_SIZE + 1}–{Math.min(paginaAtual * PAGE_SIZE, filtradas.length)} de {filtradas.length}
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
        </>
      )}
    </PageShell>
  );
}
