"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2, RefreshCw, Clock } from "lucide-react";
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
import {
  listPendingInvites,
  resendInvite,
  type PendingInviteDTO,
} from "@/services/invites";

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

function formatLastLogin(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Agora há pouco";
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Ontem";
  if (d < 30) return `Há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

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
  const [pendingInvites, setPendingInvites] = useState<PendingInviteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole | "">("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // cooldown per invite id: timestamp when cooldown ends
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [resending, setResending] = useState<string | null>(null);

  const canManage = current?.role === "OWNER";

  async function reload() {
    if (!token || !current) return;
    const [list, invites] = await Promise.all([
      listMembers(token, current.id),
      canManage ? listPendingInvites(token, current.id) : Promise.resolve([]),
    ]);
    setMembers(list);
    setPendingInvites(invites);
  }

  useEffect(() => {
    if (!token || !current) return;
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, current]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !current) return;
    setError(null);
    setAdding(true);
    try {
      if (!role) { setError("Selecione um perfil."); return; }
      const result = await addMember(token, current.id, name.trim(), email.trim(), role);
      setName("");
      setEmail("");
      setRole("");
      await reload();
      if ("invited" in result && result.invited) {
        flash(`Convite enviado para ${result.name} (${result.email})`);
      } else {
        flash("Membro adicionado com sucesso!");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
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
      flash("Perfil atualizado!");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar perfil.");
    }
  }

  async function handleRemove(userId: string) {
    if (!token || !current) return;
    setError(null);
    try {
      await removeMember(token, current.id, userId);
      await reload();
      flash("Membro removido da pelada.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover membro.");
    }
  }

  async function handleResend(invite: PendingInviteDTO) {
    if (!token || !current) return;
    setResending(invite.id);
    try {
      await resendInvite(token, current.id, invite.email);
      // set 60s cooldown
      setCooldowns((prev) => ({ ...prev, [invite.id]: Date.now() + 60_000 }));
      flash(`Convite reenviado para ${invite.name}.`);
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Erro ao reenviar convite.",
      );
    } finally {
      setResending(null);
    }
  }

  function isCoolingDown(inviteId: string): boolean {
    const until = cooldowns[inviteId];
    return !!until && Date.now() < until;
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

        {/* Coluna esquerda — lista de membros + pendentes */}
        <div className="space-y-5">
          {/* Feedback */}
          {(error || success) && (
            <div>
              {error && <AlertBanner tone="error">{error}</AlertBanner>}
              {success && <AlertBanner tone="ok">{success}</AlertBanner>}
            </div>
          )}

          {/* Lista de membros */}
          {(() => {
            const cols = canManage
              ? "2.25rem 1fr 7rem 9rem 2.25rem"
              : "2.25rem 1fr 7rem 9rem";
            return (
          <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
            <div className="grid items-center gap-3 border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
              style={{ gridTemplateColumns: cols }}>
              <span />
              <span>Membro</span>
              <span className="text-right">Último login</span>
              <span className="text-center">Perfil</span>
              {canManage && <span />}
            </div>

            {loading && (
              <div className="divide-y divide-line">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid items-center gap-3 px-4 py-3.5" style={{ gridTemplateColumns: cols }}>
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-4 w-20 ml-auto" />
                    <Skeleton className="h-6 w-24 mx-auto" />
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
                    idx < members.length - 1 ? "border-b border-line" : ""
                  } hover:bg-chalk`}
                  style={{ gridTemplateColumns: cols }}
                >
                  <Initials name={m.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-muted">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                  </div>
                  <p className="text-right text-xs text-muted">{formatLastLogin(m.lastLoginAt)}</p>
                  {canManage && !isMe ? (
                    <Select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value as MemberRole)}
                      className="w-full text-sm"
                    >
                      {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                      ))}
                    </Select>
                  ) : (
                    <div className="flex justify-center">
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
                        title="Remover da pelada"
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
          );
          })()}

          {!loading && (
            <p className="text-right text-xs text-muted">
              {members.length} {members.length === 1 ? "membro" : "membros"}
            </p>
          )}

          {/* Convites pendentes — só OWNER */}
          {canManage && !loading && pendingInvites.length > 0 && (
            <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
              <div className="grid items-center gap-3 border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
                style={{ gridTemplateColumns: "2.25rem 1fr 7rem 9rem 2.25rem" }}>
                <span />
                <span>Convites pendentes</span>
                <span className="text-right">Enviado em</span>
                <span className="text-center">Perfil</span>
                <span />
              </div>
              {pendingInvites.map((inv, idx) => {
                const cooling = isCoolingDown(inv.id);
                const roleCfg = ROLE_CONFIG[inv.role as MemberRole];
                return (
                  <div
                    key={inv.id}
                    className={`grid items-center gap-3 px-4 py-3.5 ${
                      idx < pendingInvites.length - 1 ? "border-b border-line" : ""
                    } hover:bg-chalk`}
                    style={{ gridTemplateColumns: "2.25rem 1fr 7rem 9rem 2.25rem" }}
                  >
                    <Clock className="h-4 w-4 text-muted" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{inv.name}</p>
                      <p className="truncate text-xs text-muted">{inv.email}</p>
                    </div>
                    <p className="text-right text-xs text-muted">
                      {new Date(inv.lastSentAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex justify-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleCfg?.cor ?? "bg-chalk text-muted"}`}>
                        {roleCfg?.label ?? inv.role}
                      </span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="!px-2"
                      disabled={cooling || resending === inv.id}
                      loading={resending === inv.id}
                      onClick={() => handleResend(inv)}
                      title={cooling ? "Aguarde 1 minuto para reenviar" : "Reenviar convite"}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
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
                  Se o e-mail ainda não tem conta, um convite será enviado automaticamente.
                </p>
              </div>

              <Input
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole | "")}
                required
              >
                <option value="" disabled>Selecione um perfil…</option>
                {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                ))}
              </Select>

              <Button type="submit" variant="primary" size="sm" loading={adding} className="w-full">
                Adicionar membro
              </Button>
            </form>
          )}

          {/* Legenda de perfis */}
          <div className="rounded-card border border-line bg-card p-4 shadow-card">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Perfis</h3>
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
