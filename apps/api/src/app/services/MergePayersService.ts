import type { PrismaClient } from "@prisma/client";
import { toTitle } from "@pelada/core";
import { AppError } from "../utils/AppError";
import { PayerHistoryRepository } from "../repositories/PayerHistoryRepository";

interface Request {
  peladaId: string;
  targetPayerId: string;
  sourcePayerIds: string[];
  userId: string;
}

/**
 * Mescla um ou mais pagantes duplicados (mesma pessoa real, grafias diferentes) num pagante
 * canônico. A mescla é por COTA (Share), não por lançamento inteiro: um pagamento dividido
 * pode ter cotas de outras pessoas que não fazem parte da mescla e não devem ser tocadas.
 */
export class MergePayersService {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(req: Request) {
    const sourceIds = [...new Set(req.sourcePayerIds)].filter((id) => id !== req.targetPayerId);
    if (sourceIds.length === 0) {
      throw new AppError("Selecione ao menos um pagante diferente do destino para mesclar", 400);
    }

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.payer.findFirst({ where: { id: req.targetPayerId, peladaId: req.peladaId } });
      if (!target) throw new AppError("Pagante de destino não encontrado", 404);

      const sources = await tx.payer.findMany({
        where: { id: { in: sourceIds }, peladaId: req.peladaId },
        include: { aliases: true, typeChanges: true },
      });
      if (sources.length !== sourceIds.length) {
        throw new AppError("Algum pagante de origem não encontrado", 404);
      }

      let tipo = target.tipo;
      let telefone = target.telefone;
      const aliasesNoDestino = new Set(
        (await tx.payerAlias.findMany({ where: { payerId: target.id }, select: { aliasNorm: true } })).map(
          (a) => a.aliasNorm,
        ),
      );
      const vigenciasNoDestino = new Set(
        (await tx.payerTypeChange.findMany({ where: { payerId: target.id }, select: { vigenteDesde: true } })).map(
          (c) => c.vigenteDesde,
        ),
      );

      for (const source of sources) {
        // só as cotas do pagante de origem mudam de dono — cotas de outras pessoas no mesmo
        // lançamento dividido continuam intocadas.
        await tx.share.updateMany({ where: { payerId: source.id }, data: { payerId: target.id } });

        // apelidos: move os que o destino ainda não reconhece; os que colidem (destino já tem
        // aquele nome) somem junto com o pagante de origem (cascade em PayerAlias).
        for (const alias of source.aliases) {
          if (aliasesNoDestino.has(alias.aliasNorm)) continue;
          await tx.payerAlias.update({ where: { id: alias.id }, data: { payerId: target.id } });
          aliasesNoDestino.add(alias.aliasNorm);
        }

        // histórico de tipo: move o que o destino ainda não tem para a mesma competência; o
        // que colide some junto com o pagante de origem (cascade em PayerTypeChange).
        for (const change of source.typeChanges) {
          if (vigenciasNoDestino.has(change.vigenteDesde)) continue;
          await tx.payerTypeChange.update({ where: { id: change.id }, data: { payerId: target.id } });
          vigenciasNoDestino.add(change.vigenteDesde);
        }

        if (source.tipo === "MENSALISTA") tipo = "MENSALISTA";
        if (!telefone && source.telefone) telefone = source.telefone;

        // histórico de edições: vira apêndice do destino (sem checagem de colisão — é só log).
        await tx.payerHistoryEntry.updateMany({ where: { payerId: source.id }, data: { payerId: target.id } });

        // soft-delete aliases that collided (remained on source) to free the unique slot
        await tx.payerAlias.updateMany({ where: { payerId: source.id, deletedAt: null }, data: { deletedAt: new Date() } });
        await tx.payer.update({ where: { id: source.id }, data: { deletedAt: new Date() } });
      }

      // desde = menor competência entre as mensalidades não ignoradas do pagante final, já
      // contando as cotas recém-movidas (mesma regra de UpdateTransactionService/Delete...).
      let desde: string | null = null;
      if (tipo === "MENSALISTA") {
        const share = await tx.share.findFirst({
          where: { payerId: target.id, categoria: "MENSALIDADE", transaction: { ignorada: false } },
          orderBy: { transaction: { competencia: "asc" } },
          select: { transaction: { select: { competencia: true } } },
        });
        desde = share?.transaction.competencia ?? null;
      }

      const updated = await tx.payer.update({
        where: { id: target.id },
        data: { tipo, telefone, desde },
        include: { aliases: true },
      });

      const nomesOrigem = sources.map((s) => toTitle(s.nome)).join(", ");
      await new PayerHistoryRepository(tx).recordEdit(
        target.id,
        req.userId,
        target,
        updated,
        `Mesclado com ${nomesOrigem}`,
      );

      return updated;
    }, { timeout: 30000, maxWait: 10000 });
  }
}
