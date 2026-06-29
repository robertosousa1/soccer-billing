import { buildPayerIndex } from "../src/categorize";
import { normalizeName } from "../src/name";
import type { Payer } from "../src/types";

describe("cenário 9: apelido só no pagador real (regra de ouro §6)", () => {
  it("apelido do extrato no pagador (ordem 0) faz reconhecimento futuro apontar para ele, nunca para o amigo", () => {
    // simula o estado APÓS a confirmação da conciliação de um Pix de 140 (2 mensalistas):
    // só o pagante da cota ordem=0 (pagador real) recebeu "PIX DANILO C CUNHA" como apelido.
    const danilo: Payer = {
      id: "danilo",
      nome: "Danilo Chaves da Cunha",
      tipo: "MENSALISTA",
      ativo: true,
      apelidos: ["PIX DANILO C CUNHA"],
    };
    const amigo: Payer = {
      id: "amigo",
      nome: "Amigo Pago Por Danilo",
      tipo: "MENSALISTA",
      ativo: true,
      apelidos: [], // NÃO recebe o apelido do extrato (bug #3 corrigido)
    };

    const idx = buildPayerIndex([danilo, amigo]);

    // um Pix futuro com a mesma grafia do extrato é reconhecido como o pagador real
    expect(idx[normalizeName("PIX DANILO C CUNHA")]).toBe("danilo");
    expect(idx[normalizeName("PIX DANILO C CUNHA")]).not.toBe("amigo");

    // o amigo só é reconhecido pelo nome que foi digitado para ele, nunca pelo apelido do extrato
    expect(idx[normalizeName("Amigo Pago Por Danilo")]).toBe("amigo");
  });
});
