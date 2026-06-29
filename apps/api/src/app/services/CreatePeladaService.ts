import type { Pelada } from "@prisma/client";
import { prisma } from "../../database/client";

interface Request {
  nome: string;
  ownerUserId: string;
}

const DEFAULTS = {
  valorMensalidade: 7000,
  valorAvulso: 3000,
  valorAluguel: 120000,
  diaPagamentoQuadra: 10,
};

export class CreatePeladaService {
  async execute({ nome, ownerUserId }: Request): Promise<Pelada> {
    return prisma.$transaction(async (tx) => {
      const pelada = await tx.pelada.create({ data: { nome } });

      await tx.peladaMember.create({
        data: { peladaId: pelada.id, userId: ownerUserId, role: "OWNER" },
      });

      await tx.config.create({
        data: {
          peladaId: pelada.id,
          valorMensalidade: DEFAULTS.valorMensalidade,
          valorAvulso: DEFAULTS.valorAvulso,
          valorAluguel: DEFAULTS.valorAluguel,
          diaPagamentoQuadra: DEFAULTS.diaPagamentoQuadra,
        },
      });

      return pelada;
    });
  }
}
