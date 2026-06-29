import {
  autoCategorize,
  buildPayerIndex,
  defaultShares,
  isCourt,
  linhaNeedsSplitNames,
  shareNeedsName,
  suggestSplit,
} from "../src/categorize";
import type { Config, Payer } from "../src/types";

const cfg: Config = {
  valorMensalidade: 7000,
  valorAvulso: 3000,
  valorAluguel: 120000,
  diaPagamentoQuadra: 10,
  identificadoresQuadra: ["IMPACTO ARENA SOCIETY LTDA"],
};

describe("isCourt / autoCategorize", () => {
  it("cenário 5: reconhece a quadra em múltiplos pagamentos do mês (-930 e -140)", () => {
    expect(isCourt("IMPACTO ARENA SOCIETY LTDA", cfg)).toBe(true);
    expect(isCourt("Impacto Arena Society Ltda", cfg)).toBe(true);
    expect(isCourt("Danilo Chaves da Cunha", cfg)).toBe(false);

    const payersById = new Map<string, Payer>();
    const idx = buildPayerIndex([]);

    const saida1 = autoCategorize({ nomeOriginal: "IMPACTO ARENA SOCIETY LTDA", valor: -93000 }, cfg, idx, payersById);
    const saida2 = autoCategorize({ nomeOriginal: "IMPACTO ARENA SOCIETY LTDA", valor: -14000 }, cfg, idx, payersById);

    expect(saida1.outflowCategory).toBe("QUADRA");
    expect(saida2.outflowCategory).toBe("QUADRA");
    expect(saida1.payerId).toBeNull();
  });

  it("saída para destino desconhecido é OUTRA_SAIDA", () => {
    const result = autoCategorize({ nomeOriginal: "Padaria do Zé", valor: -5000 }, cfg, {}, new Map());
    expect(result.outflowCategory).toBe("OUTRA_SAIDA");
  });

  it("entrada de pagante mensalista conhecido -> categoria MENSALIDADE", () => {
    const payer: Payer = { id: "p1", nome: "Danilo Chaves da Cunha", tipo: "MENSALISTA", ativo: true, apelidos: [] };
    const idx = buildPayerIndex([payer]);
    const payersById = new Map([[payer.id, payer]]);

    const result = autoCategorize({ nomeOriginal: "DANILO CHAVES DA CUNHA", valor: 7000 }, cfg, idx, payersById);
    expect(result.shareCategory).toBe("MENSALIDADE");
    expect(result.payerId).toBe("p1");
    expect(result.novoPagante).toBe(false);
  });

  it("entrada de pagante desconhecido com valor de mensalidade -> palpite MENSALIDADE + novoPagante", () => {
    const result = autoCategorize({ nomeOriginal: "Fulano Novo", valor: 7000 }, cfg, {}, new Map());
    expect(result.shareCategory).toBe("MENSALIDADE");
    expect(result.novoPagante).toBe(true);
  });

  it("entrada de pagante desconhecido com valor de avulso -> palpite AVULSO", () => {
    const result = autoCategorize({ nomeOriginal: "Fulano Avulso Novo", valor: 3000 }, cfg, {}, new Map());
    expect(result.shareCategory).toBe("AVULSO");
    expect(result.novoPagante).toBe(true);
  });

  it("entrada de pagante desconhecido com valor que não bate com nada -> chute MENSALIDADE", () => {
    const result = autoCategorize({ nomeOriginal: "Fulano Qualquer Valor", valor: 4500 }, cfg, {}, new Map());
    expect(result.shareCategory).toBe("MENSALIDADE");
    expect(result.novoPagante).toBe(true);
  });
});

