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
});
