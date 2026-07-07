"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { ApiError } from "@/services/api";
import { forgotPassword } from "@/services/auth";

function EsqueciSenhaForm() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!executeRecaptcha) {
      setError("reCAPTCHA não carregado. Recarregue a página e tente novamente.");
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("forgot_password");
      await forgotPassword(email.trim(), recaptchaToken);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError("Verificação de segurança falhou. Recarregue a página e tente novamente.");
      } else {
        setError(err instanceof ApiError ? err.message : "Erro ao enviar o e-mail. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-card bg-card p-6 shadow-card space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✉️
        </div>
        <div>
          <h1 className="font-display text-xl text-ink">Verifique seu e-mail</h1>
          <p className="mt-2 text-sm text-muted">
            Se <strong>{email}</strong> estiver cadastrado, você receberá as instruções
            para redefinir sua senha em alguns instantes.
          </p>
        </div>
        <p className="text-xs text-muted">O link expira em 1 hora.</p>
        <Link href="/login" className="block text-sm font-medium text-emerald-700 hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card bg-card p-6 shadow-card space-y-4">
      <div>
        <h1 className="font-display text-2xl text-ink">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-muted">
          Informe seu e-mail e enviaremos um link para você criar uma nova senha.
        </p>
      </div>

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      <Input
        type="email"
        name="email"
        placeholder="email@exemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        Enviar link de redefinição
      </Button>

      <p className="text-center text-sm text-muted">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}

export default function EsqueciSenhaPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm space-y-3">
        <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
          <EsqueciSenhaForm />
        </GoogleReCaptchaProvider>
      </div>
    </div>
  );
}
