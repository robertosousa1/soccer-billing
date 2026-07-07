import {
  addMonths,
  caixaAcumulado,
  competenciaPeriodo,
  computeReport,
  formatBRL,
  resolveTipoEDesde,
  type Config as CoreConfig,
  type Payer as CorePayer,
  type PayerTypeChange as CorePayerTypeChange,
  type Transaction as CoreTransaction,
} from "@pelada/core";
import { prisma } from "../../database/client";

export class GetMonthlyReportService {
  async execute(peladaId: string, competencia: string) {
    const [config, configSnap, allTx, payers, typeChanges, abonos] = await Promise.all([
      prisma.config.findUnique({ where: { peladaId } }),
      prisma.configHistory.findUnique({ where: { peladaId_competencia: { peladaId, competencia } } }),
      prisma.transaction.findMany({ where: { peladaId }, include: { shares: true } }),
      prisma.payer.findMany({ where: { peladaId } }),
      prisma.payerTypeChange.findMany({ where: { payer: { peladaId } } }),
      prisma.payerAbono.findMany({ where: { peladaId, competencia } }),
    ]);

    const corePayerTypeChanges: CorePayerTypeChange[] = typeChanges.map((c) => ({
      payerId: c.payerId,
      tipo: c.tipo,
      vigenteDesde: c.vigenteDesde,
    }));

    // Snapshot prevalece sobre config atual para valorAluguel e diaPagamentoQuadra.
    const coreConfig: CoreConfig | undefined = config
      ? {
          valorMensalidade: config.valorMensalidade,
          valorAvulso: config.valorAvulso,
          valorAluguel: configSnap?.valorAluguel ?? config.valorAluguel,
          diaPagamentoQuadra: configSnap?.diaPagamentoQuadra ?? config.diaPagamentoQuadra,
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

    const abonadoIds = new Set(abonos.map((a) => a.payerId));
    const abonadoMotivo = new Map(abonos.map((a) => [a.payerId, a.motivo]));
    const report = computeReport(competencia, coreTx, corePayers, coreConfig, corePayerTypeChanges, abonadoIds);
    // caixa no início = acumulado até a competência anterior (o que já estava em caixa antes desta);
    // caixa no final = acumulado incluindo esta competência.
    const caixaInicial = caixaAcumulado(addMonths(competencia, -1), coreTx, corePayers, coreConfig);
    const caixaFinal = caixaAcumulado(competencia, coreTx, corePayers, coreConfig);
    // variação percentual do caixa na competência; sem base (caixa inicial = 0) não dá pra calcular %.
    const caixaVariacaoPct = caixaInicial === 0 ? null : ((caixaFinal - caixaInicial) / Math.abs(caixaInicial)) * 100;

    const quadraTransactions = allTx.filter(
      (t) => t.competencia === competencia && t.outflowCategory === "QUADRA" && !t.ignorada,
    );

    const avulsoContagemMap = new Map<string, number>();
    const contribuicoesMap = new Map<string, { nome: string; centavos: number }>();
    for (const tx of allTx) {
      if (tx.competencia !== competencia || tx.ignorada) continue;
      for (const share of tx.shares) {
        if (share.categoria === "AVULSO" && share.payerId) {
          avulsoContagemMap.set(share.payerId, (avulsoContagemMap.get(share.payerId) ?? 0) + 1);
        }
        if (share.categoria === "CONTRIBUICAO") {
          const key = share.payerId ?? tx.nomeOriginal;
          const nome = share.payerId
            ? (payers.find((p) => p.id === share.payerId)?.nome ?? tx.nomeOriginal)
            : tx.nomeOriginal;
          const entry = contribuicoesMap.get(key);
          if (entry) {
            entry.centavos += share.valor;
          } else {
            contribuicoesMap.set(key, { nome, centavos: share.valor });
          }
        }
      }
    }
    const contribuicoes = Array.from(contribuicoesMap.values()).map(({ nome, centavos }) => ({
      nome,
      valor: formatBRL(centavos),
    }));

    return {
      competencia,
      periodo: competenciaPeriodo(competencia, configSnap?.diaPagamentoQuadra ?? config?.diaPagamentoQuadra ?? 1),
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
        diaPagamento: configSnap?.diaPagamentoQuadra ?? config?.diaPagamentoQuadra ?? null,
        valorReferencia: config ? formatBRL(configSnap?.valorAluguel ?? config.valorAluguel) : null,
      },
      mensalistas: corePayers
        .filter((p) => {
          if (!p.ativo) return false;
          const { tipo, desde } = resolveTipoEDesde(p, corePayerTypeChanges, competencia);
          return tipo === "MENSALISTA" && (!desde || desde <= competencia);
        })
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          pago: report.mensalistasPagaram.has(p.id),
          abonado: abonadoIds.has(p.id),
          telefone: p.telefone,
        })),
      avulsoCount: report.avulsoCount,
      avulsos: report.avulsos.map((p) => ({ id: p.id, nome: p.nome, telefone: p.telefone, vezes: avulsoContagemMap.get(p.id) ?? 1 })),
      inadimplentes: report.inadimplentes.map((p) => ({ id: p.id, nome: p.nome, telefone: p.telefone })),
      abonados: report.abonados.map((p) => ({ id: p.id, nome: p.nome, motivo: abonadoMotivo.get(p.id) ?? "" })),
      contribuicoes,
    };
  }
}
