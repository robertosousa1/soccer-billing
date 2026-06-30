import { resolveTipoEDesde } from "@pelada/core";
import { prisma } from "../../database/client";
import { PayerAbonoRepository } from "../repositories/PayerAbonoRepository";
import { AppError } from "../utils/AppError";

interface Request {
  peladaId: string;
  payerId: string;
  competencia: string;
  motivo: string;
  userId: string;
}

export class CreatePayerAbonoService {
  async execute(req: Request): Promise<void> {
    const payer = await prisma.payer.findFirst({ where: { id: req.payerId, peladaId: req.peladaId } });
    if (!payer) throw new AppError("Pagante não encontrado.", 404);

    const typeChanges = await prisma.payerTypeChange.findMany({ where: { payerId: req.payerId } });
    const coreChanges = typeChanges.map((c) => ({ payerId: c.payerId, tipo: c.tipo, vigenteDesde: c.vigenteDesde }));
    const { tipo } = resolveTipoEDesde(
      { id: payer.id, tipo: payer.tipo, desde: payer.desde, nome: payer.nome, ativo: payer.ativo, telefone: payer.telefone, apelidos: [] },
      coreChanges,
      req.competencia,
    );
    if (tipo !== "MENSALISTA") throw new AppError("Abono só pode ser concedido a mensalistas.", 400);

    await new PayerAbonoRepository().create({
      payerId: req.payerId,
      peladaId: req.peladaId,
      competencia: req.competencia,
      motivo: req.motivo.trim(),
      createdByUserId: req.userId,
    });
  }
}
