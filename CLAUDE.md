# Caixa da Pelada — guia do projeto (CLAUDE.md)

Sistema de gestão financeira de um futebol de amigos ("pelada"). O organizador recebe
mensalidades e avulsos por Pix (PicPay), paga o aluguel da quadra e precisa saber, mês a
mês, quem pagou, quem está devendo e quanto sobrou em caixa.

> Existe um **protótipo funcional** validado (um único arquivo `pelada-caixa.html`) que já
> implementa e testou todas as regras de negócio. Este repositório é a migração desse
> protótipo para uma arquitetura de produção. **A lógica de negócio do protótipo é a fonte
> da verdade** — está documentada e portada em `docs/` e `reference/`.

## Stack

- **Monorepo** com pnpm workspaces (`apps/*`, `packages/*`).
- **Backend** (`apps/api`): Node.js + **TypeScript** + Prisma, em **camadas por papel
  técnico** seguindo o `crm-missions-api` (controllers → services → repositories, mais
  mappers, middlewares, routes, jobs, database, utils, adapters, config). Sem container de DI
  (instanciar direto). Banco **PostgreSQL atrás de pgcat**. **Filas** BullMQ/Redis e
  **observabilidade** Sentry + New Relic são obrigatórias.
- **Frontend** (`apps/web`): React + Next.js + Tailwind CSS, em **Atomic Design**.
- **Domínio compartilhado** (`packages/core`): funções puras de negócio + **tipos de DTO**
  (contrato único front/back). Usado por backend e frontend.
- **Testes**: Jest (core + API unit), Jest + Supertest + Testcontainers (API integração),
  Vitest + React Testing Library + MSW (web), Playwright (E2E). Meta ≥90% unit + fluxos
  críticos em integração. Ver `docs/TESTING.md`.

## Por onde começar

1. Leia `docs/MIGRATION_PLAN.md` — é o roteiro em fases. **Não pule fases.**
2. Leia `docs/DOMAIN.md` — todas as regras de negócio e casos de borda (inclui os bugs que
   já descobrimos e como evitá-los). Não reimplemente regras "do zero": siga este doc.
3. `docs/DATA_MODEL.md` + `prisma/schema.prisma` — modelo de dados.
4. `docs/DOMAIN_LOGIC.md` + `reference/domain-logic.ts` — algoritmos prontos para portar.
5. `docs/ARCHITECTURE.md` — layout do monorepo e estrutura das camadas.
6. `docs/SYSTEM_DESIGN.md` — diagramas Mermaid (containers, ER, sequências, filas).
7. `docs/TESTING.md` — stack de testes, fluxos críticos e meta de cobertura.
8. `docs/FRONTEND.md` + `docs/DESIGN_SYSTEM.md` — Atomic Design, tokens, componentes, telas.

## Regras de ouro do domínio (resumo — detalhes em DOMAIN.md)

- **Tudo é escopado por pelada.** Uma pelada tem membros com papéis `OWNER`/`ADMIN`/`READER`
  (N:N) e um usuário participa de várias peladas. Toda query e unicidade (dedup, apelidos)
  filtra por `peladaId`; rotas escopadas passam por `ensureMember` + `authorize(capability)`
  (matriz de permissões na DOMAIN.md §14).
- **Cada lançamento é uma fotografia.** Valores em `Config` (mensalidade, avulso, aluguel,
  dia) são usados só como palpite na importação e como rótulo de referência. **Mudar a
  config nunca recalcula meses já lançados.**
- **Deduplicação por chave natural** `data|hora|nome_normalizado|valor`, não só por arquivo
  — os períodos do extrato do PicPay se sobrepõem.
- **Nomes vêm em caixas diferentes** ("DANILO" vs "Danilo"): sempre normalizar antes de
  comparar. Dentro de uma mesma importação, o mesmo nome novo (grafias diferentes) deve
  virar **um único pagante**.
- **Cotas**: um pagamento pode cobrir mais de uma pessoa (140 = 2 mensalistas; 60 = 2
  avulsos). O dinheiro entra uma vez; as cotas dizem a quem se refere.
- **Apelido só no pagador real.** Ao dividir um pagamento, apenas quem mandou o Pix recebe o
  nome-do-extrato como apelido. O amigo que ele pagou **não**, senão o reconhecimento futuro
  quebra.
- **Inadimplente** = mensalista ativo, com `desde <= mês`, sem cota de mensalidade no mês.

## Convenções de código

- TypeScript estrito (`strict: true`). Sem `any` implícito.
- Backend em camadas: controllers finos; **regra de negócio só em services / `packages/core`**;
  repositories só fazem query (Prisma); mappers convertem na borda (centavos↔reais, shape).
- Erros de negócio via `AppError(message, statusCode)`, tratados num middleware central.
- Validação de request com zod nos middlewares (tipos inferidos e compartilhados com o core).
- Datas internas em `YYYY-MM-DD`; competência (mês) em `YYYY-MM`. **Dinheiro: centavos no
  banco; a API expõe R$ formatado** (string). Format/parse só no backend (ver DATA_MODEL.md).
- Repositórios são concretos (Prisma); a rede de segurança são os testes de integração com
  Testcontainers. Crie fake/mocks só quando acelerar um unit de service.
- Testes: ver `docs/TESTING.md`. Porte os cenários de `reference/domain-logic.ts` como
  testes de `@pelada/core` **antes** de seguir para o backend.
- Commits pequenos e descritivos. Lint + format (ESLint + Prettier) na fase 0.

## Comandos (após scaffolding — fase 0)

```bash
pnpm install
pnpm --filter @pelada/core test
pnpm --filter @pelada/api prisma migrate dev
pnpm --filter @pelada/api dev
pnpm --filter @pelada/web dev
```
