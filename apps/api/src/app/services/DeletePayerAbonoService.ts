import { prisma } from "../../database/client";
import { PayerAbonoRepository } from "../repositories/PayerAbonoRepository";
import { AppError } from "../utils/AppError";

interface Request {
  peladaId: string;
  payerId: string;
  competencia: string;
}

export class DeletePayerAbonoService {
  async execute(req: Request): Promise<void> {
    const payer = await prisma.payer.findFirst({ where: { id: req.payerId, peladaId: req.peladaId } });
    if (!payer) throw new AppError("Pagante não encontrado.", 404);

    await new PayerAbonoRepository().delete(req.payerId, req.competencia);
  }
}
