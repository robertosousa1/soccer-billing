# Testes e cobertura

Meta: **≥ 90% de cobertura unitária** e **todos os fluxos críticos cobertos por integração**.
Gate de cobertura no CI (falha o build abaixo do limite).

## Stack por camada

| Alvo | Ferramentas | Onde |
|---|---|---|
| Domínio puro (Node) | **Jest** | `packages/core/tests` |
| Services / unit (Node) | **Jest** (mock de repositório quando útil) | `apps/api/**/*.spec.ts` |
| API + banco (integração) | **Jest + Supertest + Testcontainers** | `apps/api/tests/integration` |
| Componentes React | **Vitest + React Testing Library** | `apps/web/**/*.test.tsx` |
| Mock de API no front | **MSW** | `apps/web/tests/mocks` |
| E2E no browser | **Playwright** | `apps/web/e2e` |

Observações:
- `packages/core` é puro → cobertura perto de 100% é barata e protege as regras. Comece por aqui.
- Integração sobe um **Postgres real via Testcontainers** (conexão **direta**, sem pooler):
  roda `prisma migrate deploy` no container, executa o fluxo, derruba. Sem mock de banco.
- Para unit de service, mocke o repositório (jest.fn) quando quiser velocidade; a verdade
  fica nos testes de integração.
- No front, MSW intercepta `fetch` para testar componentes sem subir a API; o Playwright
  cobre o fluxo real ponta a ponta.

## Fluxos críticos (exigem teste de integração)

1. **Importar → preview**: dedup por chave natural (arquivo idêntico = 0 novas; período
   sobreposto = só o que é novo) e auto-categorização (quadra, mensalidade, avulso).
2. **Confirmar conciliação**: criação/vínculo de pagantes com **merge por nome** no mesmo
   lote; **apelido só no pagador real**; cotas (140 = 2 mensalistas; 60 = 2 avulsos);
   gravação atômica (`$transaction`). Verificar que falha no meio não grava nada.
3. **Relatório mensal**: totais, saldo, caixa acumulado, mensalistas pagos e avulsos por cota.
4. **Inadimplentes**: mensalista ativo sem cota de mensalidade no mês; o amigo pago por um
   140 **não** aparece.
5. **Config é snapshot**: mudar valores não altera relatório de mês anterior.
6. **Auth e permissões**: rotas protegidas exigem JWT válido; criação de usuário e login.
   **Autorização por papel** (DOMAIN §14): READER recebe 403 em rotas de escrita; ADMIN
   escreve dados mas recebe 403 na gestão de membros; **só OWNER gerencia membros** e
   renomeia/exclui a pelada. Escopo: membro de uma pelada não acessa outra.

## E2E (Playwright) — roteiro mínimo

Login → importar o extrato de exemplo → conciliar (dividir um 140 em 2 mensalistas) →
confirmar → abrir o painel do mês e conferir os números → ver inadimplentes → gerar a
mensagem de cobrança (link wa.me).

## Cenários unitários do core

Os 10 cenários de `DOMAIN_LOGIC.md` viram a base da suíte de `@pelada/core`. Use o extrato de
exemplo de `DOMAIN.md §2`. O protótipo (`reference/pelada-caixa.html`) serve de oráculo.

## CI (sugestão)

- Job 1: `pnpm --filter @pelada/core test --coverage` (gate 90%).
- Job 2: `pnpm --filter @pelada/api test --coverage` (unit) + integração com Testcontainers
  (precisa de Docker no runner).
- Job 3: `pnpm --filter @pelada/web test --coverage` (Vitest) + `playwright test`.
