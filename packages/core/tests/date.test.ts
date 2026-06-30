import { competenciaPeriodo } from "../src/date";

describe("competenciaPeriodo", () => {
  it("retorna o primeiro e o último dia de um mês com 31 dias", () => {
    expect(competenciaPeriodo("2026-01")).toEqual({ inicio: "2026-01-01", fim: "2026-01-31" });
  });

  it("retorna o primeiro e o último dia de um mês com 30 dias", () => {
    expect(competenciaPeriodo("2026-04")).toEqual({ inicio: "2026-04-01", fim: "2026-04-30" });
  });

  it("considera ano bissexto em fevereiro", () => {
    expect(competenciaPeriodo("2024-02")).toEqual({ inicio: "2024-02-01", fim: "2024-02-29" });
  });

  it("considera ano não bissexto em fevereiro", () => {
    expect(competenciaPeriodo("2026-02")).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
  });

  describe("com dia > 1 (ciclo por dia de pagamento)", () => {
    it("dia 15: competência 2026-05 vai de 15/04 a 14/05", () => {
      expect(competenciaPeriodo("2026-05", 15)).toEqual({ inicio: "2026-04-15", fim: "2026-05-14" });
    });

    it("dia 15: competência 2026-01 cruza virada de ano (15/12/2025 a 14/01/2026)", () => {
      expect(competenciaPeriodo("2026-01", 15)).toEqual({ inicio: "2025-12-15", fim: "2026-01-14" });
    });

    it("dia 2: competência 2026-03 vai de 02/02 a 01/03", () => {
      expect(competenciaPeriodo("2026-03", 2)).toEqual({ inicio: "2026-02-02", fim: "2026-03-01" });
    });
  });
});
