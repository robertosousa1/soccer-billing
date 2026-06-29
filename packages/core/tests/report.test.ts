import { caixaAcumulado, computeReport, resolveTipoEDesde } from "../src/report";
import type { Config, Payer, PayerTypeChange, Transaction } from "../src/types";

const danilo: Payer = { id: "danilo", nome: "Danilo Chaves da Cunha", tipo: "MENSALISTA", ativo: true, desde: "2026-04", apelidos: [] };
const amigo: Payer = { id: "amigo", nome: "Amigo do Danilo", tipo: "MENSALISTA", ativo: true, desde: "2026-04", apelidos: [] };
const nicolas: Payer = { id: "nicolas", nome: "Nicolas Chaves da Cunha", tipo: "MENSALISTA", ativo: true, desde: "2026-04", apelidos: [] };

describe("computeReport", () => {
  it("cenário 7: um pagamento de 140 dividido em 2 cotas marca os DOIS mensalistas como pagos (amigo não inadimplente)", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        data: "2026-04-11",
        hora: "10:00",
        nomeOriginal: "Danilo Chaves da Cunha",
        valor: 14000,
        competencia: "2026-04",
        chaveNatural: "k1",
        shares: [
          { valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 },
          { valor: 7000, categoria: "MENSALIDADE", payerId: "amigo", ordem: 1 },
        ],
      },
    ];
    const payers = [danilo, amigo, nicolas];

    const report = computeReport("2026-04", transactions, payers);

    // o dinheiro entra UMA vez (valor da transação), não a soma das cotas
    expect(report.totalEntradas).toBe(14000);
    expect(report.mensalistasPagaram.has("danilo")).toBe(true);
    expect(report.mensalistasPagaram.has("amigo")).toBe(true);
    // só nicolas (que não pagou nada) cai em inadimplência
    expect(report.inadimplentes.map((p) => p.id)).toEqual(["nicolas"]);
  });

  it("cenário 8: 60 = 2 cotas de avulso contam 2 no avulsoCount", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        data: "2026-04-12",
        hora: "11:00",
        nomeOriginal: "Fulano Avulso",
        valor: 6000,
        competencia: "2026-04",
        chaveNatural: "k2",
        shares: [
          { valor: 3000, categoria: "AVULSO", payerId: "fulano", ordem: 0 },
          { valor: 3000, categoria: "AVULSO", payerId: "fulano", ordem: 1 },
        ],
      },
    ];
    const report = computeReport("2026-04", transactions, []);
    expect(report.avulsoCount).toBe(2);
  });

  it("avulsos: lista os pagantes distintos de cotas AVULSO no mês, sem duplicar quem pagou mais de uma cota", () => {
    const fulano: Payer = { id: "fulano", nome: "Fulano Avulso", tipo: "AVULSO", ativo: true, apelidos: [] };
    const ciclano: Payer = { id: "ciclano", nome: "Ciclano Avulso", tipo: "AVULSO", ativo: true, apelidos: [] };
    const transactions: Transaction[] = [
      {
        id: "t1",
        data: "2026-04-12",
        hora: "11:00",
        nomeOriginal: "Fulano Avulso",
        valor: 6000,
        competencia: "2026-04",
        chaveNatural: "k2",
        shares: [
          { valor: 3000, categoria: "AVULSO", payerId: "fulano", ordem: 0 },
          { valor: 3000, categoria: "AVULSO", payerId: "fulano", ordem: 1 },
        ],
      },
      {
        id: "t2",
        data: "2026-04-13",
        hora: "11:00",
        nomeOriginal: "Ciclano Avulso",
        valor: 3000,
        competencia: "2026-04",
        chaveNatural: "k3",
        shares: [{ valor: 3000, categoria: "AVULSO", payerId: "ciclano", ordem: 0 }],
      },
    ];
    const report = computeReport("2026-04", transactions, [fulano, ciclano]);
    expect(report.avulsoCount).toBe(3);
    expect(report.avulsos.map((p) => p.id).sort()).toEqual(["ciclano", "fulano"]);
  });

  it("avulsos: cota AVULSO sem payerId não aparece na lista (mas conta em avulsoCount)", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        data: "2026-04-12",
        hora: "11:00",
        nomeOriginal: "Avulso Não Identificado",
        valor: 3000,
        competencia: "2026-04",
        chaveNatural: "k2",
        shares: [{ valor: 3000, categoria: "AVULSO", payerId: null, ordem: 0 }],
      },
    ];
    const report = computeReport("2026-04", transactions, []);
    expect(report.avulsoCount).toBe(1);
    expect(report.avulsos).toHaveLength(0);
  });

  it("cenário 5: saídas QUADRA somam no totalQuadra e marcam quadraPaga", () => {
    const transactions: Transaction[] = [
      { id: "s1", data: "2026-05-05", hora: "09:00", nomeOriginal: "IMPACTO ARENA SOCIETY LTDA", valor: -93000, competencia: "2026-05", chaveNatural: "k3", outflowCategory: "QUADRA" },
      { id: "s2", data: "2026-05-20", hora: "09:00", nomeOriginal: "IMPACTO ARENA SOCIETY LTDA", valor: -14000, competencia: "2026-05", chaveNatural: "k4", outflowCategory: "QUADRA" },
    ];
    const report = computeReport("2026-05", transactions, []);
    expect(report.totalQuadra).toBe(107000);
    expect(report.quadraPaga).toBe(true);
    expect(report.totalSaidas).toBe(107000);
  });

  it("sem nenhuma saída de QUADRA no mês -> quadraPaga é false", () => {
    const report = computeReport("2026-05", [], []);
    expect(report.quadraPaga).toBe(false);
    expect(report.totalQuadra).toBe(0);
  });

  it("transação marcada como ignorada não entra em nenhum total", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        data: "2026-04-11",
        hora: "10:00",
        nomeOriginal: "Danilo",
        valor: 7000,
        competencia: "2026-04",
        chaveNatural: "k1",
        ignorada: true,
        shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }],
      },
    ];
    const report = computeReport("2026-04", transactions, [danilo]);
    expect(report.totalEntradas).toBe(0);
    expect(report.mensalistasPagaram.has("danilo")).toBe(false);
  });

  it("cenário 9 (inadimplência): mensalista ativo com desde futuro não conta como inadimplente no mês anterior", () => {
    const futuro: Payer = { id: "futuro", nome: "Futuro Membro", tipo: "MENSALISTA", ativo: true, desde: "2026-07", apelidos: [] };
    const report = computeReport("2026-06", [], [futuro]);
    expect(report.inadimplentes).toHaveLength(0);
  });

  it("mensalista inativo nunca conta como inadimplente", () => {
    const inativo: Payer = { id: "inativo", nome: "Saiu do Grupo", tipo: "MENSALISTA", ativo: false, desde: "2026-01", apelidos: [] };
    const report = computeReport("2026-06", [], [inativo]);
    expect(report.inadimplentes).toHaveLength(0);
  });

  it("avulso nunca conta como inadimplente", () => {
    const avulso: Payer = { id: "avulso", nome: "Joga de Vez em Quando", tipo: "AVULSO", ativo: true, apelidos: [] };
    const report = computeReport("2026-06", [], [avulso]);
    expect(report.inadimplentes).toHaveLength(0);
  });

  it("cenário 10: Config snapshot — computeReport nunca lê Config, só os valores já gravados nas cotas", () => {
    const transactions: Transaction[] = [
      {
        id: "t1",
        data: "2026-03-15",
        hora: "10:00",
        nomeOriginal: "Danilo Chaves da Cunha",
        valor: 6000, // valor histórico da mensalidade quando foi paga (preço antigo)
        competencia: "2026-03",
        chaveNatural: "k1",
        shares: [{ valor: 6000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }],
      },
    ];
    const report1 = computeReport("2026-03", transactions, [danilo]);
    // simula mudança de Config.valorMensalidade (70 -> 90): computeReport não recebe Config,
    // então o relatório do mês já lançado não pode mudar, independente do "novo" valor.
    const report2 = computeReport("2026-03", transactions, [danilo]);

    expect(report1.totalEntradas).toBe(report2.totalEntradas);
    expect(report1.mensalistasPagaram).toEqual(report2.mensalistasPagaram);
    expect(report1.totalEntradas).toBe(6000); // mantém o valor histórico, não o "novo"
  });
});

