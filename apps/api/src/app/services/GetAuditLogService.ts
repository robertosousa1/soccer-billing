import type { PrismaClient } from "@prisma/client";
import { formatBRL, formatDateBR, toTitle } from "@pelada/core";

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

function toHora(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export class GetAuditLogService {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(peladaId: string): Promise<AuditEntryDTO[]> {
    const [payerHistory, txHistory, abonos, auditEntries] = await Promise.all([
      this.prisma.payerHistoryEntry.findMany({
        where: { payer: { peladaId } },
        include: {
          user: { select: { name: true } },
          payer: { select: { nome: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      this.prisma.transactionHistoryEntry.findMany({
        where: { transaction: { peladaId } },
        include: {
          user: { select: { name: true } },
          transaction: { select: { nomeOriginal: true, valor: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      this.prisma.payerAbono.findMany({
        where: { peladaId },
        include: {
          createdBy: { select: { name: true } },
          payer: { select: { nome: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      this.prisma.auditEntry.findMany({
        where: { peladaId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);

    const entries: (AuditEntryDTO & { _ts: Date })[] = [];

    for (const e of payerHistory) {
      entries.push({
        _ts: e.createdAt,
        id: `ph-${e.id}`,
        tipo: e.acao === "CRIACAO" ? "JOGADOR_CRIADO" : "JOGADOR_EDITADO",
        usuario: e.user?.name ?? "Sistema",
        sujeito: toTitle(e.payer?.nome ?? "—"),
        data: formatDateBR(e.createdAt),
        hora: toHora(e.createdAt),
        alteracoes: e.alteracoes as AuditEntryDTO["alteracoes"],
        motivo: e.motivo ?? null,
      });
    }

    for (const e of txHistory) {
      const valor = e.transaction ? formatBRL(Math.abs(e.transaction.valor)) : "";
      entries.push({
        _ts: e.createdAt,
        id: `th-${e.id}`,
        tipo: "PAGAMENTO_EDITADO",
        usuario: e.user?.name ?? "Sistema",
        sujeito: e.transaction ? toTitle(e.transaction.nomeOriginal) : "—",
        data: formatDateBR(e.createdAt),
        hora: toHora(e.createdAt),
        alteracoes: e.alteracoes as AuditEntryDTO["alteracoes"],
        motivo: valor ? `Valor original: ${valor}` : null,
      });
    }

    for (const e of abonos) {
      entries.push({
        _ts: e.createdAt,
        id: `ab-${e.id}`,
        tipo: "ABONO_CONCEDIDO",
        usuario: e.createdBy?.name ?? "Sistema",
        sujeito: toTitle(e.payer?.nome ?? "—"),
        data: formatDateBR(e.createdAt),
        hora: toHora(e.createdAt),
        motivo: e.motivo,
      });
    }

    for (const e of auditEntries) {
      entries.push({
        _ts: e.createdAt,
        id: `ae-${e.id}`,
        tipo: e.tipo as AuditTipo,
        usuario: e.user?.name ?? "Sistema",
        sujeito: e.sujeito ?? "—",
        data: formatDateBR(e.createdAt),
        hora: toHora(e.createdAt),
        alteracoes: e.alteracoes as AuditEntryDTO["alteracoes"],
      });
    }

    entries.sort((a, b) => b._ts.getTime() - a._ts.getTime());

    return entries.map(({ _ts, ...rest }) => rest);
  }
}
