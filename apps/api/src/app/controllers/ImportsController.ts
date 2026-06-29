import type { Response } from "express";
import { prisma } from "../../database/client";
import { ParseExtractService } from "../services/ParseExtractService";
import { BuildReconciliationService } from "../services/BuildReconciliationService";
import { ConfirmReconciliationService } from "../services/ConfirmReconciliationService";
import { getStorageAdapter } from "../../adapters/storage";
import { AppError } from "../utils/AppError";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

type MulterRequest = PeladaScopedRequest & { file?: Express.Multer.File };

export class ImportsController {
  async preview(req: MulterRequest, res: Response): Promise<void> {
    if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
    const file = req.file;

    const lines = new ParseExtractService().execute(file.buffer);
    const result = await new BuildReconciliationService().execute(req.params.peladaId, lines);

    const storage = getStorageAdapter();
    const rawFileKey = await storage.save(file.originalname, file.buffer);

    res.status(200).json({ ...result, rawFileKey, nomeArquivo: file.originalname });
  }

  async confirm(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const { linhas, hash, rawFileKey, nomeArquivo } = req.body;
    const service = new ConfirmReconciliationService(prisma);
    const result = await service.execute({
      peladaId: req.params.peladaId,
      nomeArquivo,
      hash,
      rawFileKey,
      linhas,
      userId: req.userId,
    });
    res.status(201).json(result);
  }
}
