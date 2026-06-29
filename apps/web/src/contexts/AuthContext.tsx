"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { login as loginRequest, type AuthUser } from "@/services/auth";

const TOKEN_COOKIE = "pelada_token";
const USER_COOKIE = "pelada_user";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 7}`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = getCookie(TOKEN_COOKIE);
    const storedUser = getCookie(USER_COOKIE);
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignora cookie corrompido
      }
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await loginRequest(email, password);
    setToken(res.token);
    setUser(res.user);
    setCookie(TOKEN_COOKIE, res.token);
    setCookie(USER_COOKIE, JSON.stringify(res.user));
  }

  function logout() {
    setToken(null);
    setUser(null);
    clearCookie(TOKEN_COOKIE);
    clearCookie(USER_COOKIE);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
