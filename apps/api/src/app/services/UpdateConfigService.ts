import { parseMoneyToCents } from "@pelada/core";
import { AppError } from "../utils/AppError";
import type { ConfigRepository } from "../repositories/ConfigRepository";

interface Request {
  peladaId: string;
  valorMensalidade?: string | number;
  valorAvulso?: string | number;
  valorAluguel?: string | number;
  diaPagamentoQuadra?: number;
  identificadoresQuadra?: string[];
  whatsappRemindersEnabled?: boolean;
  whatsappReminderDay?: number | null;
  whatsappTemplate?: string | null;
}

export class UpdateConfigService {
  constructor(private readonly configRepository: ConfigRepository) {}

  async execute(req: Request) {
    const existing = await this.configRepository.findByPelada(req.peladaId);
    if (!existing) throw new AppError("Config não encontrada para esta pelada", 404);

    await this.configRepository.update(req.peladaId, {
      ...(req.valorMensalidade !== undefined && { valorMensalidade: parseMoneyToCents(req.valorMensalidade) }),
      ...(req.valorAvulso !== undefined && { valorAvulso: parseMoneyToCents(req.valorAvulso) }),
      ...(req.valorAluguel !== undefined && { valorAluguel: parseMoneyToCents(req.valorAluguel) }),
      ...(req.diaPagamentoQuadra !== undefined && { diaPagamentoQuadra: req.diaPagamentoQuadra }),
      ...(req.whatsappRemindersEnabled !== undefined && {
        whatsappRemindersEnabled: req.whatsappRemindersEnabled,
      }),
      ...(req.whatsappReminderDay !== undefined && { whatsappReminderDay: req.whatsappReminderDay }),
      ...(req.whatsappTemplate !== undefined && { whatsappTemplate: req.whatsappTemplate }),
    });

    if (req.identificadoresQuadra !== undefined) {
      await this.configRepository.replaceCourtIdentifiers(existing.id, req.identificadoresQuadra);
    }

    return this.configRepository.findByPelada(req.peladaId);
  }
}
