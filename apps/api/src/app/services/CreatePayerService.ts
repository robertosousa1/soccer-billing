import { normalizeName } from "@pelada/core";
import type { PayerType } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { PayersRepository } from "../repositories/PayersRepository";
import { prisma } from "../../database/client";

interface Request {
  peladaId: string;
  nome: string;
  tipo: PayerType;
  desde?: string | null;
  telefone?: string | null;
  userId: string;
}

export class CreatePayerService {
  constructor(private readonly payersRepository: PayersRepository) {}

  async execute(req: Request) {
    const existingAlias = await prisma.payerAlias.findFirst({
      where: { peladaId: req.peladaId, aliasNorm: normalizeName(req.nome) },
    });
    if (existingAlias) throw new AppError("Já existe um pagante com este nome/apelido na pelada", 409);

    return this.payersRepository.create(
      {
        peladaId: req.peladaId,
        nome: req.nome,
        tipo: req.tipo,
        desde: req.tipo === "MENSALISTA" ? req.desde ?? null : null,
        telefone: req.telefone ?? null,
        apelidos: [req.nome],
      },
      { userId: req.userId },
    );
  }
}
