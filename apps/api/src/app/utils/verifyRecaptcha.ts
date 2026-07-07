import { env } from "../../config/env";
import { AppError } from "./AppError";

interface RecaptchaResponse {
  success: boolean;
  score: number;
  action: string;
  "error-codes"?: string[];
}

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const MIN_SCORE = 0.5;

export async function verifyRecaptcha(token: string): Promise<void> {
  if (!env.recaptchaSecret) return; // desabilitado em dev sem a chave

  const params = new URLSearchParams({
    secret: env.recaptchaSecret,
    response: token,
  });

  const res = await fetch(RECAPTCHA_VERIFY_URL, {
    method: "POST",
    body: params,
  });

  const data = (await res.json()) as RecaptchaResponse;

  if (!data.success || data.score < MIN_SCORE) {
    throw new AppError("Verificação de segurança falhou. Tente novamente.", 422);
  }
}
