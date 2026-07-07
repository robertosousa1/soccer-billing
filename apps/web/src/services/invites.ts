import { apiFetch } from "./api";

export interface InviteDTO {
  valid: true;
  email: string;
  name: string;
  peladaNome: string;
  role: string;
}

export interface InviteInvalidDTO {
  valid: false;
  reason: "not_found" | "used" | "expired";
}

export interface PendingInviteDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "PENDENTE" | "EXPIRADO" | "CANCELADO";
  lastSentAt: string;
  expiresAt: string;
  createdAt: string;
}

export function getInvite(token: string): Promise<InviteDTO | InviteInvalidDTO> {
  return apiFetch(`/invites/${token}`);
}

export function activateInvite(token: string, password: string): Promise<{ userId: string }> {
  return apiFetch("/invites/activate", {
    method: "POST",
    body: { token, password },
  });
}

export function listPendingInvites(authToken: string, peladaId: string): Promise<PendingInviteDTO[]> {
  return apiFetch(`/peladas/${peladaId}/invites`, { token: authToken });
}

export function resendInvite(authToken: string, peladaId: string, email: string): Promise<void> {
  return apiFetch(`/peladas/${peladaId}/invites/resend`, {
    method: "POST",
    token: authToken,
    body: { email },
  });
}

export function cancelInvite(authToken: string, peladaId: string, inviteId: string): Promise<void> {
  return apiFetch(`/peladas/${peladaId}/invites/${inviteId}`, {
    method: "DELETE",
    token: authToken,
  });
}