describe("computeReport — antecipação da quadra", () => {
  const config: Config = {
    valorMensalidade: 7000,
    valorAvulso: 3000,
    valorAluguel: 90000,
    diaPagamentoQuadra: 20,
    identificadoresQuadra: ["IMPACTO ARENA"],
  };

  it("quadra paga adiantada (antes do dia configurado): entradas seguintes contam no caixa do mês seguinte", () => {
    const transactions: Transaction[] = [
      // quadra paga em cheio dia 05, bem antes do vencimento (dia 20)
      { id: "s1", data: "2026-05-05", hora: "09:00", nomeOriginal: "IMPACTO ARENA", valor: -90000, competencia: "2026-05", chaveNatural: "k1", outflowCategory: "QUADRA" },
      // chegou antes da quadra ser paga -> fica em maio
      { id: "t1", data: "2026-05-04", hora: "10:00", nomeOriginal: "Danilo", valor: 7000, competencia: "2026-05", chaveNatural: "k2", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }] },
      // chegou depois da quadra paga, ainda antes do vencimento -> antecipa pro caixa de junho
      { id: "t2", data: "2026-05-10", hora: "10:00", nomeOriginal: "Nicolas", valor: 7000, competencia: "2026-05", chaveNatural: "k3", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "nicolas", ordem: 0 }] },
    ];
    const payers = [danilo, nicolas];

    const maio = computeReport("2026-05", transactions, payers, config);
    expect(maio.totalEntradas).toBe(7000); // só o t1, o t2 antecipou pro caixa de junho
    expect(maio.saldo).toBe(7000 - 90000);
    // quem pagou o quê não muda: ambos continuam "mensalidade paga" em maio
    expect(maio.mensalistasPagaram.has("danilo")).toBe(true);
    expect(maio.mensalistasPagaram.has("nicolas")).toBe(true);

    const junho = computeReport("2026-06", transactions, payers, config);
    expect(junho.totalEntradas).toBe(7000); // o valor antecipado de t2
    expect(junho.saldo).toBe(7000);
    // mas em junho ninguém pagou mensalidade de fato (nenhuma cota lançada em junho)
    expect(junho.mensalistasPagaram.size).toBe(0);
  });

  it("quadra só atinge o valor no dia do vencimento (ou depois): sem antecipação", () => {
    const transactions: Transaction[] = [
      { id: "s1", data: "2026-05-20", hora: "00:00", nomeOriginal: "IMPACTO ARENA", valor: -90000, competencia: "2026-05", chaveNatural: "k1", outflowCategory: "QUADRA" },
      { id: "t1", data: "2026-05-25", hora: "10:00", nomeOriginal: "Danilo", valor: 7000, competencia: "2026-05", chaveNatural: "k2", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }] },
    ];
    const report = computeReport("2026-05", transactions, [danilo], config);
    expect(report.totalEntradas).toBe(7000);
  });

  it("quadra paga em parte (não atinge valorAluguel): sem antecipação", () => {
    const transactions: Transaction[] = [
      { id: "s1", data: "2026-05-05", hora: "09:00", nomeOriginal: "IMPACTO ARENA", valor: -50000, competencia: "2026-05", chaveNatural: "k1", outflowCategory: "QUADRA" },
      { id: "t1", data: "2026-05-10", hora: "10:00", nomeOriginal: "Danilo", valor: 7000, competencia: "2026-05", chaveNatural: "k2", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }] },
    ];
    const report = computeReport("2026-05", transactions, [danilo], config);
    expect(report.totalEntradas).toBe(7000);
  });

  it("sem config: comportamento idêntico ao de antes (nunca antecipa)", () => {
    const transactions: Transaction[] = [
      { id: "s1", data: "2026-05-05", hora: "09:00", nomeOriginal: "IMPACTO ARENA", valor: -90000, competencia: "2026-05", chaveNatural: "k1", outflowCategory: "QUADRA" },
      { id: "t1", data: "2026-05-10", hora: "10:00", nomeOriginal: "Danilo", valor: 7000, competencia: "2026-05", chaveNatural: "k2", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }] },
    ];
    const report = computeReport("2026-05", transactions, [danilo]);
    expect(report.totalEntradas).toBe(7000);
  });
});

