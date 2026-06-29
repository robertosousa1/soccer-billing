import * as core from "../src/index";

describe("index", () => {
  it("re-exporta as funções públicas do domínio", () => {
    expect(typeof core.normalizeName).toBe("function");
    expect(typeof core.parseMoneyToCents).toBe("function");
    expect(typeof core.formatBRL).toBe("function");
    expect(typeof core.naturalKey).toBe("function");
    expect(typeof core.computeReport).toBe("function");
    expect(typeof core.caixaAcumulado).toBe("function");
    expect(typeof core.telDigits).toBe("function");
  });
});
