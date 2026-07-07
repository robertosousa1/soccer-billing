import type { Response } from "express";
import { prisma } from "../../database/client";
import { GetMonthlyReportService } from "../services/GetMonthlyReportService";
import { ListDefaultersService } from "../services/ListDefaultersService";
import { BuildChargeMessageService } from "../services/BuildChargeMessageService";
import { BuildMonthlyReportPdfService } from "../services/BuildMonthlyReportPdfService";
import { AuditEntryRepository } from "../repositories/AuditEntryRepository";
import { PayersRepository } from "../repositories/PayersRepository";
import { ConfigRepository } from "../repositories/ConfigRepository";
import { TransactionsRepository } from "../repositories/TransactionsRepository";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class ReportsController {
  async competenciaRange(req: PeladaScopedRequest, res: Response): Promise<void> {
    const range = await new TransactionsRepository(prisma).competenciaRange(req.params.peladaId);
    res.status(200).json(range);
  }

  async show(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new GetMonthlyReportService();
    const report = await service.execute(req.params.peladaId, req.params.competencia);
    res.status(200).json(report);
  }

  async pdf(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { peladaId, competencia } = req.params;
    const buffer = await new BuildMonthlyReportPdfService().execute(peladaId, competencia);

    await new AuditEntryRepository(prisma).create({
      peladaId,
      userId: req.userId,
      tipo: "RELATORIO_EXPORTADO",
      sujeito: competencia,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="resumo-${competencia}.pdf"`);
    res.status(200).send(buffer);
  }

  async defaulters(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new ListDefaultersService();
    const defaulters = await service.execute(req.params.peladaId, req.params.competencia);
    res.status(200).json(defaulters);
  }

  async chargeMessage(req: PeladaScopedRequest, res: Response): Promise<void> {
    const competencia = String(req.query.competencia);
    const config = await new ConfigRepository(prisma).findByPelada(req.params.peladaId);
    const service = new BuildChargeMessageService(new PayersRepository(prisma));
    const result = await service.execute(req.params.peladaId, req.params.id, competencia, config?.whatsappTemplate);
    res.status(200).json(result);
  }
}
