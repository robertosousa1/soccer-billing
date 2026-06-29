import type { Config, PrismaClient } from "@prisma/client";

export class ConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByPelada(peladaId: string) {
    return this.prisma.config.findUnique({
      where: { peladaId },
      include: { courtIdentifiers: true },
    });
  }

  update(
    peladaId: string,
    data: {
      valorMensalidade?: number;
      valorAvulso?: number;
      valorAluguel?: number;
      diaPagamentoQuadra?: number;
      whatsappRemindersEnabled?: boolean;
      whatsappReminderDay?: number | null;
      whatsappTemplate?: string | null;
    },
  ): Promise<Config> {
    return this.prisma.config.update({ where: { peladaId }, data });
  }

  replaceCourtIdentifiers(configId: string, values: string[]): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await tx.courtIdentifier.deleteMany({ where: { configId } });
      if (values.length) {
        await tx.courtIdentifier.createMany({
          data: values.map((value) => ({ value, configId })),
        });
      }
    });
  }
}
