import { execSync } from "child_process";
import path from "path";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";

jest.setTimeout(60000);

/**
 * Banco de teste real (Postgres), conexão direta (sem pooler) — ver TESTING.md.
 * Usa o Postgres do docker-compose já em execução (porta 5432), num banco dedicado
 * "pelada_test", em vez de Testcontainers: neste ambiente, o Testcontainers trava de forma
 * intermitente quando orquestrado pelo runner do Jest (processo fica ocioso após criar o
 * container do Ryuk e nunca chega a criar o container do Postgres) — comportamento confirmado
 * isoladamente fora do Jest, mas não dentro dele. Mantém o espírito do TESTING.md (Postgres
 * real, `prisma migrate deploy`, sem mocks) com uma alternativa estável.
 */
const DATABASE_URL = "postgresql://pelada:pelada@localhost:5432/pelada_test?schema=public";

let app: Express;
let prisma: PrismaClient;
let server: import("http").Server;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.DIRECT_URL = DATABASE_URL;
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.SENTRY_DSN = "";
  process.env.NEW_RELIC_LICENSE_KEY = "";
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = path.join(__dirname, "../../storage-test");

  execSync("npx prisma migrate deploy --schema=prisma/schema.prisma", {
    cwd: path.join(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL, DIRECT_URL: DATABASE_URL },
    stdio: "inherit",
  });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  request = require("supertest");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app = require("../../src/app").app;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  prisma = require("../../src/database/client").prisma;

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function createUserAndLogin(email: string, name = "Usuário Teste") {
  await request(server).post("/users").send({ name, email, password: "123456" });
  const res = await request(server).post("/sessions").send({ email, password: "123456" });
  return res.body.token as string;
}

async function createPeladaAsOwner(token: string) {
  const res = await request(server)
    .post("/peladas")
    .set("Authorization", `Bearer ${token}`)
    .send({ nome: "Pelada de Teste" });
  return res.body.id as string;
}

describe("fluxo crítico: auth e permissões por papel (DOMAIN.md §14)", () => {
  it("READER lê mas recebe 403 ao escrever; só OWNER gerencia membros", async () => {
    const ownerToken = await createUserAndLogin("owner@example.com");
    const peladaId = await createPeladaAsOwner(ownerToken);

    const readerToken = await createUserAndLogin("reader@example.com");
    await request(server)
      .post(`/peladas/${peladaId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "reader@example.com", role: "READER" });

    const adminToken = await createUserAndLogin("admin@example.com");
    await request(server)
      .post(`/peladas/${peladaId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "admin@example.com", role: "ADMIN" });

    const readGet = await request(server).get(`/peladas/${peladaId}/config`).set("Authorization", `Bearer ${readerToken}`);
    expect(readGet.status).toBe(200);

    const readerWrite = await request(server)
      .put(`/peladas/${peladaId}/config`)
      .set("Authorization", `Bearer ${readerToken}`)
      .send({ diaPagamentoQuadra: 15 });
    expect(readerWrite.status).toBe(403);

    const adminWrite = await request(server)
      .put(`/peladas/${peladaId}/config`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ diaPagamentoQuadra: 15 });
    expect(adminWrite.status).toBe(200);

    const adminManageMembers = await request(server)
      .post(`/peladas/${peladaId}/members`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "reader@example.com", role: "ADMIN" });
    expect(adminManageMembers.status).toBe(403);

    const noAuth = await request(server).get(`/peladas/${peladaId}/config`);
    expect(noAuth.status).toBe(401);
  });

  it("usuário não-membro de uma pelada não acessa os dados dela", async () => {
    const ownerToken = await createUserAndLogin("owner2@example.com");
    const peladaId = await createPeladaAsOwner(ownerToken);

    const outsiderToken = await createUserAndLogin("outsider@example.com");
    const res = await request(server).get(`/peladas/${peladaId}/config`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(res.status).toBe(403);
  });
});

