import type { Pelada } from "@prisma/client";
import { prisma } from "../../database/client";

interface Request {
  nome: string;
  ownerUserId: string;
}

export class CreatePeladaService {
  async execute({ nome, ownerUserId }: Request): Promise<Pelada> {
    return prisma.$transaction(async (tx) => {
      const pelada = await tx.pelada.create({ data: { nome } });

      await tx.peladaMember.create({
        data: { peladaId: pelada.id, userId: ownerUserId, role: "OWNER" },
      });

      return pelada;
    });
  }
}
