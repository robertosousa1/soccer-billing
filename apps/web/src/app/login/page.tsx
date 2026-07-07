"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/api";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { ptBR } from "@/i18n/pt-BR";

function LoginForm() {
  const { login } = useAuth();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!executeRecaptcha) {
      setError("reCAPTCHA não carregado. Recarregue a página e tente novamente.");
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("login");
      await login(email, password, recaptchaToken);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError("Verificação de segurança falhou. Recarregue a página e tente novamente.");
      } else {
        setError(err instanceof ApiError ? err.message : ptBR.auth.erroLogin);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card bg-card p-6 shadow-card">
      <h1 className="mb-1 font-display text-2xl text-ink">{ptBR.app.brand}</h1>
      <p className="mb-6 text-sm text-muted">{ptBR.app.subtitle}</p>

      <div className="space-y-3">
        <Input
          type="email"
          name="email"
          placeholder={ptBR.auth.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          type="password"
          name="password"
          placeholder={ptBR.auth.senha}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className="mt-3 text-sm text-clay">{error}</p>}

      <Button type="submit" variant="primary" className="mt-5 w-full" loading={loading}>
        {ptBR.auth.entrar}
      </Button>

      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/esqueci-senha" className="font-medium text-emerald-700 hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const ativado = searchParams.get("ativado") === "true";
  const senhaRedefinida = searchParams.get("senha_redefinida") === "true";
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm space-y-3">
        {ativado && (
          <AlertBanner tone="ok">
            Conta ativada com sucesso! Faça login para continuar.
          </AlertBanner>
        )}
        {senhaRedefinida && (
          <AlertBanner tone="ok">
            Senha redefinida com sucesso! Faça login com sua nova senha.
          </AlertBanner>
        )}

        <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
          <LoginForm />
        </GoogleReCaptchaProvider>
      </div>
    </div>
  );
}
