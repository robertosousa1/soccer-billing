# Plano de migração (fases)

Execute em ordem. Cada fase termina com algo testável. **Não pule a fase 1.**

## Fase 0 — Scaffolding do monorepo
- `pnpm init`, `pnpm-workspace.yaml` com `apps/*` e `packages/*`.
- `tsconfig.base.json` estrito; ESLint + Prettier.
- Test runners: Jest (core + api), Vitest + RTL + MSW (web), Playwright (e2e),
  Testcontainers (integração da api). CI com **gate de cobertura ≥90% unit** (ver TESTING.md).
- Criar `apps/api`, `apps/web`, `packages/core` com seus `package.json`
  (`@pelada/api`, `@pelada/web`, `@pelada/core`).
- Copiar `CLAUDE.md`, `docs/`, `.env.example` para a raiz; `prisma/schema.prisma` para
  `apps/api/prisma/`.
- **Entregável:** `pnpm install` ok; lints passam; runners configurados.

## Fase 1 — packages/core (domínio + testes) ⚠️ trava as regras
- Portar `reference/domain-logic.ts` para `packages/core/src/*` (quebrar nos arquivos de
  ARCHITECTURE.md).
- Escrever testes a partir de DOMAIN_LOGIC.md (cenários 1–10). Usar o extrato de exemplo.
- **Entregável:** `pnpm --filter @pelada/core test` verde. As regras estão protegidas antes
  de qualquer ORM/HTTP entrar em cena.

## Fase 2 — apps/api (backend em camadas)
0. Postgres + pooler: configurar `DATABASE_URL` (pooled, `pgbouncer=true`) e `DIRECT_URL`
   (direta) no `.env`. `prisma migrate dev` usa a direta.
1. `database/client.ts` (PrismaClient singleton); `middlewares` (auth, validate(zod),
   errorHandler com `AppError`); `app.ts` + `server.ts`.
2. `controllers` (já vai chamando `routes`); um **service por caso de uso**; `repositories`
   Prisma; `mappers` (centavos↔reais, shape).
3. **auth + peladas**: criar usuário + login JWT; CRUD de `peladas`; `PeladaMember` com papéis
   `OWNER`/`ADMIN`/`READER` (add/remover membro por e-mail; mudar papel); middlewares
   `ensureMember(:peladaId)` + `authorize(capability)` conforme a matriz da DOMAIN §14. Rotas
   escopadas sob `/peladas/:peladaId/...`.
4. **config** (GET/PUT por pelada) com seed dos valores default ao criar a pelada.
5. **payers** (CRUD + busca por nome via apelidos) — sempre filtrando por `peladaId`.
   `adapters/storage.ts` (S3) pronto para guardar o extrato bruto.
6. **imports**: `ParseExtractService` (usa `@pelada/core`; CSV/XLSX com SheetJS; serial de
   data) + `BuildReconciliationService` (dedup + auto-categoriza) →
   `POST /peladas/:peladaId/imports/preview`.
7. **transactions**: `ConfirmReconciliationService` (3 regras-bug em `prisma.$transaction`)
   → `POST /peladas/:peladaId/imports/confirm`; `UpdateTransactionService` (editar lançamento salvo).
8. **reports**: `GetMonthlyReportService` (`computeReport`), `ListDefaultersService`,
   `BuildChargeMessageService` (mensagem + link wa.me).
- **Observabilidade e fila (obrigatórias):** inicializar New Relic no boot (`server.ts`),
  Sentry (API + workers), e a conexão Redis/BullMQ (`queue.ts`) já na fase 2.
- **Testes:** unit de services (Jest, mock de repo) + **integração dos fluxos críticos**
  (Supertest + Testcontainers, Postgres real) — ver TESTING.md.
- **Entregável:** importar o extrato de exemplo via API reproduz os números do protótipo;
  fluxos críticos verdes.

## Fase 3 — apps/web (frontend)
- Next + Tailwind com os tokens (FRONTEND.md). `AuthContext` + cliente HTTP com JWT.
- Componentes em Atomic Design; as 4 telas com paridade ao protótipo.
- **Entregável:** fluxo completo na UI: login → importar → conciliar (com divisão de cotas)
  → painel → cobrar no WhatsApp.

## Fase 4 — Migração dos dados reais (não perder o que já existe)
- No protótipo: **Configurações → Baixar backup (.json)**. Esse arquivo tem todos os dados.
- `apps/api/prisma/seed.ts`: ler o backup, **criar uma Pelada padrão**, vincular o organizador
  como `OWNER`, e inserir todos os registros escopados nessa pelada seguindo o mapa de
  DATA_MODEL.md (reais→centavos, apelidos→PayerAlias com `peladaId`, cotas→Share com `ordem`,
  recomputar `chaveNatural`). Idempotente (usar `(peladaId, chaveNatural)` para não duplicar).
- **Entregável:** relatórios na API batem com os do protótipo para os meses existentes.

## Fase 5 — Lembrete de WhatsApp (parametrizado, começa desligado)
- A `Config` já tem `whatsappRemindersEnabled` (default `false`), `whatsappReminderDay`,
  `whatsappTemplate`. Expor esses campos no módulo `config` (GET/PUT) e na tela de
  Configurações.
- `jobs/`: um **scheduler diário** (repeatable job do BullMQ) que checa a config; se
  habilitado e for o dia, lista inadimplentes com telefone e enfileira um `ChargeReminderJob`
  por pessoa. `adapters/whatsapp.ts` envia pela API oficial. Retry/backoff do BullMQ.
- **Entregável:** com a flag desligada, nada dispara (verificável em teste). Ligando a flag
  num ambiente de teste, os jobs são enfileirados e processados. Ver SYSTEM_DESIGN §6.

---

## Prompt de partida (cole como 1ª mensagem no Claude Code)

> Este repositório migra um protótipo validado (um futebol de amigos / "pelada") para um
> monorepo de produção. Leia `CLAUDE.md` e a pasta `docs/` antes de codar — especialmente
> `docs/DOMAIN.md` (regras e bugs já corrigidos) e `docs/MIGRATION_PLAN.md` (fases).
>
> Stack: monorepo pnpm; backend Node+TS+Prisma em **camadas por papel técnico** seguindo o
> `crm-missions-api` (controllers → services → repositories, mais mappers, middlewares,
> routes, jobs, database, utils, adapters, config; sem DI container); Postgres atrás de
> pgbouncer/pgcat; frontend Next.js + Atomic Design + Tailwind; `packages/core` com o domínio
> puro e os tipos de DTO compartilhados. Testes: Jest, Supertest+Testcontainers, Vitest+RTL+MSW,
> Playwright (ver `docs/TESTING.md`).
>
> Comece pela **Fase 0** (scaffolding) e pela **Fase 1** (portar `reference/domain-logic.ts`
> para `packages/core` e escrever os testes dos cenários de `docs/DOMAIN_LOGIC.md`). Não
> avance para o backend antes dos testes do core passarem. Antes de gerar código, me
> apresente o plano da fase e a estrutura de pastas que vai criar, e aguarde meu ok.
