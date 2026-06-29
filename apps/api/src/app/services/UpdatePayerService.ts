import { AppError } from "../utils/AppError";
import type { PayersRepository } from "../repositories/PayersRepository";

interface Request {
  peladaId: string;
  id: string;
  nome?: string;
  ativo?: boolean;
  desde?: string | null;
  telefone?: string | null;
}

export class UpdatePayerService {
  constructor(private readonly payersRepository: PayersRepository) {}

  async execute(req: Request) {
    const existing = await this.payersRepository.findById(req.peladaId, req.id);
    if (!existing) throw new AppError("Pagante não encontrado", 404);

    return this.payersRepository.update(req.id, {
      nome: req.nome,
      ativo: req.ativo,
      desde: req.desde,
      telefone: req.telefone,
    });
  }
}
