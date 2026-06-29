import { parseMoneyToCents, formatBRL } from "../src/money";
import { competenciaPadrao, normalizeDate, ymOf } from "../src/date";
import { telDigits } from "../src/phone";

describe("money", () => {
  it("parseia número e string pt-BR para centavos", () => {
    expect(parseMoneyToCents(70)).toBe(7000);
    expect(parseMoneyToCents("R$ 1.200,00")).toBe(120000);
    expect(parseMoneyToCents("30")).toBe(3000);
    expect(parseMoneyToCents("-15,50")).toBe(-1550);
  });

  it("formata centavos para BRL", () => {
    expect(formatBRL(7000)).toBe("R$ 70,00");
    expect(formatBRL(-1550)).toBe("-R$ 15,50");
  });
});

describe("date", () => {
  it("normaliza ISO e DD/MM/YYYY", () => {
    expect(normalizeDate("2026-04-11")).toBe("2026-04-11");
    expect(normalizeDate("11/04/2026")).toBe("2026-04-11");
  });

  it("ymOf extrai a competência do dia", () => {
    expect(ymOf("2026-04-11")).toBe("2026-04");
  });

  it("normalizeDate retorna vazio para entrada não reconhecida (serial do Excel)", () => {
    expect(normalizeDate("44666")).toBe("");
  });

  it("competenciaPadrao mantém o mês do pagamento até o dia de corte", () => {
    expect(competenciaPadrao("2026-05-15", 15)).toBe("2026-05");
  });

  it("competenciaPadrao empurra para o mês seguinte após o dia de corte", () => {
    expect(competenciaPadrao("2026-05-16", 15)).toBe("2026-06");
    expect(competenciaPadrao("2026-05-29", 15)).toBe("2026-06");
  });

  it("competenciaPadrao empurra para o ano seguinte quando o corte vira dezembro", () => {
    expect(competenciaPadrao("2026-12-20", 15)).toBe("2027-01");
  });
});

describe("phone", () => {
  it("prefixa 55 quando faltar o código do país", () => {
    expect(telDigits("(11) 98888-7777")).toBe("5511988887777");
  });

  it("não duplica o 55 se já tiver", () => {
    expect(telDigits("5511988887777")).toBe("5511988887777");
  });

  it("string vazia retorna vazio", () => {
    expect(telDigits("")).toBe("");
  });
});
