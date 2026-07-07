import type { Response } from "express";
import { prisma } from "../../database/client";
import { GetAuditLogService } from "../services/GetAuditLogService";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class AuditController {
  async index(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new GetAuditLogService(prisma);
    const entries = await service.execute(req.params.peladaId);
    res.status(200).json(entries);
  }
}
