import { apiFetch } from "./api";

export type MemberRole = "OWNER" | "ADMIN" | "READER";

export interface MemberDTO {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
}

export function listMembers(token: string, peladaId: string) {
  return apiFetch<MemberDTO[]>(`/peladas/${peladaId}/members`, { token });
}

export function addMember(token: string, peladaId: string, email: string, role: MemberRole) {
  return apiFetch<MemberDTO>(`/peladas/${peladaId}/members`, {
    method: "POST",
    token,
    body: { email, role },
  });
}

export function updateMemberRole(token: string, peladaId: string, userId: string, role: MemberRole) {
  return apiFetch<MemberDTO>(`/peladas/${peladaId}/members/${userId}`, {
    method: "PUT",
    token,
    body: { role },
  });
}

export function removeMember(token: string, peladaId: string, userId: string) {
  return apiFetch<void>(`/peladas/${peladaId}/members/${userId}`, {
    method: "DELETE",
    token,
  });
}
