# Arquitetura

Baseada na estrutura real do `crm-missions-api` (camadas por papel técnico, Prisma, fila
Redis, adapters), porém em **TypeScript** e com a stack de testes do projeto.

## Monorepo (pnpm workspaces)

```
pelada/
  package.json                # workspaces: apps/*, packages/*
  pnpm-workspace.yaml
  tsconfig.base.json
  CLAUDE.md
  docs/
  apps/
    api/                      # backend (camadas, Prisma, Postgres+pooler)
    web/                      # frontend (Next.js + Atomic + Tailwind)
  packages/
    core/                     # domínio puro + tipos de DTO compartilhados (api + web)
```

## packages/core — domínio compartilhado

Funções puras de negócio (porte de `reference/domain-logic.ts`) **e os tipos de DTO** usados
pela API e pelo front (contrato único). Sem ORM, sem framework. Testado com Jest.

```
packages/core/
  package.json                # "@pelada/core"
  src/
    money.ts name.ts dedup.ts date.ts categorize.ts report.ts
    types.ts                  # tipos de domínio + DTOs de request/response da API
    index.ts
  tests/                      # Jest — cenários de DOMAIN_LOGIC.md (meta ~100%)
```

## apps/api — backend em camadas (estrutura do crm-missions-api, em TS)

Espelha a referência: `controllers → services → repositories`, com `mappers`, `middlewares`,
`routes`, `jobs`, `database`, `utils`, `adapters` e `config`. Sem container de DI (instanciar
direto). Repositórios são **concretos** (Prisma); a rede de segurança são os testes de
integração com Testcontainers (ver TESTING.md), então não criamos interface+fake por padrão.

```
apps/api/
  prisma/
    schema.prisma
    migrations/
    seed.ts                   # importa o backup JSON do protótipo (ver MIGRATION_PLAN §4)
    seed-dev.ts               # dados fake para desenvolvimento
  src/
    server.ts                 # inicia o HTTP server
    app.ts                    # monta o express app (middlewares globais + rotas)
    queue.ts                  # conexão BullMQ/Redis (filas — obrigatório)
    adapters/                 # integrações externas
      storage.ts              # guarda o extrato bruto p/ auditoria (S3; "local" em dev)
      whatsapp.ts             # provider do WhatsApp Business (lembretes)
    app/
      controllers/            # entrada HTTP, finos: validam entrada, chamam service, mapeiam saída
      services/               # REGRAS DE NEGÓCIO (orquestram @pelada/core + repositories)
      repositories/           # acesso a dados via Prisma
      mappers/                # Prisma model <-> DTO (centavos<->reais, shape da resposta)
      middlewares/            # ensureAuthenticated, ensureMember, authorize(capability), validate(zod), errorHandler
      routes/                 # define rotas e liga aos controllers
      jobs/                   # processadores da fila (ChargeReminderJob, scheduler)
      database/               # PrismaClient singleton (database/client.ts)
      utils/
    config/
      auth.ts                 # JWT (segredo/expiração)
      database.ts             # leitura das URLs (pooled/direct)
      redis.ts                # conexão da fila (obrigatório)
      sentry.ts               # captura de erros (obrigatório)
      newrelic.ts             # APM (obrigatório) — carregar no boot (server.ts)
      storage.ts              # config do S3 (extrato bruto)
  .env.example
```

### Camadas — responsabilidades

- **routes**: caminho + método → controller. Aplica middlewares (`ensureAuthenticated`,
  `validate(schema)`).
- **controllers**: finos. Pegam `req`, chamam o **service**, devolvem via **mapper**. Sem
  regra de negócio.
- **services**: toda a regra. Ex.: `ConfirmReconciliationService` (as 3 regras-bug em
  `prisma.$transaction`), `GetMonthlyReportService` (usa `computeReport` do core).
- **repositories**: queries Prisma. Recebem/retornam tipos do Prisma; nada de regra.
- **mappers**: convertem na borda — centavos→reais, montam o JSON de resposta, escondem
  campos internos. Os DTOs ficam em `@pelada/core/types`.
- **middlewares**: auth (JWT), validação (zod), tratamento central de erro (`AppError`).

### Fluxo de importação como API (duas etapas)

1. `POST /peladas/:peladaId/imports/preview` (multipart) → `ParseExtractService` (lê CSV/XLSX
   com SheetJS, resolve serial de data, usa `@pelada/core`) + `BuildReconciliationService`
   (dedup + auto-categoriza). Também sobe o **arquivo bruto** ao storage e devolve
   `rawFileKey` no rascunho (auditoria). Nenhum lançamento é gravado ainda.
