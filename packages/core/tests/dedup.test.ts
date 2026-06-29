import { naturalKey, fileHash } from "../src/dedup";
import type { Transaction } from "../src/types";

function tx(partial: Partial<Transaction> & Pick<Transaction, "data" | "hora" | "nomeOriginal" | "valor">) {
  return { ignorada: false, ...partial } as Transaction;
}

describe("dedup", () => {
  it("cenário 1: arquivo idêntico gera a mesma chave natural e o mesmo hash", () => {
    const extrato = [
      tx({ data: "2026-04-11", hora: "10:00", nomeOriginal: "Danilo Chaves da Cunha", valor: 7000, competencia: "2026-04", chaveNatural: "", id: "1" }),
      tx({ data: "2026-04-12", hora: "11:00", nomeOriginal: "MX SERVICOS E CONSTRUCAO LTDA", valor: 3000, competencia: "2026-04", chaveNatural: "", id: "2" }),
    ];
    const keys1 = extrato.map((t) => naturalKey(t));
    const keys2 = extrato.map((t) => naturalKey(t)); // "reimportação" do mesmo arquivo

    expect(keys1).toEqual(keys2);
    expect(fileHash(keys1)).toBe(fileHash(keys2));

    // simula dedup: nenhuma chave nova na 2ª importação
    const jaExistentes = new Set(keys1);
    const novasNaSegunda = keys2.filter((k) => !jaExistentes.has(k));
    expect(novasNaSegunda).toHaveLength(0);
  });

  it("cenário 2: período sobreposto só inclui a transação nova pela chave natural", () => {
    const periodo1 = [
      tx({ data: "2026-04-11", hora: "10:00", nomeOriginal: "Danilo Chaves da Cunha", valor: 7000, competencia: "2026-04", chaveNatural: "", id: "1" }),
      tx({ data: "2026-05-09", hora: "09:00", nomeOriginal: "IMPACTO ARENA SOCIETY LTDA", valor: -93000, competencia: "2026-05", chaveNatural: "", id: "2" }),
    ];
    const periodo2 = [
      ...periodo1, // dias já vistos
      tx({ data: "2026-06-01", hora: "08:00", nomeOriginal: "Danilo Chaves da Cunha", valor: 7000, competencia: "2026-06", chaveNatural: "", id: "3" }), // dia novo
    ];

    const existentes = new Set(periodo1.map((t) => naturalKey(t)));
    const novas = periodo2.filter((t) => !existentes.has(naturalKey(t)));

    expect(novas).toHaveLength(1);
    expect(novas[0]?.id).toBe("3");
  });

  it("naturalKey diferencia por valor, data, hora e nome normalizado", () => {
    const a = naturalKey({ data: "2026-04-11", hora: "10:00", nomeOriginal: "DANILO", valor: 7000 });
    const b = naturalKey({ data: "2026-04-11", hora: "10:00", nomeOriginal: "Danilo", valor: 7000 });
    const c = naturalKey({ data: "2026-04-11", hora: "10:00", nomeOriginal: "Danilo", valor: 3000 });
    expect(a).toBe(b); // mesma grafia normalizada -> mesma chave
    expect(a).not.toBe(c); // valor diferente -> chave diferente
  });
});
