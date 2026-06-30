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
  data: {
    nome?: string;
    ativo?: boolean;
    desde?: string | null;
    telefone?: string | null;
    tipo?: PayerType;
    vigenteDesde?: string;
  },
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

export interface PayerFieldChange {
  campo: string;
  de: string | null;
  para: string | null;
}

export interface PayerHistoryEntryDTO {
  id: string;
  acao: "CRIACAO" | "EDICAO";
  motivo: string | null;
  alteracoes: PayerFieldChange[];
  usuario: string;
  data: string;
  hora: string;
}

export function createAbono(
  token: string,
  peladaId: string,
  payerId: string,
  data: { competencia: string; motivo: string },
) {
  return apiFetch<void>(`/peladas/${peladaId}/payers/${payerId}/abonos`, { method: "POST", token, body: data });
}

export function deleteAbono(token: string, peladaId: string, payerId: string, competencia: string) {
  return apiFetch<void>(`/peladas/${peladaId}/payers/${payerId}/abonos/${competencia}`, { method: "DELETE", token });
}

export function getPayerHistory(token: string, peladaId: string, payerId: string) {
  return apiFetch<PayerHistoryEntryDTO[]>(`/peladas/${peladaId}/payers/${payerId}/history`, { token });
}

export function getChargeMessage(token: string, peladaId: string, payerId: string, competencia: string) {
  return apiFetch<{ mensagem: string; link: string }>(
    `/peladas/${peladaId}/payers/${payerId}/charge-message?competencia=${competencia}`,
    { token },
  );
}
