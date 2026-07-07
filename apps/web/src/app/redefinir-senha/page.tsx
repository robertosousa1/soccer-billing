"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { ApiError } from "@/services/api";
import { resetPassword } from "@/services/auth";

function RedefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm rounded-card bg-card p-6 shadow-card space-y-3 text-center">
          <p className="text-sm text-clay">Link inválido ou incompleto.</p>
          <Link href="/esqueci-senha" className="text-sm font-medium text-emerald-700 hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      router.push("/login?senha_redefinida=true");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
        setError("Este link expirou ou já foi utilizado. Solicite um novo link.");
      } else {
        setError(err instanceof ApiError ? err.message : "Erro ao redefinir a senha. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm space-y-3">
        <form onSubmit={handleSubmit} className="rounded-card bg-card p-6 shadow-card space-y-4">
          <div>
            <h1 className="font-display text-2xl text-ink">Nova senha</h1>
            <p className="mt-1 text-sm text-muted">
              Escolha uma senha com pelo menos 6 caracteres.
            </p>
          </div>

          {error && <AlertBanner tone="error">{error}</AlertBanner>}

          <Input
            type="password"
            name="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <Input
            type="password"
            name="confirm"
            placeholder="Confirme a nova senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Redefinir senha
          </Button>

          <p className="text-center text-sm text-muted">
            <Link href="/esqueci-senha" className="font-medium text-emerald-700 hover:underline">
              Solicitar novo link
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirSenhaContent />
    </Suspense>
  );
}
