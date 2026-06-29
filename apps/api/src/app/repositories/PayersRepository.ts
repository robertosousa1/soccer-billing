import { normalizeName } from "@pelada/core";
import type { Payer, PayerType, PrismaClient } from "@prisma/client";

export class PayersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByPelada(peladaId: string) {
    return this.prisma.payer.findMany({
      where: { peladaId },
      include: { aliases: true },
      orderBy: { nome: "asc" },
    });
  }

  findById(peladaId: string, id: string) {
    return this.prisma.payer.findFirst({
      where: { id, peladaId },
      include: { aliases: true },
    });
  }

  create(data: {
    peladaId: string;
    nome: string;
    tipo: PayerType;
    desde?: string | null;
    telefone?: string | null;
    apelidos?: string[];
  }) {
    return this.prisma.payer.create({
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
  }

  update(
    id: string,
    data: { nome?: string; ativo?: boolean; desde?: string | null; telefone?: string | null },
  ): Promise<Payer> {
    return this.prisma.payer.update({ where: { id }, data });
  }

  delete(id: string): Promise<Payer> {
    return this.prisma.payer.delete({ where: { id } });
  }
}
