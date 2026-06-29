import { addMonths } from "./date";
import type { Config, Payer, Share, Transaction } from "./types";

export interface MonthlyReport {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  totalQuadra: number;
  quadraPaga: boolean;
  mensalistasPagaram: Set<string>;
  avulsoCount: number;
  avulsos: Payer[];
  inadimplentes: Payer[];
}

/** cotas de uma entrada: usa shares se houver, senão sintetiza 1 cota. */
function sharesOf(t: Transaction): Share[] {
  if (t.valor <= 0) return [];
  if (t.shares && t.shares.length) return t.shares;
  return [{ valor: t.valor, categoria: "OUTRO", payerId: null, ordem: 0 }]; // fallback defensivo
}

const dataHora = (t: Transaction): string => `${t.data}T${t.hora}`;

/**
 * Se as saídas QUADRA do mês `ym` atingiram `config.valorAluguel` antes do dia
 * `config.diaPagamentoQuadra` (quadra paga adiantada), retorna o instante (data+hora) em que
 * isso aconteceu. Senão, `null` (quadra não paga, paga em parte, ou só atingiu o valor no dia
 * do vencimento ou depois — pagamento "no prazo", sem antecipação).
 */
function antecipacaoQuadra(transactions: Transaction[], config: Config, ym: string): string | null {
  const quadra = transactions
    .filter((t) => t.competencia === ym && !t.ignorada && t.outflowCategory === "QUADRA")
    .sort((a, b) => dataHora(a).localeCompare(dataHora(b)));

  const vencimento = `${ym}-${String(config.diaPagamentoQuadra).padStart(2, "0")}T00:00`;

  let acumulado = 0;
  for (const t of quadra) {
    acumulado += Math.abs(t.valor);
    if (acumulado >= config.valorAluguel) {
      const corte = dataHora(t);
      return corte < vencimento ? corte : null;
    }
  }
  return null;
}

/** Entradas do mês `ym` que chegaram depois da quadra ter sido paga adiantada (ver `antecipacaoQuadra`). */
function entradasAposAntecipacao(transactions: Transaction[], config: Config | undefined, ym: string): Transaction[] {
  if (!config) return [];
  const corte = antecipacaoQuadra(transactions, config, ym);
  if (!corte) return [];
  return transactions.filter((t) => t.competencia === ym && !t.ignorada && t.valor > 0 && dataHora(t) > corte);
}

/**
 * `config` é opcional e usado só para a regra de antecipação da quadra (abaixo) — todo o
 * resto do relatório (quem pagou, inadimplência, totais de saída) deriva exclusivamente dos
 * lançamentos salvos, nunca da config (ver DOMAIN.md §11).
 *
 * Regra de antecipação: se a quadra do mês foi paga (saídas QUADRA somam >= valorAluguel)
 * antes do dia `diaPagamentoQuadra`, todo valor que entrar depois dessa saída conta como caixa
 * da competência **seguinte**, mesmo que a data ainda seja anterior ao vencimento da quadra.
 * Só desloca o caixa (totalEntradas/saldo) — quem pagou o quê (mensalistasPagaram, avulsoCount,
 * inadimplentes) continua atribuído à competência em que o lançamento foi de fato registrado.
 */
export function computeReport(ym: string, transactions: Transaction[], payers: Payer[], config?: Config): MonthlyReport {
  const tx = transactions.filter((t) => t.competencia === ym && !t.ignorada);
  const entradas = tx.filter((t) => t.valor > 0);
  const saidas = tx.filter((t) => t.valor < 0);
  const cotas = entradas.flatMap(sharesOf);
  const totalSaidas = saidas.reduce((s, t) => s + Math.abs(t.valor), 0);
  const quadra = saidas.filter((t) => t.outflowCategory === "QUADRA");
  const totalQuadra = quadra.reduce((s, t) => s + Math.abs(t.valor), 0);
  const mensalistasPagaram = new Set(
    cotas.filter((c) => c.categoria === "MENSALIDADE" && c.payerId).map((c) => c.payerId as string),
  );
  const avulsoCount = cotas.filter((c) => c.categoria === "AVULSO").length;
  const avulsoPayerIds = new Set(
    cotas.filter((c) => c.categoria === "AVULSO" && c.payerId).map((c) => c.payerId as string),
  );
  const avulsos = payers.filter((p) => avulsoPayerIds.has(p.id));
  const inadimplentes = payers.filter(
    (p) => p.ativo && p.tipo === "MENSALISTA" && (!p.desde || p.desde <= ym) && !mensalistasPagaram.has(p.id),
  );

  const antecipadasSaindo = new Set(entradasAposAntecipacao(transactions, config, ym).map((t) => t.id));
  const antecipadasEntrando = entradasAposAntecipacao(transactions, config, addMonths(ym, -1));
  const totalEntradas =
    entradas.filter((t) => !antecipadasSaindo.has(t.id)).reduce((s, t) => s + t.valor, 0) +
    antecipadasEntrando.reduce((s, t) => s + t.valor, 0);

  return {
    totalEntradas,
    totalSaidas,
    saldo: totalEntradas - totalSaidas,
    totalQuadra,
    quadraPaga: quadra.length > 0,
    mensalistasPagaram,
    avulsoCount,
    avulsos,
    inadimplentes,
  };
}

export function caixaAcumulado(ym: string, transactions: Transaction[], payers: Payer[], config?: Config): number {
  if (transactions.length === 0) return 0;
  const inicio = [...transactions.map((t) => t.competencia)].sort()[0] as string;

  let acc = 0;
  for (let m = inicio; m <= ym; m = addMonths(m, 1)) {
    acc += computeReport(m, transactions, payers, config).saldo;
  }
  return acc;
}
