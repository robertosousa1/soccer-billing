"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ptBR } from "@/i18n/pt-BR";
import { usePelada } from "@/contexts/PeladaContext";

const tabs = [
  { href: "/painel", label: ptBR.nav.painel },
  { href: "/importar", label: ptBR.nav.importar },
  { href: "/jogadores", label: ptBR.nav.pagantes },
  { href: "/auditoria", label: ptBR.nav.auditoria },
  { href: "/membros", label: ptBR.nav.membros },
  { href: "/configuracoes", label: ptBR.nav.config },
];

export function NavTabs() {
  const pathname = usePathname();
  const { current } = usePelada();
  const locked = !!current && !current.configurado;

  return (
    <nav className="flex gap-1">
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        const disabled = locked && tab.href !== "/configuracoes";

        if (disabled) {
          return (
            <span
              key={tab.href}
              title="Configure a pelada antes de continuar"
              className="cursor-not-allowed rounded-[9px] px-3 py-2 text-sm font-medium text-muted/40"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-[9px] px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-pitch text-white" : "text-ink hover:bg-chalk"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
