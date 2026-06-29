import type { MemberRole } from "@prisma/client";

/**
 * Matriz de capacidades — DOMAIN.md §14.
 * READ: ver dados/relatórios. WRITE: config/payers/imports/lançamentos/cobrar.
 * MANAGE_MEMBERS / RENAME_OR_DELETE_PELADA: exclusivas do OWNER.
 */
export type Capability = "READ" | "WRITE" | "MANAGE_MEMBERS" | "RENAME_OR_DELETE_PELADA";

const matrix: Record<Capability, MemberRole[]> = {
  READ: ["OWNER", "ADMIN", "READER"],
  WRITE: ["OWNER", "ADMIN"],
  MANAGE_MEMBERS: ["OWNER"],
  RENAME_OR_DELETE_PELADA: ["OWNER"],
};

export function roleCan(role: MemberRole, capability: Capability): boolean {
  return matrix[capability].includes(role);
}
