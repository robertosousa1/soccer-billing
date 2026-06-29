import { apiFetch } from "./api";

export type MemberRole = "OWNER" | "ADMIN" | "READER";

export interface PeladaSummary {
  id: string;
  nome: string;
  role: MemberRole;
}

export function listPeladas(token: string) {
  return apiFetch<PeladaSummary[]>("/peladas", { token });
}

export function createPelada(token: string, nome: string) {
  return apiFetch<{ id: string; nome: string }>("/peladas", { method: "POST", token, body: { nome } });
}
