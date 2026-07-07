import type { Pelada } from "@prisma/client";
import { prisma } from "../../database/client";
import { AuditEntryRepository } from "../repositories/AuditEntryRepository";

interface Request {
  nome: string;
  ownerUserId: string;
}

export class CreatePeladaService {
  async execute({ nome, ownerUserId }: Request): Promise<Pelada> {
    const pelada = await prisma.$transaction(async (tx) => {
      const p = await tx.pelada.create({ data: { nome } });
      await tx.peladaMember.create({
        data: { peladaId: p.id, userId: ownerUserId, role: "OWNER" },
      });
      return p;
    });

    new AuditEntryRepository(prisma).fire({
      peladaId: pelada.id,
      userId: ownerUserId,
      tipo: "PELADA_CRIADA",
      sujeito: nome,
    });

    return pelada;
  }
}
