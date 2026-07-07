"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { Skeleton } from "@/components/atoms/Skeleton";
import { getInvite, activateInvite, type InviteDTO } from "@/services/invites";
import { ApiError } from "@/services/api";

const REASON_MSG: Record<string, string> = {
  not_found: "Este link de convite não existe.",
  used: "Este convite já foi utilizado. Faça login se já tem uma conta.",
  expired: "Este convite expirou. Peça ao organizador um novo convite.",
};

export default function ConvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteDTO | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setInvalidReason("not_found"); setLoading(false); return; }
    getInvite(token)
      .then((res) => {
        if (res.valid) setInvite(res);
        else setInvalidReason(res.reason);
      })
      .catch(() => setInvalidReason("not_found"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    setSaving(true);
    setError(null);
    try {
      await activateInvite(token, password);
      router.push("/login?ativado=true");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível ativar a conta. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        {loading && (
          <div className="space-y-3 rounded-card bg-card p-6 shadow-card">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10 w-36" />
          </div>
        )}

        {!loading && invalidReason && (
          <div className="rounded-card bg-card p-6 shadow-card">
            <h1 className="mb-1 font-display text-xl text-ink">Caixa da Pelada</h1>
            <AlertBanner tone="error">
              {REASON_MSG[invalidReason] ?? "Link inválido."}
            </AlertBanner>
          </div>
        )}

        {!loading && invite && (
          <form onSubmit={handleSubmit} className="rounded-card bg-card p-6 shadow-card space-y-4">
            <div>
              <h1 className="font-display text-xl text-ink">Ativar sua conta</h1>
              <p className="mt-1 text-sm text-muted">
                Você foi convidado para <strong>{invite.peladaNome}</strong> como{" "}
                <strong>{invite.role}</strong>. Defina uma senha para entrar.
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nome</p>
              <p className="text-sm font-medium text-ink">{invite.name}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">E-mail</p>
              <p className="text-sm font-medium text-ink">{invite.email}</p>
            </div>

            <div className="space-y-3 pt-1">
              <Input
                type="password"
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Confirmar senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-clay">{error}</p>}

            <Button type="submit" variant="primary" className="w-full" loading={saving}>
              Ativar conta
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
