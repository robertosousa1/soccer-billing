"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { login as loginRequest, type AuthUser } from "@/services/auth";

const KEY_TOKEN = "pelada:token";
const KEY_USER  = "pelada:user";

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, recaptchaToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem(KEY_TOKEN);
    const storedUser  = localStorage.getItem(KEY_USER);
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { /* corrompido */ }
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string, recaptchaToken: string) {
    const res = await loginRequest(email, password, recaptchaToken);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(KEY_TOKEN, res.token);
    localStorage.setItem(KEY_USER, JSON.stringify(res.user));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.clear();
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
