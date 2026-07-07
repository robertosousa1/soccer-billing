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

export function listCompetencias(token: string, peladaId: string): Promise<string[]> {
  return apiFetch<{ competencias: string[] }>(`/peladas/${peladaId}/config/competencias`, { token }).then(
    (r) => r.competencias,
  );
}

export function applyConfigSnapshots(token: string, peladaId: string, competencias: string[]): Promise<void> {
  return apiFetch<void>(`/peladas/${peladaId}/config/snapshots`, {
    method: "POST",
    token,
    body: { competencias },
  });
}
