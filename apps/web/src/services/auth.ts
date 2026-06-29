import { apiFetch } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/sessions", { method: "POST", body: { email, password } });
}
