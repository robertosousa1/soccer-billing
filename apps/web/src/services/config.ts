import { apiFetch } from "./api";

export interface ConfigDTO {
  valorMensalidade: string;
  valorAvulso: string;
  valorAluguel: string;
  diaPagamentoQuadra: number;
  identificadoresQuadra: string[];
  whatsappRemindersEnabled: boolean;
  whatsappReminderDay: number | null;
  whatsappTemplate: string | null;
}

export function getConfig(token: string, peladaId: string) {
  return apiFetch<ConfigDTO>(`/peladas/${peladaId}/config`, { token });
}

export function updateConfig(token: string, peladaId: string, data: Partial<ConfigDTO>) {
  return apiFetch<ConfigDTO>(`/peladas/${peladaId}/config`, { method: "PUT", token, body: data });
}
