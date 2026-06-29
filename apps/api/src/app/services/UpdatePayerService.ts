import type { PayerType } from "@prisma/client";
import { AppError } from "../utils/AppError";
import type { PayersRepository } from "../repositories/PayersRepository";

interface Request {
  peladaId: string;
  id: string;
  nome?: string;
  ativo?: boolean;
  desde?: string | null;
  telefone?: string | null;
  tipo?: PayerType;
  vigenteDesde?: string;
  userId: string;
}

export class UpdatePayerService {
  constructor(private readonly payersRepository: PayersRepository) {}

  async execute(req: Request) {
    const existing = await this.payersRepository.findById(req.peladaId, req.id);
    if (!existing) throw new AppError("Pagante não encontrado", 404);

    const tipoMudou = req.tipo !== undefined && req.tipo !== existing.tipo;
    if (tipoMudou) {
      if (!req.vigenteDesde) {
        throw new AppError("Informe a partir de qual mês a mudança de tipo vale", 400);
      }
      return this.payersRepository.changeType(
        req.id,
        {
          tipo: req.tipo as PayerType,
          vigenteDesde: req.vigenteDesde,
          desde: req.tipo === "MENSALISTA" ? req.vigenteDesde : null,
          nome: req.nome,
          ativo: req.ativo,
          telefone: req.telefone,
        },
        { userId: req.userId },
      );
    }

    return this.payersRepository.update(
      req.id,
      {
        nome: req.nome,
        ativo: req.ativo,
        desde: req.desde,
        telefone: req.telefone,
      },
      { userId: req.userId },
    );
  }
}
