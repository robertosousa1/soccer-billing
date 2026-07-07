import { normalizeName } from "@pelada/core";
import type { Payer, PayerType, PrismaClient } from "@prisma/client";
import { PayerHistoryRepository } from "./PayerHistoryRepository";

interface Actor {
  userId: string;
  motivo?: string;
}

export class PayersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByPelada(peladaId: string) {
    return this.prisma.payer.findMany({
      where: { peladaId, deletedAt: null },
      include: { aliases: { where: { deletedAt: null } } },
      orderBy: { nome: "asc" },
    });
  }

  findById(peladaId: string, id: string) {
    return this.prisma.payer.findFirst({
      where: { id, peladaId, deletedAt: null },
      include: { aliases: { where: { deletedAt: null } } },
    });
  }

  create(
    data: {
      peladaId: string;
      nome: string;
      tipo: PayerType;
      desde?: string | null;
      telefone?: string | null;
      apelidos?: string[];
    },
    actor: Actor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.payer.create({
        data: {
          peladaId: data.peladaId,
          nome: data.nome,
          tipo: data.tipo,
          desde: data.desde ?? null,
          telefone: data.telefone ?? null,
          aliases: data.apelidos?.length
            ? {
                create: data.apelidos.map((alias) => ({
                  peladaId: data.peladaId,
                  alias,
                  aliasNorm: normalizeName(alias),
                })),
              }
            : undefined,
        },
        include: { aliases: true },
      });
      await new PayerHistoryRepository(tx).recordCreation(created.id, actor.userId, created, actor.motivo);
      return created;
    }, { timeout: 30000, maxWait: 10000 });
  }

  update(
    id: string,
    data: { nome?: string; ativo?: boolean; desde?: string | null; telefone?: string | null },
    actor: Actor,
  ): Promise<Payer> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.payer.findUniqueOrThrow({ where: { id } });
      const after = await tx.payer.update({ where: { id }, data });
      await new PayerHistoryRepository(tx).recordEdit(id, actor.userId, before, after, actor.motivo);
      return after;
    }, { timeout: 30000, maxWait: 10000 });
  }

  changeType(
    id: string,
    data: {
      tipo: PayerType;
      vigenteDesde: string;
      desde: string | null;
      nome?: string;
      ativo?: boolean;
      telefone?: string | null;
    },
    actor: Actor,
  ): Promise<Payer> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.payer.findUniqueOrThrow({ where: { id } });
      const payer = await tx.payer.update({
        where: { id },
        data: { tipo: data.tipo, desde: data.desde, nome: data.nome, ativo: data.ativo, telefone: data.telefone },
      });
      await tx.payerTypeChange.upsert({
        where: { payerId_vigenteDesde: { payerId: id, vigenteDesde: data.vigenteDesde } },
        create: { payerId: id, tipo: data.tipo, vigenteDesde: data.vigenteDesde },
        update: { tipo: data.tipo },
      });
      await new PayerHistoryRepository(tx).recordEdit(id, actor.userId, before, payer, actor.motivo, [
        { campo: "Vigência da troca de tipo", de: null, para: data.vigenteDesde },
      ]);
      return payer;
    }, { timeout: 30000, maxWait: 10000 });
  }

  softDelete(id: string): Promise<Payer> {
    return this.prisma.$transaction(async (tx) => {
      // soft-delete all active aliases so their unique constraint slot is freed
      await tx.payerAlias.updateMany({ where: { payerId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      return tx.payer.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
}