describe("resolveTipoEDesde / computeReport com histórico de tipo", () => {
  it("mensalista que virou avulso: competência anterior à mudança continua MENSALISTA (e inadimplente se não pagou)", () => {
    const pagante: Payer = { id: "p1", nome: "Pagante", tipo: "AVULSO", ativo: true, desde: null, apelidos: [] };
    const changes: PayerTypeChange[] = [{ payerId: "p1", tipo: "AVULSO", vigenteDesde: "2026-06" }];

    const antes = resolveTipoEDesde(pagante, changes, "2026-05");
    expect(antes).toEqual({ tipo: "MENSALISTA", desde: null });

    const depois = resolveTipoEDesde(pagante, changes, "2026-06");
    expect(depois).toEqual({ tipo: "AVULSO", desde: null });

    const reportAntes = computeReport("2026-05", [], [pagante], undefined, changes);
    expect(reportAntes.inadimplentes.map((p) => p.id)).toEqual(["p1"]);

    const reportDepois = computeReport("2026-06", [], [pagante], undefined, changes);
    expect(reportDepois.inadimplentes).toHaveLength(0);
  });

  it("avulso que virou mensalista: competência anterior à mudança continua AVULSO (nunca inadimplente), a partir da mudança passa a contar", () => {
    const pagante: Payer = { id: "p2", nome: "Pagante", tipo: "MENSALISTA", ativo: true, desde: "2026-06", apelidos: [] };
    const changes: PayerTypeChange[] = [{ payerId: "p2", tipo: "MENSALISTA", vigenteDesde: "2026-06" }];

    const antes = resolveTipoEDesde(pagante, changes, "2026-05");
    expect(antes).toEqual({ tipo: "AVULSO", desde: null });

    const reportAntes = computeReport("2026-05", [], [pagante], undefined, changes);
    expect(reportAntes.inadimplentes).toHaveLength(0);

    const reportDepois = computeReport("2026-06", [], [pagante], undefined, changes);
    expect(reportDepois.inadimplentes.map((p) => p.id)).toEqual(["p2"]);
  });

  it("múltiplas trocas (mensalista -> avulso -> mensalista) resolvem corretamente em cada competência", () => {
    const pagante: Payer = { id: "p3", nome: "Pagante", tipo: "MENSALISTA", ativo: true, desde: "2026-08", apelidos: [] };
    const changes: PayerTypeChange[] = [
      { payerId: "p3", tipo: "AVULSO", vigenteDesde: "2026-06" },
      { payerId: "p3", tipo: "MENSALISTA", vigenteDesde: "2026-08" },
    ];

    expect(resolveTipoEDesde(pagante, changes, "2026-05")).toEqual({ tipo: "MENSALISTA", desde: "2026-08" });
    expect(resolveTipoEDesde(pagante, changes, "2026-06")).toEqual({ tipo: "AVULSO", desde: null });
    expect(resolveTipoEDesde(pagante, changes, "2026-07")).toEqual({ tipo: "AVULSO", desde: null });
    expect(resolveTipoEDesde(pagante, changes, "2026-08")).toEqual({ tipo: "MENSALISTA", desde: "2026-08" });
  });

  it("sem histórico (payerTypeChanges padrão []): comportamento idêntico ao de antes, usa tipo/desde atuais", () => {
    const pagante: Payer = { id: "p4", nome: "Pagante", tipo: "MENSALISTA", ativo: true, desde: "2026-01", apelidos: [] };
    const report = computeReport("2026-06", [], [pagante]);
    expect(report.inadimplentes.map((p) => p.id)).toEqual(["p4"]);
  });
});

