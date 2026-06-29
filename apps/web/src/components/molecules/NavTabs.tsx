"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ptBR } from "@/i18n/pt-BR";

const tabs = [
  { href: "/painel", label: ptBR.nav.painel },
  { href: "/importar", label: ptBR.nav.importar },
  { href: "/pagantes", label: ptBR.nav.pagantes },
  { href: "/configuracoes", label: ptBR.nav.config },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href);
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
