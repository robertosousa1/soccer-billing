"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { Skeleton } from "@/components/atoms/Skeleton";
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
  OWNER:  { label: "Proprietário",   cor: "bg-emerald-100 text-emerald-700" },
  ADMIN:  { label: "Administrador",  cor: "bg-blue-100 text-blue-700" },
  READER: { label: "Leitor",         cor: "bg-chalk text-muted" },
};

const ROLE_DESC: Record<MemberRole, string> = {
  OWNER:  "Acesso total, incluindo gerenciar membros",
  ADMIN:  "Pode importar, gerenciar pagamentos e jogadores",
  READER: "Somente leitura",
};

interface Props {
  token: string;
  peladaId: string;
  myUserId: string;
  myRole: MemberRole;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const ini = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chalk text-xs font-semibold text-muted">
      {ini}
    </span>
  );
}

export function MembrosSection({ token, peladaId, myUserId, myRole }: Props) {
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("ADMIN");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManage = myRole === "OWNER";

  async function reload() {
    const list = await listMembers(token, peladaId);
    setMembers(list);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await addMember(token, peladaId, name.trim(), email.trim(), role);
      setName("");
      setEmail("");
      await reload();
      flash("Membro adicionado!");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 404
            ? "Nenhuma conta encontrada para este e-mail. O usuário precisa se cadastrar primeiro."
            : err.message
          : "Erro ao adicionar membro.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: MemberRole) {
    setError(null);
    try {
      await updateMemberRole(token, peladaId, userId, newRole);
      await reload();
      flash("Perfil atualizado!");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao atualizar perfil.");
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      await removeMember(token, peladaId, userId);
      await reload();
      flash("Membro removido.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao remover membro.");
    }
  }

  return (
    <section className="mt-8 max-w-md">
      <h2 className="mb-1 font-display text-lg">Membros</h2>
      <p className="mb-4 text-sm text-muted">
        Quem pode acessar esta pelada e com qual nível de permissão.
      </p>

      {/* Lista de membros */}
      <div className="rounded-card border border-line bg-card shadow-card">
        {loading && (
          <div className="space-y-3 p-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        )}

        {!loading && members.map((m, idx) => {
          const isMe = m.userId === myUserId;
          const cfg = ROLE_CONFIG[m.role];
          return (
            <div
              key={m.userId}
              className={`flex items-center gap-3 px-4 py-3 ${idx < members.length - 1 ? "border-b border-line" : ""}`}
            >
              <Initials name={m.name} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name}
                  {isMe && <span className="ml-1.5 text-xs text-muted">(você)</span>}
                </p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>

              {/* Perfil — select para OWNER gerenciar, badge para outros */}
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
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cor}`}>
                  {cfg.label}
                </span>
              )}

              {canManage && !isMe && (
                <Button
                  variant="danger"
                  size="sm"
                  className="!px-2"
                  title="Remover membro"
                  onClick={() => handleRemove(m.userId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda de perfis */}
      <div className="mt-3 space-y-0.5">
        {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((r) => (
          <p key={r} className="text-xs text-muted">
            <span className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_CONFIG[r].cor}`}>
              {ROLE_CONFIG[r].label}
            </span>
            {ROLE_DESC[r]}
          </p>
        ))}
      </div>

      {/* Formulário de adição — só OWNER */}
      {canManage && (
        <form onSubmit={handleAdd} className="mt-5 space-y-3 rounded-card border border-line bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold">Adicionar membro</h3>
          <p className="text-xs text-muted">
            Se o e-mail ainda não tem conta, um convite será enviado automaticamente.
          </p>

          <Input
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-36"
            >
              {(Object.keys(ROLE_CONFIG) as MemberRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
              ))}
            </Select>
          </div>

          {error && <AlertBanner tone="error">{error}</AlertBanner>}
          {success && <AlertBanner tone="ok">{success}</AlertBanner>}

          <Button type="submit" variant="primary" size="sm" loading={adding}>
            Adicionar
          </Button>
        </form>
      )}

      {!canManage && (success || error) && (
        <div className="mt-3">
          {error && <AlertBanner tone="error">{error}</AlertBanner>}
          {success && <AlertBanner tone="ok">{success}</AlertBanner>}
        </div>
      )}
    </section>
  );
}
