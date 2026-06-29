import {
  addMonths,
  caixaAcumulado,
  computeReport,
  formatBRL,
  type Config as CoreConfig,
  type Payer as CorePayer,
  type Transaction as CoreTransaction,
} from "@pelada/core";
import { prisma } from "../../database/client";

export class GetMonthlyReportService {
  async execute(peladaId: string, competencia: string) {
    const [config, allTx, payers] = await Promise.all([
      prisma.config.findUnique({ where: { peladaId } }),
      prisma.transaction.findMany({ where: { peladaId }, include: { shares: true } }),
      prisma.payer.findMany({ where: { peladaId } }),
    ]);

    const coreConfig: CoreConfig | undefined = config
      ? {
          valorMensalidade: config.valorMensalidade,
          valorAvulso: config.valorAvulso,
          valorAluguel: config.valorAluguel,
          diaPagamentoQuadra: config.diaPagamentoQuadra,
          identificadoresQuadra: [],
        }
      : undefined;

    const coreTx: CoreTransaction[] = allTx.map((t) => ({
      id: t.id,
      data: t.data,
      hora: t.hora,
      nomeOriginal: t.nomeOriginal,
      valor: t.valor,
      formaPagamento: t.formaPagamento,
      competencia: t.competencia,
      chaveNatural: t.chaveNatural,
      ignorada: t.ignorada,
      outflowCategory: t.outflowCategory,
      shares: t.shares.map((s) => ({
        valor: s.valor,
        categoria: s.categoria,
        payerId: s.payerId,
        ordem: s.ordem,
      })),
    }));

    const corePayers: CorePayer[] = payers.map((p) => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      ativo: p.ativo,
      desde: p.desde,
      telefone: p.telefone,
      apelidos: [],
    }));

    const report = computeReport(competencia, coreTx, corePayers, coreConfig);
    // caixa no início = acumulado até a competência anterior (o que já estava em caixa antes desta);
    // caixa no final = acumulado incluindo esta competência.
    const caixaInicial = caixaAcumulado(addMonths(competencia, -1), coreTx, corePayers, coreConfig);
    const caixaFinal = caixaAcumulado(competencia, coreTx, corePayers, coreConfig);
    // variação percentual do caixa na competência; sem base (caixa inicial = 0) não dá pra calcular %.
    const caixaVariacaoPct = caixaInicial === 0 ? null : ((caixaFinal - caixaInicial) / Math.abs(caixaInicial)) * 100;

    const quadraTransactions = allTx.filter(
      (t) => t.competencia === competencia && t.outflowCategory === "QUADRA" && !t.ignorada,
    );

    return {
      competencia,
      entrou: formatBRL(report.totalEntradas),
      saiu: formatBRL(report.totalSaidas),
      saldo: formatBRL(report.saldo),
      caixaInicial: formatBRL(caixaInicial),
      caixaFinal: formatBRL(caixaFinal),
      caixaVariacaoPct,
      quadra: {
        paga: report.quadraPaga,
        total: formatBRL(report.totalQuadra),
        pagamentos: quadraTransactions.map((t) => ({ data: t.data, valor: formatBRL(Math.abs(t.valor)) })),
        diaPagamento: config?.diaPagamentoQuadra ?? null,
        valorReferencia: config ? formatBRL(config.valorAluguel) : null,
      },
      mensalistas: corePayers
        .filter((p) => p.tipo === "MENSALISTA" && p.ativo && (!p.desde || p.desde <= competencia))
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          pago: report.mensalistasPagaram.has(p.id),
          telefone: p.telefone,
        })),
      avulsoCount: report.avulsoCount,
      inadimplentes: report.inadimplentes.map((p) => ({ id: p.id, nome: p.nome, telefone: p.telefone })),
    };
  }
}
