import type { Response } from "express";
import { CreatePayerAbonoService } from "../services/CreatePayerAbonoService";
import { DeletePayerAbonoService } from "../services/DeletePayerAbonoService";
import { AppError } from "../utils/AppError";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class AbonosController {
  async create(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado.", 401);
    const { competencia, motivo } = req.body as { competencia: string; motivo: string };
    await new CreatePayerAbonoService().execute({
      peladaId: req.params.peladaId,
      payerId: req.params.id,
      competencia,
      motivo,
      userId: req.userId,
    });
    res.status(201).send();
  }

  async destroy(req: PeladaScopedRequest, res: Response): Promise<void> {
    await new DeletePayerAbonoService().execute({
      peladaId: req.params.peladaId,
      payerId: req.params.id,
      competencia: req.params.competencia,
    });
    res.status(204).send();
  }
}
