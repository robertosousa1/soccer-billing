"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ptBR } from "@/i18n/pt-BR";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ptBR.auth.erroLogin);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card bg-card p-6 shadow-card">
        <h1 className="mb-1 font-display text-2xl text-ink">{ptBR.app.brand}</h1>
        <p className="mb-6 text-sm text-muted">{ptBR.app.subtitle}</p>

        <div className="space-y-3">
          <Input
            type="email"
            placeholder={ptBR.auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={ptBR.auth.senha}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="mt-3 text-sm text-clay">{error}</p>}

        <Button type="submit" variant="primary" className="mt-5 w-full" loading={loading}>
          {ptBR.auth.entrar}
        </Button>
      </form>
    </div>
  );
}
