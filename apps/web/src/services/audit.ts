import { apiFetch } from "./api";

export type AuditTipo =
  | "JOGADOR_CRIADO"
  | "JOGADOR_EDITADO"
  | "PAGAMENTO_EDITADO"
  | "ABONO_CONCEDIDO"
  | "ABONO_REMOVIDO";

export interface AuditEntryDTO {
  id: string;
  tipo: AuditTipo;
  usuario: string;
  sujeito: string;
  data: string;
  hora: string;
  alteracoes?: { campo: string; de: string | null; para: string | null }[];
  motivo?: string | null;
}

export function getAuditLog(token: string, peladaId: string) {
  return apiFetch<AuditEntryDTO[]>(`/peladas/${peladaId}/audit`, { token });
}
