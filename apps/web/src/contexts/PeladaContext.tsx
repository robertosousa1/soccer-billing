"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { listPeladas, type PeladaSummary } from "@/services/peladas";

const PELADA_COOKIE = "pelada_selected";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface PeladaContextValue {
  peladas: PeladaSummary[];
  current: PeladaSummary | null;
  selectPelada: (id: string) => void;
  selectAndReload: (id: string) => Promise<void>;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const PeladaContext = createContext<PeladaContextValue | undefined>(undefined);

export function PeladaProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [peladas, setPeladas] = useState<PeladaSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const list = await listPeladas(token);
    setPeladas(list);
    const saved = getCookie(PELADA_COOKIE);
    const stillExists = list.some((p) => p.id === saved);
    const next = stillExists ? saved : list[0]?.id ?? null;
    setCurrentId(next);
    if (next) setCookie(PELADA_COOKIE, next);
    setIsLoading(false);
  }

  useEffect(() => {
    reload().catch(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function selectPelada(id: string) {
    setCurrentId(id);
    setCookie(PELADA_COOKIE, id);
  }

  async function selectAndReload(id: string) {
    if (!token) return;
    const list = await listPeladas(token);
    setPeladas(list);
    selectPelada(id);
  }

  const current = peladas.find((p) => p.id === currentId) ?? null;

  return (
    <PeladaContext.Provider
      value={{ peladas, current, selectPelada, selectAndReload, isLoading, reload }}
    >
      {children}
    </PeladaContext.Provider>
  );
}

export function usePelada(): PeladaContextValue {
  const ctx = useContext(PeladaContext);
  if (!ctx) throw new Error("usePelada deve ser usado dentro de PeladaProvider");
  return ctx;
}
