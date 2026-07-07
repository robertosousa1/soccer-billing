import { apiFetch } from "./api";

export type AuditTipo =
  | "JOGADOR_CRIADO"
  | "JOGADOR_EDITADO"
  | "JOGADOR_EXCLUIDO"
  | "APELIDO_ADICIONADO"
  | "APELIDO_REMOVIDO"
  | "PAGAMENTO_CRIADO"
  | "PAGAMENTO_EDITADO"
  | "PAGAMENTO_EXCLUIDO"
  | "ABONO_CONCEDIDO"
  | "ABONO_REMOVIDO"
  | "MEMBRO_ADICIONADO"
  | "MEMBRO_REMOVIDO"
  | "MEMBRO_PERFIL_ALTERADO"
  | "CONVITE_ENVIADO"
  | "CONVITE_REENVIADO"
  | "CONVITE_ATIVADO"
  | "CONFIG_ALTERADO"
  | "RELATORIO_EXPORTADO";

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
