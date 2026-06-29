import { normalizeName, toTitle } from "../src/name";
import { buildPayerIndex } from "../src/categorize";
import type { Payer } from "../src/types";

describe("normalizeName + buildPayerIndex", () => {
  it("cenário 3: mesma pessoa, grafias diferentes -> resolve para o mesmo payerId", () => {
    const payers: Payer[] = [
      { id: "p1", nome: "Danilo Chaves da Cunha", tipo: "MENSALISTA", ativo: true, apelidos: [] },
    ];
    const idx = buildPayerIndex(payers);

    expect(idx[normalizeName("DANILO CHAVES DA CUNHA")]).toBe("p1");
    expect(idx[normalizeName("Danilo Chaves da Cunha")]).toBe("p1");
  });

  it("cenário 4: pessoa distinta com sobrenome parecido não colide", () => {
    const payers: Payer[] = [
      { id: "p1", nome: "Danilo Chaves da Cunha", tipo: "MENSALISTA", ativo: true, apelidos: [] },
      { id: "p2", nome: "Nicolas Chaves da Cunha", tipo: "MENSALISTA", ativo: true, apelidos: [] },
    ];
    const idx = buildPayerIndex(payers);

    expect(idx[normalizeName("Danilo Chaves da Cunha")]).toBe("p1");
    expect(idx[normalizeName("Nicolas Chaves da Cunha")]).toBe("p2");
    expect(idx[normalizeName("Danilo Chaves da Cunha")]).not.toBe(idx[normalizeName("Nicolas Chaves da Cunha")]);
  });

  it("normaliza acentos e caixa", () => {
    expect(normalizeName("àÁçÇ  Teste")).toBe("AACC TESTE");
  });

  it("normalizeName aceita valor vazio/nulo sem quebrar", () => {
    expect(normalizeName("" as unknown as string)).toBe("");
  });
});

describe("toTitle", () => {
  it("converte para Title Case, normalizando espaços", () => {
    expect(toTitle("DANILO   CHAVES DA CUNHA")).toBe("Danilo Chaves da Cunha");
  });

  it("mantém conectivos em minúsculo, exceto quando são a primeira palavra", () => {
    expect(toTitle("AMIGO DE FULANO DOS SANTOS E SILVA")).toBe("Amigo de Fulano dos Santos e Silva");
    expect(toTitle("da silva")).toBe("Da Silva");
  });

  it("aceita valor vazio/nulo sem quebrar", () => {
    expect(toTitle("" as unknown as string)).toBe("");
  });
});
