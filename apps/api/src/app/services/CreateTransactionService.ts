import { naturalKey } from "@pelada/core";
import { AppError } from "../utils/AppError";
import type { TransactionsRepository } from "../repositories/TransactionsRepository";
import type { PayersRepository } from "../repositories/PayersRepository";

interface Request {
  peladaId: string;
  tipo: "ENTRADA" | "SAIDA";
  data: string;
  hora: string;
  competencia: string;
  valor: number;
  payerId?: string;
  categoria?: "MENSALIDADE" | "AVULSO" | "CONTRIBUICAO" | "OUTRO";
  outflowCategory?: "QUADRA" | "OUTRA_SAIDA";
}

/** Registro manual de um lançamento (fora do fluxo de import de extrato). */
export class CreateTransactionService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly payersRepository: PayersRepository,
  ) {}

  async execute(req: Request) {
    let nomeOriginal: string;
    let valorAssinado: number;

    if (req.tipo === "ENTRADA") {
      const payer = await this.payersRepository.findById(req.peladaId, req.payerId!);
      if (!payer) throw new AppError("Pagante não encontrado", 404);
      nomeOriginal = payer.nome;
      valorAssinado = req.valor;
    } else {
      nomeOriginal = req.outflowCategory === "QUADRA" ? "Pagamento da quadra" : "Saída manual";
      valorAssinado = -req.valor;
    }

    const chaveNatural = naturalKey({ data: req.data, hora: req.hora, nomeOriginal, valor: valorAssinado });

    try {
      return await this.transactionsRepository.create({
        peladaId: req.peladaId,
        data: req.data,
        hora: req.hora,
        nomeOriginal,
        valor: valorAssinado,
        competencia: req.competencia,
        chaveNatural,
        outflowCategory: req.tipo === "SAIDA" ? req.outflowCategory! : null,
        share: req.tipo === "ENTRADA" ? { payerId: req.payerId!, categoria: req.categoria!, valor: req.valor } : null,
      });
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        throw new AppError("Já existe um lançamento idêntico (mesma data, hora, nome e valor).", 409);
      }
      throw err;
    }
  }
}
