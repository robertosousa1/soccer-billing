import type { Response } from "express";
import { formatBRL } from "@pelada/core";
import { prisma } from "../../database/client";
import { ConfigRepository } from "../repositories/ConfigRepository";
import { GetConfigService } from "../services/GetConfigService";
import { UpdateConfigService } from "../services/UpdateConfigService";
import { ApplyConfigSnapshotsService } from "../services/ApplyConfigSnapshotsService";
import { AuditEntryRepository } from "../repositories/AuditEntryRepository";
import { ConfigMapper } from "../mappers/ConfigMapper";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class ConfigController {
  async show(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new GetConfigService(new ConfigRepository(prisma));
    const config = await service.execute(req.params.peladaId);
    res.status(200).json(ConfigMapper.toDTO(config));
  }

  async update(req: PeladaScopedRequest, res: Response): Promise<void> {
    const repo = new ConfigRepository(prisma);
    const before = await repo.findByPelada(req.params.peladaId);

    const service = new UpdateConfigService(repo);
    const config = await service.execute({ peladaId: req.params.peladaId, ...req.body });

    // Grava diff na auditoria
    const after = config;
    if (after) {
      const CAMPOS = [
        { key: "valorMensalidade" as const, label: "Mensalidade" },
        { key: "valorAvulso" as const,      label: "Avulso" },
        { key: "valorAluguel" as const,     label: "Aluguel da quadra" },
        { key: "diaPagamentoQuadra" as const, label: "Dia de pagamento" },
      ];
      const alteracoes = CAMPOS.flatMap(({ key, label }) => {
        const de = before?.[key] ?? null;
        const para = after[key];
        if (de === para) return [];
        const fmt = (v: number | null) =>
          v === null ? null : key === "diaPagamentoQuadra" ? String(v) : formatBRL(v);
        return [{ campo: label, de: fmt(de as number | null), para: fmt(para as number) }];
      });
      if (alteracoes.length > 0) {
        new AuditEntryRepository(prisma).fire({
          peladaId: req.params.peladaId,
          userId: req.userId,
          tipo: "CONFIG_ALTERADO",
          alteracoes,
        });
      }
    }

    res.status(200).json(ConfigMapper.toDTO(config!));
  }

  async listCompetencias(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { peladaId } = req.params;
    const rows = await prisma.transaction.findMany({
      where: { peladaId },
      select: { competencia: true },
      distinct: ["competencia"],
      orderBy: { competencia: "desc" },
    });
    res.status(200).json({ competencias: rows.map((r) => r.competencia) });
  }

  async applySnapshots(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { peladaId } = req.params;
    const { competencias } = req.body as { competencias: string[] };
    await new ApplyConfigSnapshotsService(prisma).execute({ peladaId, competencias });
    res.status(204).send();
  }
}
