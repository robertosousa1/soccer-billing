import type { Payer, PayerAlias } from "@prisma/client";
import { formatDateBR } from "@pelada/core";

type PayerWithAliases = Payer & { aliases: PayerAlias[] };

export class PayerMapper {
  static toDTO(payer: PayerWithAliases) {
    return {
      id: payer.id,
      nome: payer.nome,
      tipo: payer.tipo,
      ativo: payer.ativo,
      desde: payer.desde,
      telefone: payer.telefone,
      apelidos: payer.aliases.map((a) => a.alias),
      cadastradoEm: formatDateBR(payer.createdAt),
    };
  }
}
