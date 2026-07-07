import { apiFetch } from "./api";

export type MemberRole = "OWNER" | "ADMIN" | "READER";

export interface MemberDTO {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  lastLoginAt: string | null;
}

export function listMembers(token: string, peladaId: string) {
  return apiFetch<MemberDTO[]>(`/peladas/${peladaId}/members`, { token });
}

export type AddMemberResult =
  | MemberDTO
  | { invited: true; email: string; name: string };

export function addMember(token: string, peladaId: string, name: string, email: string, role: MemberRole) {
  return apiFetch<AddMemberResult>(`/peladas/${peladaId}/members`, {
    method: "POST",
    token,
    body: { name, email, role },
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

