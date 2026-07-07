"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { listPeladas, type PeladaSummary } from "@/services/peladas";

const KEY_PELADA = "pelada:selected";

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
      setPeladas([]);
      setCurrentId(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const list = await listPeladas(token);
    setPeladas(list);
    const saved = localStorage.getItem(KEY_PELADA);
    const stillExists = list.some((p) => p.id === saved);
    const next = stillExists ? saved : list[0]?.id ?? null;
    setCurrentId(next);
    if (next) localStorage.setItem(KEY_PELADA, next);
    setIsLoading(false);
  }

  useEffect(() => {
    reload().catch(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function selectPelada(id: string) {
    setCurrentId(id);
    localStorage.setItem(KEY_PELADA, id);
  }

  async function selectAndReload(id: string) {
    if (!token) return;
    const list = await listPeladas(token);
    setPeladas(list);
    selectPelada(id);
  }

  const current = peladas.find((p) => p.id === currentId) ?? null;

  return (
    <PeladaContext.Provider value={{ peladas, current, selectPelada, selectAndReload, isLoading, reload }}>
      {children}
    </PeladaContext.Provider>
  );
}

export function usePelada(): PeladaContextValue {
  const ctx = useContext(PeladaContext);
  if (!ctx) throw new Error("usePelada deve ser usado dentro de PeladaProvider");
  return ctx;
}
