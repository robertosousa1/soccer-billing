"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { createPelada } from "@/services/peladas";
import { ApiError } from "@/services/api";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ptBR } from "@/i18n/pt-BR";

export default function PeladasPage() {
  const { token, logout, isLoading: authLoading } = useAuth();
  const { peladas, selectPelada, selectAndReload, isLoading: peladaLoading } = usePelada();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

  if (authLoading || !token || peladaLoading) return null;

  function handleSelect(id: string) {
    selectPelada(id);
    const pelada = peladas.find((p) => p.id === id);
    router.push(pelada?.configurado ? "/painel" : "/configuracoes");
  }

  async function handleCreate() {
    if (!token || !nome.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const created = await createPelada(token, nome.trim());
      await selectAndReload(created.id);
      router.push("/configuracoes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : ptBR.peladas.erroCriar);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-card bg-card p-6 shadow-card">
        <h1 className="mb-1 font-display text-2xl text-ink">{ptBR.peladas.escolherTitulo}</h1>
        <p className="mb-6 text-sm text-muted">{ptBR.peladas.escolherSubtitulo}</p>

        {peladas.length > 0 && (
          <div className="mb-6 space-y-2">
            {peladas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className="flex w-full items-center justify-between rounded-[10px] border border-line px-4 py-3 text-left text-sm hover:bg-chalk"
              >
                <span className="font-medium text-ink">{p.nome}</span>
                <span className="text-xs text-muted">{p.role}</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold text-muted">{ptBR.peladas.criarNova}</p>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={ptBR.peladas.nomeNovaPelada}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {error && <p className="text-sm text-clay">{error}</p>}
          <Button variant="primary" className="w-full" loading={loading} onClick={handleCreate}>
            {ptBR.peladas.criar}
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={logout}>
          {ptBR.auth.sair}
        </Button>
      </div>
    </div>
  );
}