describe("suggestSplit / defaultShares (cotas)", () => {
  it("cenário 7: 140 = 2 mensalistas; pagador na 1ª cota, amigo a nomear na 2ª", () => {
    const sug = suggestSplit(14000, cfg);
    expect(sug).toEqual({ k: 2, tipo: "MENSALIDADE" });

    const shares = defaultShares(14000, cfg, "Danilo Chaves da Cunha");
    expect(shares).toHaveLength(2);
    expect(shares[0]).toEqual({ valor: 7000, categoria: "MENSALIDADE", nome: "Danilo Chaves da Cunha" });
    expect(shares[1]).toEqual({ valor: 7000, categoria: "MENSALIDADE", nome: "" });
  });

  it("cenário 8: 60 = 2 avulsos, ambos no pagador por default", () => {
    const sug = suggestSplit(6000, cfg);
    expect(sug).toEqual({ k: 2, tipo: "AVULSO" });

    const shares = defaultShares(6000, cfg, "Danilo Chaves da Cunha");
    expect(shares).toHaveLength(2);
    expect(shares.every((s) => s.categoria === "AVULSO" && s.nome === "Danilo Chaves da Cunha")).toBe(true);
  });

  it("valorMensalidade/valorAvulso zerados não geram divisão por zero", () => {
    const cfgZerado: Config = { ...cfg, valorMensalidade: 0, valorAvulso: 0 };
    expect(suggestSplit(7000, cfgZerado)).toBeNull();
  });

  it("ignora valorAvulso zerado e ainda detecta múltiplo de valorMensalidade", () => {
    const cfgSemAvulso: Config = { ...cfg, valorAvulso: 0 };
    expect(suggestSplit(14000, cfgSemAvulso)).toEqual({ k: 2, tipo: "MENSALIDADE" });
  });

  it("valor não múltiplo de nada cai na divisão genérica em 2", () => {
    expect(suggestSplit(5000, cfg)).toBeNull();
    const shares = defaultShares(5000, cfg, "Fulano");
    expect(shares).toHaveLength(2);
    expect((shares[0]?.valor ?? 0) + (shares[1]?.valor ?? 0)).toBe(5000);
  });
});

describe("shareNeedsName / linhaNeedsSplitNames", () => {
  it("140 = 2 mensalistas sem o nome do amigo informado: precisa de divisão", () => {
    const shares = defaultShares(14000, cfg, "Danilo Chaves da Cunha").map((s, i) => ({ ...s, ordem: i, payerId: null }));
    expect(shareNeedsName(shares[1]!)).toBe(true);
    expect(linhaNeedsSplitNames({ valor: 14000, shares })).toBe(true);
  });

  it("140 = 2 mensalistas com o nome do amigo já informado: não precisa mais", () => {
    const shares = defaultShares(14000, cfg, "Danilo Chaves da Cunha").map((s, i) => ({
      ...s,
      ordem: i,
      payerId: null,
      nome: i === 0 ? s.nome : "Amigo Do Danilo",
    }));
    expect(linhaNeedsSplitNames({ valor: 14000, shares })).toBe(false);
  });

  it("recategorizar a cota sem nome como CONTRIBUICAO dispensa a divisão", () => {
    const shares = defaultShares(14000, cfg, "Danilo Chaves da Cunha").map((s, i) => ({
      ...s,
      ordem: i,
      payerId: null,
      categoria: i === 1 ? ("CONTRIBUICAO" as const) : s.categoria,
    }));
    expect(linhaNeedsSplitNames({ valor: 14000, shares })).toBe(false);
  });

  it("60 = 2 avulsos, ambos com nome (default), nunca precisa de divisão", () => {
    const shares = defaultShares(6000, cfg, "Danilo Chaves da Cunha").map((s, i) => ({
      ...s,
      ordem: i,
      payerId: null,
    }));
    expect(linhaNeedsSplitNames({ valor: 6000, shares })).toBe(false);
  });

  it("cota com payerId resolvido nunca precisa de nome digitado", () => {
    expect(shareNeedsName({ categoria: "MENSALIDADE", payerId: "p1", nome: "" })).toBe(false);
  });
});
