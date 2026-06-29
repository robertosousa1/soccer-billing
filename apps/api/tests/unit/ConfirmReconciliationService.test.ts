import { randomUUID } from "crypto";
import { ConfirmReconciliationService } from "../../src/app/services/ConfirmReconciliationService";
import type { ImportLineDraft } from "@pelada/core";

interface FakePayer {
  id: string;
  nome: string;
  tipo: "MENSALISTA" | "AVULSO";
  desde: string | null;
  telefone: string | null;
}

/**
 * Fake Prisma mínimo, só com o que ConfirmReconciliationService usa dentro do $transaction.
 * Suficiente para travar as 3 regras-bug sem precisar de Postgres real (Testcontainers cobre
 * o resto nos testes de integração).
 */
function createFakePrisma() {
  const payers = new Map<string, FakePayer>();
  const aliases = new Map<string, { payerId: string }>(); // key: `${peladaId}:${aliasNorm}`
  const transactions: unknown[] = [];
  let importRecord: unknown = null;

  const tx = {
    transaction: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const created = { id: randomUUID(), ...data };
        transactions.push(created);
        return created;
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    payer: {
      findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => {
        const payer = payers.get(where.id);
        if (!payer) throw new Error("payer não encontrado no fake");
        return payer;
      }),
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            peladaId: string;
            nome: string;
            tipo: "MENSALISTA" | "AVULSO";
            desde: string | null;
            telefone?: string | null;
            aliases?: { create: { peladaId: string; alias: string; aliasNorm: string }[] };
          };
        }) => {
          const payer: FakePayer = {
            id: randomUUID(),
            nome: data.nome,
            tipo: data.tipo,
            desde: data.desde,
            telefone: data.telefone ?? null,
          };
          payers.set(payer.id, payer);
          for (const alias of data.aliases?.create ?? []) {
            aliases.set(`${alias.peladaId}:${alias.aliasNorm}`, { payerId: payer.id });
          }
          return payer;
        },
      ),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakePayer> }) => {
        const payer = payers.get(where.id);
        if (!payer) throw new Error("payer não encontrado no fake");
        Object.assign(payer, data);
        return payer;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => payers.get(where.id) ?? null),
    },
    payerAlias: {
      findUnique: jest.fn(
        async ({ where }: { where: { peladaId_aliasNorm: { peladaId: string; aliasNorm: string } } }) =>
          aliases.get(`${where.peladaId_aliasNorm.peladaId}:${where.peladaId_aliasNorm.aliasNorm}`) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: { peladaId: string; payerId: string; aliasNorm: string } }) => {
        aliases.set(`${data.peladaId}:${data.aliasNorm}`, { payerId: data.payerId });
        return data;
      }),
    },
    import: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        importRecord = { id: randomUUID(), ...data };
        return importRecord;
      }),
    },
    payerHistoryEntry: {
      create: jest.fn(async () => ({})),
    },
  };

  type FakeTx = typeof tx;
  const prisma = {
    $transaction: jest.fn(async (callback: (tx: FakeTx) => unknown) => callback(tx)),
  };

  return { prisma, payers, aliases, transactions, getImport: () => importRecord };
}

