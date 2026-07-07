"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { PageShell } from "@/components/templates/PageShell";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { ApiError } from "@/services/api";
import {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  type MemberDTO,
  type MemberRole,
} from "@/services/members";

const ROLE_CONFIG: Record<MemberRole, { label: string; cor: string }> = {
  OWNER:  { label: "Proprietário",  cor: "bg-emerald-100 text-emerald-700" },
  ADMIN:  { label: "Administrador", cor: "bg-blue-100 text-blue-700" },
  READER: { label: "Leitor",        cor: "bg-chalk text-muted" },
};

const ROLE_DESC: Record<MemberRole, string> = {
  OWNER:  "Acesso total, incluindo gerenciar membros e configurações",
  ADMIN:  "Pode importar, gerenciar pagamentos e jogadores",
  READER: "Somente leitura — vê painel, jogadores e relatórios",
};

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const ini = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chalk text-sm font-semibold text-muted">
      {ini}
    </span>
  );
}

export default function MembrosPage() {
  const { token, user } = useAuth();
  const { current } = usePelada();
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("ADMIN");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManage = current?.role === "OWNER";

  async function reload() {
    if (!token || !current) return;
    const list = await listMembers(token, current.id);
    setMembers(list);
  }

  useEffect(() => {
    if (!token || !current) return;
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, current]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !current) return;
    setError(null);
    setAdding(true);
    try {
      await addMember(token, current.id, email.trim(), role);
      setEmail("");
      await reload();
      flash("Membro adicionado com sucesso!");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 404
            ? "Nenhuma conta encontrada para este e-mail. O usuário precisa se cadastrar antes de ser adicionado."
            : err.message
          : "Erro ao adicionar membro.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: MemberRole) {
    if (!token || !current) return;
    setError(null);
    try {
      await updateMemberRole(token, current.id, userId, newRole);
      await reload();
      flash("Papel atualizado!");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar papel.");
    }
  }

  async function handleRemove(userId: string) {
    if (!token || !current) return;
    setError(null);
    try {
      await removeMember(token, current.id, userId);
      await reload();
      flash("Membro removido.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover membro.");
    }
  }

  return (
    <PageShell>
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="font-display text-xl">Membros</h1>
        <p className="mt-1 text-sm text-muted">Quem pode acessar esta pelada e com qual nível de permissão.</p>
      </div>

      {/* Layout duas colunas: lista | painel lateral */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

        {/* Coluna esquerda — lista de membros */}
        <div>
          {/* Feedback */}
          {(error || success) && (
            <div className="mb-4">
              {error && <AlertBanner tone="error">{error}</AlertBanner>}
              {success && <AlertBanner tone="ok">{success}</AlertBanner>}
            </div>
          )}

          <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <span className="w-9" />
              <span>Membro</span>
              <span className="w-36 text-center">Papel</span>
              {canManage && <span className="w-8" />}
            </div>

            {loading && (
              <div className="divide-y divide-line">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3.5">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-7 w-28" />
                    {canManage && <Skeleton className="h-7 w-7" />}
                  </div>
                ))}
              </div>
            )}

            {!loading && members.map((m, idx) => {
              const isMe = m.userId === user?.id;
              const cfg = ROLE_CONFIG[m.role];
              return (
                <div
                  key={m.userId}
                  className={`grid items-center gap-3 px-4 py-3.5 ${
                    canManage ? "grid-cols-[auto_1fr_auto_auto]" : "grid-cols-[auto_1fr_auto]"
                  } ${idx < members.length - 1 ? "border-b border-line" : ""} hover:bg-chalk`}
                >
                  <Initials name={m.name} />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-muted">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                  </div>

                  {canManage && !isMe ? (
                    <Select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value as MemberRole)}
                      className="w-36 text-sm"
                    >
                      {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                      ))}
                    </Select>
                  ) : (
                    <div className="flex w-36 justify-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cor}`}>
                        {cfg.label}
                      </span>
                    </div>
                  )}

                  {canManage && (
                    isMe ? <span /> : (
                      <Button
                        variant="danger"
                        size="sm"
                        className="!px-2"
                        title="Remover membro"
                        onClick={() => handleRemove(m.userId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {!loading && (
            <p className="mt-2 text-right text-xs text-muted">
              {members.length} {members.length === 1 ? "membro" : "membros"}
            </p>
          )}
        </div>

        {/* Coluna direita — formulário + legenda */}
        <div className="space-y-5">
          {/* Formulário de adição — só OWNER */}
          {canManage && (
            <form
              onSubmit={handleAdd}
              className="space-y-3 rounded-card border border-line bg-card p-5 shadow-card"
            >
              <div>
                <h2 className="font-display text-base">Adicionar membro</h2>
                <p className="mt-0.5 text-xs text-muted">
                  O usuário precisa ter uma conta criada antes de ser adicionado.
                </p>
              </div>

              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
              >
                {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                ))}
              </Select>

              <Button type="submit" variant="primary" size="sm" loading={adding} className="w-full">
                Adicionar membro
              </Button>
            </form>
          )}

          {/* Legenda de papéis */}
          <div className="rounded-card border border-line bg-card p-4 shadow-card">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Papéis</h3>
            <div className="space-y-3">
              {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((r) => (
                <div key={r} className="grid grid-cols-[7rem_1fr] items-start gap-2">
                  <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_CONFIG[r].cor}`}>
                    {ROLE_CONFIG[r].label}
                  </span>
                  <span className="text-xs text-muted leading-relaxed">{ROLE_DESC[r]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