2. `POST /peladas/:peladaId/imports/confirm` (JSON ajustado + `rawFileKey`) →
   `ConfirmReconciliationService` cria/vincula pagantes (merge por nome; apelido só no
   pagador real), grava transações + cotas + import (com `rawFileKey`) em **uma**
   `prisma.$transaction`. (Ver nota de pooler em DATA_MODEL.md.)

### Endpoints (REST) — escopados por pelada

Recursos de domínio ficam sob `/peladas/:peladaId/...`. Toda rota (menos `users` e
`sessions`) passa por `ensureAuthenticated`; as escopadas por `ensureMember` + `authorize`
(checa o papel do usuário naquela pelada — ver DOMAIN.md §14). Rotas `GET` exigem READER+;
escrita exige ADMIN+; gestão de admins/owners e rename/delete exigem OWNER.

```
POST   /users                                  # cria usuário
POST   /sessions                               # login -> JWT
GET    /peladas                                # peladas do usuário (com o papel dele)
POST   /peladas                                # cria pelada (criador vira OWNER)
GET    /peladas/:peladaId                       # READER+
PUT    /peladas/:peladaId                       # OWNER (renomear)
DELETE /peladas/:peladaId                       # OWNER
GET    /peladas/:peladaId/members               # READER+
POST   /peladas/:peladaId/members               # OWNER (add membro por e-mail + papel)
PUT    /peladas/:peladaId/members/:userId       # OWNER (mudar papel)
DELETE /peladas/:peladaId/members/:userId       # OWNER
GET    /peladas/:peladaId/config                # READER+
PUT    /peladas/:peladaId/config                # ADMIN+
GET    /peladas/:peladaId/payers                # READER+
POST   /peladas/:peladaId/payers                # ADMIN+
PUT    /peladas/:peladaId/payers/:id            # ADMIN+
DELETE /peladas/:peladaId/payers/:id            # ADMIN+
POST   /peladas/:peladaId/imports/preview       # ADMIN+ (multipart; sobe o extrato bruto)
POST   /peladas/:peladaId/imports/confirm       # ADMIN+
PUT    /peladas/:peladaId/transactions/:id      # ADMIN+
GET    /peladas/:peladaId/reports/:competencia  # READER+
GET    /peladas/:peladaId/reports/:competencia/defaulters   # READER+
GET    /peladas/:peladaId/payers/:id/charge-message?competencia=YYYY-MM   # ADMIN+
```

**Dinheiro na API:** sempre em **R$ já formatado** (string, ex.: `"R$ 1.200,00"`). O front
**exibe direto, sem formatar**. Na entrada, o front manda o texto digitado e o **backend faz
o parse** para centavos. Formatação e parsing vivem só no backend (mapper na saída; util de
parse na entrada). Internamente o banco guarda centavos (exatidão) — invisível ao front.

## apps/web — ver FRONTEND.md

## Decisões confirmadas

- **TypeScript** em todo o backend (referência é JS; seguimos só a organização de pastas).
- **zod** para validar request nos middlewares + inferir tipos (compartilhados com `@pelada/core`).
- **Tipos de DTO em `@pelada/core`** como contrato único front/back.
- **Observabilidade obrigatória:** Sentry (erros) + New Relic (APM) na API e nos workers.
- **Filas obrigatórias:** BullMQ sobre Redis. `jobs/` + `queue.ts` sempre presentes.
- **pgcat** como pooler (melhor com a transação interativa do confirm).
- **WhatsApp parametrizado pelo sistema:** `Config.whatsappRemindersEnabled` (default
  `false`), `whatsappReminderDay`, `whatsappTemplate`. O scheduler/worker só dispara se
  `enabled = true` (ver SYSTEM_DESIGN §6). Começa desligado.
- **Frontend:** Next.js (App Router) — ver FRONTEND.md.
- **Multi-tenant por pelada:** uma pelada tem membros com papéis `OWNER`/`ADMIN`/`READER`
  (N:N) e um usuário participa de várias peladas. Dados escopados por `peladaId`; dedup e
  apelidos **por pelada**. Autorização via `ensureMember` + `authorize(capability)` (DOMAIN §14).
- **Auditoria:** o extrato bruto é guardado no storage (S3) e referenciado em `Import.rawFileKey`.
- **Strings do front parametrizadas:** catálogo central pt-BR (nada hardcoded); o nome da
  pelada vem do dado (`Pelada.nome`). Ver FRONTEND.md e `reference/messages.pt-BR.ts`.
- **New Relic Browser** no front, além do APM no backend.
- **Dinheiro: a API fala R$** (string formatada, ex.: "R$ 70,00"); o front exibe direto.
  Format/parse só no backend; o banco guarda centavos internamente.