describe("ConfirmReconciliationService — regras-bug (DOMAIN.md §13)", () => {
  it("bug #1 + #3: 140 dividido em 2 mensalistas — só a cota ordem=0 (pagador) recebe o apelido do extrato", async () => {
    const { prisma, payers, aliases } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linha: ImportLineDraft = {
      data: "2026-05-11",
      hora: "10:00:00",
      nomeOriginal: "Danilo Chaves da Cunha",
      valor: 14000,
      formaPagamento: null,
      competencia: "2026-05",
      chaveNatural: "k1",
      duplicada: false,
      shares: [
        { valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Danilo Chaves da Cunha" },
        { valor: 7000, categoria: "MENSALIDADE", ordem: 1, payerId: null, nome: "Amigo Do Danilo" },
      ],
    };

    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas: [linha] });

    expect(payers.size).toBe(2);
    const danilo = [...payers.values()].find((p) => p.nome === "Danilo Chaves da Cunha")!;
    const amigo = [...payers.values()].find((p) => p.nome === "Amigo Do Danilo")!;

    // pagador real (ordem 0) recebe o apelido do nome-do-extrato
    expect(aliases.has(`p1:DANILO CHAVES DA CUNHA`)).toBe(true);
    expect(aliases.get(`p1:DANILO CHAVES DA CUNHA`)?.payerId).toBe(danilo.id);

    // amigo (ordem 1) NÃO recebe o nome-do-extrato como apelido — só o nome digitado para ele
    expect(aliases.has(`p1:AMIGO DO DANILO`)).toBe(true);
    expect(aliases.get(`p1:AMIGO DO DANILO`)?.payerId).toBe(amigo.id);
  });

  it("bug #1: mesma pessoa nova com grafias diferentes no mesmo lote vira UM único pagante", async () => {
    const { prisma, payers } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linhas: ImportLineDraft[] = [
      {
        data: "2026-05-11",
        hora: "10:00:00",
        nomeOriginal: "DANILO CHAVES DA CUNHA",
        valor: 7000,
        formaPagamento: null,
        competencia: "2026-05",
        chaveNatural: "k1",
        duplicada: false,
        shares: [{ valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "DANILO CHAVES DA CUNHA" }],
      },
      {
        data: "2026-05-20",
        hora: "11:00:00",
        nomeOriginal: "Danilo Chaves da Cunha",
        valor: 7000,
        formaPagamento: null,
        competencia: "2026-05",
        chaveNatural: "k2",
        duplicada: false,
        shares: [{ valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Danilo Chaves da Cunha" }],
      },
    ];

    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas });

    // duas linhas, grafias diferentes, mesma pessoa -> 1 único pagante criado
    expect(payers.size).toBe(1);
  });

  it("bug #2: ao reaproveitar mensalista no lote, `desde` baixa para a MENOR competência vista", async () => {
    const { prisma, payers } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linhas: ImportLineDraft[] = [
      {
        data: "2026-05-31",
        hora: "10:00:00",
        nomeOriginal: "Danilo Chaves da Cunha",
        valor: 7000,
        formaPagamento: null,
        competencia: "2026-05", // processada primeiro
        chaveNatural: "k1",
        duplicada: false,
        shares: [{ valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Danilo Chaves da Cunha" }],
      },
      {
        data: "2026-04-12",
        hora: "10:00:00",
        nomeOriginal: "Danilo Chaves da Cunha",
        valor: 7000,
        formaPagamento: null,
        competencia: "2026-04", // competência MENOR, processada depois
        chaveNatural: "k2",
        duplicada: false,
        shares: [{ valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Danilo Chaves da Cunha" }],
      },
    ];

    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas });

    expect(payers.size).toBe(1);
    const danilo = [...payers.values()][0]!;
    // não fica com "2026-05" (1ª processada) — baixa para "2026-04" (menor competência vista)
    expect(danilo.desde).toBe("2026-04");
  });

  it("linhas duplicadas/ignoradas não são persistidas", async () => {
    const { prisma, transactions } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linhas: ImportLineDraft[] = [
      {
        data: "2026-05-11",
        hora: "10:00:00",
        nomeOriginal: "Quadra",
        valor: -1000,
        formaPagamento: null,
        competencia: "2026-05",
        chaveNatural: "k1",
        duplicada: true,
        outflowCategory: "QUADRA",
      },
      {
        data: "2026-05-12",
        hora: "10:00:00",
        nomeOriginal: "Fulano",
        valor: 7000,
        formaPagamento: null,
        competencia: "2026-05",
        chaveNatural: "k2",
        duplicada: false,
        ignorada: true,
        shares: [{ valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Fulano" }],
      },
    ];

    await expect(
      service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas }),
    ).rejects.toThrow("Nenhum lançamento novo para confirmar");
    expect(transactions).toHaveLength(0);
  });

  it("rejeita confirmação quando uma cota de mensalidade dividida está sem nome do amigo", async () => {
    const { prisma, transactions } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linha: ImportLineDraft = {
      data: "2026-05-11",
      hora: "10:00:00",
      nomeOriginal: "Danilo Chaves da Cunha",
      valor: 14000,
      formaPagamento: null,
      competencia: "2026-05",
      chaveNatural: "k1",
      duplicada: false,
      shares: [
        { valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Danilo Chaves da Cunha" },
        { valor: 7000, categoria: "MENSALIDADE", ordem: 1, payerId: null, nome: "" },
      ],
    };

    await expect(
      service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas: [linha] }),
    ).rejects.toThrow(/Contribuição/);
    expect(transactions).toHaveLength(0);
  });

  it("aceita confirmação se a cota sem nome for recategorizada como CONTRIBUICAO", async () => {
    const { prisma, transactions } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linha: ImportLineDraft = {
      data: "2026-05-11",
      hora: "10:00:00",
      nomeOriginal: "Danilo Chaves da Cunha",
      valor: 14000,
      formaPagamento: null,
      competencia: "2026-05",
      chaveNatural: "k1",
      duplicada: false,
      shares: [
        { valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Danilo Chaves da Cunha" },
        { valor: 7000, categoria: "CONTRIBUICAO", ordem: 1, payerId: null, nome: "" },
      ],
    };

    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas: [linha] });
    expect(transactions).toHaveLength(1);
  });

  it("saída vai direto para Transaction sem criar pagante/cota", async () => {
    const { prisma, payers, transactions } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linha: ImportLineDraft = {
      data: "2026-05-09",
      hora: "09:00:00",
      nomeOriginal: "IMPACTO ARENA SOCIETY LTDA",
      valor: -93000,
      formaPagamento: "Com saldo",
      competencia: "2026-05",
      chaveNatural: "k1",
      duplicada: false,
      outflowCategory: "QUADRA",
    };

    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas: [linha] });

    expect(payers.size).toBe(0);
    expect(transactions).toHaveLength(1);
  });

  it("telefone digitado na cota é salvo num pagante novo", async () => {
    const { prisma, payers } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linha: ImportLineDraft = {
      data: "2026-05-11",
      hora: "10:00:00",
      nomeOriginal: "Fulano Novo",
      valor: 7000,
      formaPagamento: null,
      competencia: "2026-05",
      chaveNatural: "k1",
      duplicada: false,
      shares: [
        { valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Fulano Novo", telefone: "11999998888" },
      ],
    };

    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas: [linha] });

    const fulano = [...payers.values()][0]!;
    expect(fulano.telefone).toBe("11999998888");
  });

  it("telefone digitado preenche um pagante existente sem telefone, mas nunca sobrescreve um já cadastrado", async () => {
    const { prisma, payers } = createFakePrisma();
    const service = new ConfirmReconciliationService(prisma as never);

    const linhaCriaPagante: ImportLineDraft = {
      data: "2026-05-11",
      hora: "10:00:00",
      nomeOriginal: "Danilo Chaves da Cunha",
      valor: 7000,
      formaPagamento: null,
      competencia: "2026-05",
      chaveNatural: "k1",
      duplicada: false,
      shares: [{ valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: null, nome: "Danilo Chaves da Cunha" }],
    };
    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h1", linhas: [linhaCriaPagante] });

    const danilo = [...payers.values()][0]!;
    expect(danilo.telefone).toBeNull();

    const linhaComTelefone: ImportLineDraft = {
      data: "2026-05-20",
      hora: "10:00:00",
      nomeOriginal: "Danilo Chaves da Cunha",
      valor: 7000,
      formaPagamento: null,
      competencia: "2026-05",
      chaveNatural: "k2",
      duplicada: false,
      shares: [
        { valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: danilo.id, nome: "Danilo Chaves da Cunha", telefone: "11988887777" },
      ],
    };
    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h2", linhas: [linhaComTelefone] });
    expect(danilo.telefone).toBe("11988887777");

    const linhaTentaSobrescrever: ImportLineDraft = {
      data: "2026-05-25",
      hora: "10:00:00",
      nomeOriginal: "Danilo Chaves da Cunha",
      valor: 7000,
      formaPagamento: null,
      competencia: "2026-05",
      chaveNatural: "k3",
      duplicada: false,
      shares: [
        { valor: 7000, categoria: "MENSALIDADE", ordem: 0, payerId: danilo.id, nome: "Danilo Chaves da Cunha", telefone: "11900000000" },
      ],
    };
    await service.execute({ peladaId: "p1", nomeArquivo: "extrato.csv", userId: "u1", hash: "h3", linhas: [linhaTentaSobrescrever] });
    expect(danilo.telefone).toBe("11988887777");
  });
});
