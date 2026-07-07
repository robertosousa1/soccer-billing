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

export function login(email: string, password: string, recaptchaToken: string) {
  return apiFetch<LoginResponse>("/sessions", { method: "POST", body: { email, password, recaptchaToken } });
}

export function forgotPassword(email: string, recaptchaToken: string) {
  return apiFetch<{ message: string }>("/password-reset/forgot", { method: "POST", body: { email, recaptchaToken } });
}

export function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>("/password-reset/reset", { method: "POST", body: { token, password } });
}
