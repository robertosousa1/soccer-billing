"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavTabs } from "@/components/molecules/NavTabs";
import { PeladaSwitcher } from "@/components/organisms/PeladaSwitcher";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/contexts/AuthContext";
import { ptBR } from "@/i18n/pt-BR";
import { usePelada } from "@/contexts/PeladaContext";

export function PageShell({ children }: { children: React.ReactNode }) {
  const { logout, token, isLoading } = useAuth();
  const { current, isLoading: peladaLoading } = usePelada();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token) router.replace("/login");
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!isLoading && token && !peladaLoading && !current) router.replace("/peladas");
  }, [isLoading, token, peladaLoading, current, router]);

  useEffect(() => {
    if (!isLoading && token && !peladaLoading && current && !current.configurado && pathname !== "/configuracoes") {
      router.replace("/configuracoes");
    }
  }, [isLoading, token, peladaLoading, current, pathname, router]);

  if (isLoading || !token || peladaLoading || !current) return null;
  if (!current.configurado && pathname !== "/configuracoes") return null;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <PeladaSwitcher />
          <div className="flex items-center gap-3">
            <NavTabs />
            <Button variant="ghost" size="sm" onClick={logout}>
              {ptBR.auth.sair}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
