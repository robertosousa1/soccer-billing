# Caixa da Pelada

Sistema de gestão financeira de um futebol de amigos ("pelada"). Importa o extrato Pix do
PicPay, concilia pagamentos, gera relatório mensal, aponta inadimplentes e gera cobrança via
WhatsApp.

Monorepo pnpm: `apps/api` (backend Node+TS+Prisma em camadas), `apps/web` (frontend
Next.js+Tailwind, Atomic Design), `packages/core` (domínio puro + DTOs compartilhados),
`infra/pgcat` (pooler de Postgres, só produção).

> A spec completa do domínio, arquitetura e plano de migração está em `docs/` — leia
> `CLAUDE.md` antes de mexer em regra de negócio.

## Rodando local

Pré-requisitos: Node, pnpm, Docker (Postgres + Redis via `docker-compose.yml`).

```bash
pnpm install
docker compose up -d                 # Postgres + Redis

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm --filter @pelada/api exec prisma migrate dev   # 1ª vez / após mudar o schema

pnpm dev                             # API + front juntos (http://localhost:3333 / :3000)
```

Comandos individuais: `pnpm dev:api`, `pnpm dev:web`.

## Produção

```bash
pnpm start:api   # build + start do backend
pnpm start:web   # build + start do frontend
```

Em produção, `DATABASE_URL` do backend passa pelo pooler **pgcat** (`infra/pgcat/`) em vez de
conectar direto no Postgres — ver `infra/pgcat/README.md` para o porquê e como rodar.

## Testes

```bash
pnpm test:core               # domínio puro (@pelada/core)
pnpm test:api                # unit do backend
pnpm test:api:integration    # integração do backend (Postgres real via Testcontainers)
pnpm test:web                # componentes do frontend (Vitest + RTL)
pnpm test                    # tudo
```

## Lint

```bash
pnpm lint
```

## Saiba mais

- `CLAUDE.md` — guia do projeto (regras de ouro do domínio, convenções de código).
- `docs/MIGRATION_PLAN.md` — fases da migração.
- `docs/DOMAIN.md` — todas as regras de negócio e casos de borda.
- `infra/pgcat/README.md` — pooler de Postgres (produção).
