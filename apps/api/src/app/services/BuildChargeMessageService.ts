import { telDigits } from "@pelada/core";
import { AppError } from "../utils/AppError";
import type { PayersRepository } from "../repositories/PayersRepository";

const DEFAULT_TEMPLATE =
  "Oi {nome}! Passando para lembrar da mensalidade da pelada referente a {mes}. Valeu! 🙏⚽";

export class BuildChargeMessageService {
  constructor(private readonly payersRepository: PayersRepository) {}

  async execute(peladaId: string, payerId: string, competencia: string, template?: string | null) {
    const payer = await this.payersRepository.findById(peladaId, payerId);
    if (!payer) throw new AppError("Pagante não encontrado", 404);
    if (!payer.telefone) throw new AppError("Pagante não tem telefone cadastrado", 400);

    const mensagem = (template ?? DEFAULT_TEMPLATE)
      .replace("{nome}", payer.nome)
      .replace("{mes}", competencia);

    const digits = telDigits(payer.telefone);
    const link = `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;

    return { mensagem, link };
  }
}