describe("fluxo crítico: importar -> preview (dedup) -> confirmar conciliação", () => {
  it("dedup por chave natural: arquivo idêntico = 0 novas; período sobreposto = só o novo", async () => {
    const token = await createUserAndLogin("import-owner@example.com");
    const peladaId = await createPeladaAsOwner(token);

    await request(server)
      .put(`/peladas/${peladaId}/config`)
      .set("Authorization", `Bearer ${token}`)
      .send({ identificadoresQuadra: ["IMPACTO ARENA SOCIETY LTDA"] });

    const csv = [
      "data,hora,tipo,origem / destino,valor,forma de pagamento",
      "2026-04-11,10:00:00,Pix recebido,DANILO CHAVES DA CUNHA,70.0,",
      "2026-05-11,10:00:00,Pix recebido,Danilo Chaves da Cunha,140.0,",
      "2026-05-09,09:00:00,Pix enviado ,IMPACTO ARENA SOCIETY LTDA,-930.0,Com saldo",
      "2026-05-20,09:00:00,Pix enviado ,IMPACTO ARENA SOCIETY LTDA,-140.0,Com saldo",
      "2026-05-15,14:00:00,Pix recebido,Fulano Avulso,60.0,",
    ].join("\n");

    const preview1 = await request(server)
      .post(`/peladas/${peladaId}/imports/preview`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(csv), "extrato.csv");

    expect(preview1.status).toBe(200);
    expect(preview1.body.qtdNovas).toBe(5);
    expect(preview1.body.qtdDuplicadas).toBe(0);
    expect(preview1.body.arquivoIdentico).toBe(false);

    const linhas = preview1.body.linhas;
    const linha140 = linhas.find((l: { valor: number }) => l.valor === 14000);
    linha140.shares[1].nome = "Amigo Do Danilo";

    const confirm = await request(server)
      .post(`/peladas/${peladaId}/imports/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        nomeArquivo: preview1.body.nomeArquivo,
        hash: preview1.body.hash,
        rawFileKey: preview1.body.rawFileKey,
        linhas,
      });

    expect(confirm.status).toBe(201);
    expect(confirm.body.qtdNovas).toBe(5);

    // reimportar o MESMO arquivo -> 0 novas, arquivo idêntico
    const previewSame = await request(server)
      .post(`/peladas/${peladaId}/imports/preview`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(csv), "extrato.csv");
    expect(previewSame.body.qtdNovas).toBe(0);
    expect(previewSame.body.qtdDuplicadas).toBe(5);
    expect(previewSame.body.arquivoIdentico).toBe(true);

    // período sobreposto + 1 dia novo -> só a transação nova é incluída
    const csvSobreposto = csv + "\n2026-06-01,08:00:00,Pix recebido,Danilo Chaves da Cunha,70.0,";
    const previewOverlap = await request(server)
      .post(`/peladas/${peladaId}/imports/preview`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(csvSobreposto), "extrato2.csv");
    expect(previewOverlap.body.qtdNovas).toBe(1);
    expect(previewOverlap.body.qtdDuplicadas).toBe(5);
  });
});

describe("fluxo crítico: relatório mensal, inadimplentes e config snapshot", () => {
  it("calcula totais corretamente e amigo pago por um 140 não fica inadimplente", async () => {
    const token = await createUserAndLogin("report-owner@example.com");
    const peladaId = await createPeladaAsOwner(token);

    await request(server)
      .put(`/peladas/${peladaId}/config`)
      .set("Authorization", `Bearer ${token}`)
      .send({ identificadoresQuadra: ["IMPACTO ARENA SOCIETY LTDA"] });

    const csv = [
      "data,hora,tipo,origem / destino,valor,forma de pagamento",
      "2026-05-11,10:00:00,Pix recebido,Danilo Chaves da Cunha,140.0,",
      "2026-05-16,11:00:00,Pix recebido,Nicolas Chaves da Cunha,70.0,",
      "2026-05-09,09:00:00,Pix enviado ,IMPACTO ARENA SOCIETY LTDA,-930.0,Com saldo",
      "2026-05-20,09:00:00,Pix enviado ,IMPACTO ARENA SOCIETY LTDA,-140.0,Com saldo",
    ].join("\n");

    const preview = await request(server)
      .post(`/peladas/${peladaId}/imports/preview`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(csv), "extrato.csv");

    const linhas = preview.body.linhas;
    const linha140 = linhas.find((l: { valor: number }) => l.valor === 14000);
    linha140.shares[1].nome = "Amigo Do Danilo";

    await request(server)
      .post(`/peladas/${peladaId}/imports/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nomeArquivo: preview.body.nomeArquivo, hash: preview.body.hash, rawFileKey: preview.body.rawFileKey, linhas });

    const report = await request(server)
      .get(`/peladas/${peladaId}/reports/2026-05`)
      .set("Authorization", `Bearer ${token}`);

    expect(report.status).toBe(200);
    expect(report.body.entrou).toBe("R$ 210,00");
    expect(report.body.saiu).toBe("R$ 1.070,00");
    expect(report.body.saldo).toBe("-R$ 860,00");
    expect(report.body.quadra.paga).toBe(true);
    expect(report.body.inadimplentes).toHaveLength(0); // Danilo, Amigo e Nicolas pagaram

    const defaulters = await request(server)
      .get(`/peladas/${peladaId}/reports/2026-05/defaulters`)
      .set("Authorization", `Bearer ${token}`);
    expect(defaulters.body).toHaveLength(0);

    // config snapshot: mudar valorMensalidade não altera o relatório do mês já lançado
    await request(server)
      .put(`/peladas/${peladaId}/config`)
      .set("Authorization", `Bearer ${token}`)
      .send({ valorMensalidade: "999,00" });

    const reportAfterConfigChange = await request(server)
      .get(`/peladas/${peladaId}/reports/2026-05`)
      .set("Authorization", `Bearer ${token}`);
    expect(reportAfterConfigChange.body.entrou).toBe("R$ 210,00");
  });
});
