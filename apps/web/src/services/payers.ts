import { apiFetch } from "./api";

export type PayerType = "MENSALISTA" | "AVULSO";

export interface PayerDTO {
  id: string;
  nome: string;
  tipo: PayerType;
  ativo: boolean;
  desde: string | null;
  telefone: string | null;
  apelidos: string[];
  cadastradoEm: string;
}

export function listPayers(token: string, peladaId: string) {
  return apiFetch<PayerDTO[]>(`/peladas/${peladaId}/payers`, { token });
}

export function createPayer(
  token: string,
  peladaId: string,
  data: { nome: string; tipo: PayerType; desde?: string | null; telefone?: string | null },
) {
  return apiFetch<PayerDTO>(`/peladas/${peladaId}/payers`, { method: "POST", token, body: data });
}

export function updatePayer(
  token: string,
  peladaId: string,
  id: string,
  data: { nome?: string; ativo?: boolean; desde?: string | null; telefone?: string | null },
) {
  return apiFetch<PayerDTO>(`/peladas/${peladaId}/payers/${id}`, { method: "PUT", token, body: data });
}

export function deletePayer(token: string, peladaId: string, id: string) {
  return apiFetch<void>(`/peladas/${peladaId}/payers/${id}`, { method: "DELETE", token });
}

export function mergePayers(token: string, peladaId: string, targetPayerId: string, sourcePayerIds: string[]) {
  return apiFetch<PayerDTO>(`/peladas/${peladaId}/payers/merge`, {
    method: "POST",
    token,
    body: { targetPayerId, sourcePayerIds },
  });
}

export function getChargeMessage(token: string, peladaId: string, payerId: string, competencia: string) {
  return apiFetch<{ mensagem: string; link: string }>(
    `/peladas/${peladaId}/payers/${payerId}/charge-message?competencia=${competencia}`,
    { token },
  );
}
