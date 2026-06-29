import {
  autoCategorize,
  buildPayerIndex,
  competenciaPadrao,
  defaultShares,
  fileHash,
  naturalKey,
  suggestSplit,
  type Config as CoreConfig,
  type ImportLineDraft,
  type ImportPreviewResult,
  type Payer as CorePayer,
} from "@pelada/core";
import { prisma } from "../../database/client";
import type { ParsedLine } from "./ParseExtractService";

export class BuildReconciliationService {
  async execute(peladaId: string, lines: ParsedLine[]): Promise<ImportPreviewResult> {
    const [config, courtIdentifiers, payers, existingTx, imports] = await Promise.all([
      prisma.config.findUnique({ where: { peladaId } }),
      prisma.courtIdentifier.findMany({ where: { config: { peladaId } } }),
      prisma.payer.findMany({ where: { peladaId }, include: { aliases: true } }),
      prisma.transaction.findMany({ where: { peladaId }, select: { chaveNatural: true } }),
      prisma.import.findMany({ where: { peladaId }, select: { hash: true } }),
    ]);

    const coreConfig: CoreConfig = {
      valorMensalidade: config?.valorMensalidade ?? 0,
      valorAvulso: config?.valorAvulso ?? 0,
      valorAluguel: config?.valorAluguel ?? 0,
      diaPagamentoQuadra: config?.diaPagamentoQuadra ?? 10,
      identificadoresQuadra: courtIdentifiers.map((c) => c.value),
    };

    const corePayers: CorePayer[] = payers.map((p) => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      ativo: p.ativo,
      desde: p.desde,
      telefone: p.telefone,
      apelidos: p.aliases.map((a) => a.alias),
    }));

    const payerIndex = buildPayerIndex(corePayers);
    const payersById = new Map(corePayers.map((p) => [p.id, p]));
    const existingKeys = new Set(existingTx.map((t) => t.chaveNatural));
    const keysInThisFile = new Set<string>();

    let qtdNovas = 0;
    let qtdDuplicadas = 0;

    const linhas: ImportLineDraft[] = lines.map((line) => {
      const chaveNatural = naturalKey(line);
      const duplicada = existingKeys.has(chaveNatural) || keysInThisFile.has(chaveNatural);
      keysInThisFile.add(chaveNatural);
      if (duplicada) qtdDuplicadas += 1;
      else qtdNovas += 1;

      const auto = autoCategorize(line, coreConfig, payerIndex, payersById);

      // entrada paga após o dia de corte (config.diaPagamentoQuadra) sugere competência do mês
      // seguinte; saídas (aluguel da quadra) continuam pelo mês calendário do pagamento.
      const competencia =
        line.valor > 0 ? competenciaPadrao(line.data, coreConfig.diaPagamentoQuadra) : line.competencia;

      const base: ImportLineDraft = {
        data: line.data,
        hora: line.hora,
        nomeOriginal: line.nomeOriginal,
        valor: line.valor,
        formaPagamento: line.formaPagamento,
        competencia,
        chaveNatural,
        duplicada,
      };

      if (line.valor < 0) {
        return { ...base, outflowCategory: auto.outflowCategory };
      }

      // só divide em cotas quando o valor é múltiplo (>=2) da mensalidade/avulso (DOMAIN.md §5);
      // pagamento "redondo" (1x) fica com uma única cota.
      const sugestao = suggestSplit(line.valor, coreConfig);
      const shares = sugestao
        ? defaultShares(line.valor, coreConfig, line.nomeOriginal).map((s, i) => ({
            valor: s.valor,
            categoria: s.categoria,
            ordem: i,
            payerId: i === 0 ? auto.payerId : null,
            nome: s.nome,
          }))
        : [
            {
              valor: line.valor,
              categoria: auto.shareCategory ?? "OUTRO",
              ordem: 0,
              payerId: auto.payerId,
              nome: line.nomeOriginal,
            },
          ];

      return { ...base, shares, novoPagante: auto.novoPagante };
    });

    const hash = fileHash(lines.map((l) => naturalKey(l)));
    const arquivoIdentico = imports.some((i) => i.hash === hash);

    return { linhas, qtdNovas, qtdDuplicadas, hash, arquivoIdentico };
  }
}
