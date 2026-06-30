# Frontend (Next.js + Atomic Design + Tailwind)

## Estrutura

```
apps/web/
  src/
    app/                      # rotas (App Router)
      (auth)/login/page.tsx
      painel/page.tsx
      importar/page.tsx
      pagantes/page.tsx
      configuracoes/page.tsx
      layout.tsx
    components/
      atoms/                  # Button, Badge, Input, Select, Money, Stat...
      molecules/              # FieldLabeled, ScoreCell, PayerRow, DropZone...
      organisms/              # Scoreboard, MensalistasTable, ReconciliationTable,
                              # SplitModal, PayerEditor, InadimplentesList...
      templates/              # PageShell (topbar + nav), TwoColumn...
    services/
      api.ts                  # axios/fetch com baseURL + JWT
      payers.ts, imports.ts, reports.ts, config.ts
    hooks/                    # useReport, usePayers, useReconciliation...
    contexts/                 # AuthContext
    types/                    # tipos compartilhados (ou importar de @pelada/core)
    styles/globals.css
  tailwind.config.ts
```

Regra de Atomic Design: **átomos não conhecem domínio** (só props visuais). O conhecimento
de domínio entra a partir de organisms/templates. Reaproveite tipos e validações de
`@pelada/core` (ex.: `formatBRL`, `suggestSplit`) em vez de reimplementar no front.

## Telas

- **Painel** (`/painel`): dashboard analítico somente-leitura. Seletor de mês →
  *scoreboard* (Entrou / Saiu / Saldo na competência) + stat cards (mensalistas pagos,
  inadimplentes, abonados, avulsos, caixa início/fim) + aviso da quadra + tabela de
  mensalistas (status de pagamento) + exportar PDF. **Sem ações de escrita** — é a
  homepage analítica do organizador.

- **Pagamentos** (`/importar`): tela operacional escopada por competência. Seletor de mês
  (igual ao Painel) → duas seções:
  1. **Mensalistas** — tabela de status com ações: "Cobrar no WhatsApp" (inadimplentes) +
     "Abonar" (abre modal com motivo obrigatório) + "Remover abono". Abonos são
     por-competência e afetam apenas o mês selecionado.
  2. **Transações** — lançamentos da competência com edição, exclusão, mesclagem de
     pagantes e dropzone de importação PicPay + registro manual.
  O botão "Importar" abre o modal de conciliação (tabela editável: categoria, pagante,
  competência, **dividir em cotas**); avisos de duplicadas e arquivo idêntico.

- **Pagantes** (`/pagantes`): base de jogadores com categoria (MENSALISTA/AVULSO/CONTRIBUIÇÃO),
  "mensalista desde", WhatsApp, total recebido; editor com telefone e apelidos reconhecidos;
  histórico de alterações por jogador.

- **Configurações** (`/configuracoes`): valores de referência (mensalidade, avulso, aluguel,
  dia de vencimento — com aviso "não altera meses já lançados"), identificadores da quadra,
  backup/restauração JSON.

## Design tokens → Tailwind

Portar a identidade do protótipo (campo de futebol / placar). Fontes **Oswald** (títulos e
números) + **Inter** (texto). `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch:    { DEFAULT: "#0e6b46", deep: "#0a4f34", dark: "#082c1f" },
        chalk:    "#f3f6f2",
        paper:    "#eef1ec",
        ink:      "#13201a",
        muted:    "#5f6f66",
        line:     "#dde4dd",
        clay:     "#c0492f",   // alerta / inadimplente
        gold:     "#b8860b",   // caixa
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "14px" },
    },
  },
} satisfies Config;
```

Números monetários com `tabular-nums` (classe utilitária `font-variant-numeric`). O
*scoreboard* é o elemento de assinatura: fundo verde-escuro radial, números grandes em
Oswald (verde-claro para positivo, vermelho-claro para negativo, dourado para saldo).

## Multi-pelada na UI

- Topbar com **seletor de pelada** (o usuário pode gerir várias). A pelada selecionada define
  o `:peladaId` das chamadas. Guardar a seleção em contexto/estado (não em localStorage dentro
  de artifact; aqui é app real, então cookie/estado do Next serve).
- O **nome da pelada** exibido vem do dado (`Pelada.nome`), interpolado nas strings.
- Tela **Membros**: listar membros e papéis (`OWNER`/`ADMIN`/`READER`). **Só o OWNER** vê as
  ações de adicionar (por e-mail + papel), mudar papel e remover; para ADMIN/READER a tela é
  somente leitura. A UI esconde o que o papel não permite (DOMAIN §14).
- **Dinheiro**: a API devolve R$ já formatado; o front **exibe a string direto** (sem
  `formatBRL` no front). Em formulários, o campo mostra o texto e envia o que o usuário
  digitou; o backend faz o parse.

## Strings parametrizadas (i18n)

Nenhum texto de usuário hardcoded no componente. Fonte única em um catálogo pt-BR com
interpolação (`{pelada}`, `{mes}`, `{valor}`, ...). Há um catálogo inicial pronto em
`reference/messages.pt-BR.ts` — leve para `apps/web/src/i18n/pt-BR.ts`.

- MVP: catálogo tipado + helper `interpolate` (já no arquivo de referência).
- Caminho de evolução (multi-idioma de verdade): **next-intl** (bom suporte ao App Router) —
  migrar é trocar o provider e manter as mesmas chaves.
- O nome da pelada é dado (não fica no catálogo); o template da mensagem de cobrança é
  parâmetro por pelada (`Config.whatsappTemplate`), com fallback no catálogo.

## Observabilidade no front

**New Relic Browser** habilitado (vars `NEXT_PUBLIC_NEW_RELIC_BROWSER_*`). Inicializar no
layout raiz. (Sentry no front é opcional; o foco de erro no front pode ficar no New Relic
Browser, alinhado ao APM do backend.)