describe("caixaAcumulado", () => {
  it("soma os saldos de todos os meses até o mês corrente, em ordem", () => {
    const transactions: Transaction[] = [
      { id: "t1", data: "2026-04-11", hora: "10:00", nomeOriginal: "Danilo", valor: 7000, competencia: "2026-04", chaveNatural: "k1", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }] },
      { id: "s1", data: "2026-04-12", hora: "09:00", nomeOriginal: "IMPACTO ARENA SOCIETY LTDA", valor: -3000, competencia: "2026-04", chaveNatural: "k2", outflowCategory: "QUADRA" },
      { id: "t2", data: "2026-05-11", hora: "10:00", nomeOriginal: "Danilo", valor: 7000, competencia: "2026-05", chaveNatural: "k3", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "danilo", ordem: 0 }] },
    ];
    // abril: saldo = 7000 - 3000 = 4000; maio: saldo = 7000; acumulado até maio = 11000
    expect(caixaAcumulado("2026-05", transactions, [danilo])).toBe(11000);
    // acumulado até abril ignora maio
    expect(caixaAcumulado("2026-04", transactions, [danilo])).toBe(4000);
  });

  it("antecipação da quadra: o valor antecipado chega no caixa acumulado do mês seguinte, mesmo sem nenhum outro lançamento nele", () => {
    const config: Config = {
      valorMensalidade: 7000,
      valorAvulso: 3000,
      valorAluguel: 90000,
      diaPagamentoQuadra: 20,
      identificadoresQuadra: [],
    };
    const transactions: Transaction[] = [
      { id: "s1", data: "2026-05-05", hora: "09:00", nomeOriginal: "IMPACTO ARENA", valor: -90000, competencia: "2026-05", chaveNatural: "k1", outflowCategory: "QUADRA" },
      { id: "t1", data: "2026-05-10", hora: "10:00", nomeOriginal: "Nicolas", valor: 7000, competencia: "2026-05", chaveNatural: "k2", shares: [{ valor: 7000, categoria: "MENSALIDADE", payerId: "nicolas", ordem: 0 }] },
    ];
    // maio: saldo = 0 (7000 antecipado pro caixa de junho) - 90000 = -90000
    // junho: saldo = 7000 (o valor antecipado), embora não exista nenhum lançamento com competencia 2026-06
    expect(caixaAcumulado("2026-06", transactions, [nicolas], config)).toBe(-90000 + 7000);
  });
});
