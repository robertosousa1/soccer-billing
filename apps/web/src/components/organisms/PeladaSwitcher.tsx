"use client";

import { useRouter } from "next/navigation";
import { usePelada } from "@/contexts/PeladaContext";
import { ptBR } from "@/i18n/pt-BR";

export function PeladaSwitcher() {
  const { peladas, current, selectPelada } = usePelada();
  const router = useRouter();

  if (!current) return null;

  return (
    <div>
      <p className="text-xs text-muted">{ptBR.app.brand}</p>
      {peladas.length > 1 ? (
        <select
          value={current.id}
          onChange={(e) => selectPelada(e.target.value)}
          aria-label={ptBR.peladas.selecionar}
          className="-ml-1 rounded-[8px] border-none bg-transparent font-display text-lg leading-tight text-ink focus:outline-none focus:ring-2 focus:ring-pitch/35"
        >
          {peladas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      ) : (
        <p className="font-display text-lg leading-tight text-ink">{current.nome}</p>
      )}
      <button
        type="button"
        onClick={() => router.push("/peladas")}
        className="text-xs text-muted underline-offset-2 hover:underline"
      >
        {ptBR.peladas.gerenciar}
      </button>
    </div>
  );
}
