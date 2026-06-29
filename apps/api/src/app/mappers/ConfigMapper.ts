import { formatBRL } from "@pelada/core";
import type { Config, CourtIdentifier } from "@prisma/client";

type ConfigWithCourt = Config & { courtIdentifiers: CourtIdentifier[] };

export class ConfigMapper {
  static toDTO(config: ConfigWithCourt) {
    return {
      valorMensalidade: formatBRL(config.valorMensalidade),
      valorAvulso: formatBRL(config.valorAvulso),
      valorAluguel: formatBRL(config.valorAluguel),
      diaPagamentoQuadra: config.diaPagamentoQuadra,
      identificadoresQuadra: config.courtIdentifiers.map((c) => c.value),
      whatsappRemindersEnabled: config.whatsappRemindersEnabled,
      whatsappReminderDay: config.whatsappReminderDay,
      whatsappTemplate: config.whatsappTemplate,
    };
  }
}
