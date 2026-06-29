# System Design — Caixa da Pelada

Diagramas em Mermaid (renderizam no GitHub, no VS Code com extensão Mermaid e em
muitos viewers de Markdown).

## 1. Visão de containers (alto nível)

```mermaid
flowchart LR
  Org(["Organizador da pelada"])

  subgraph client["Cliente"]
    Web["Next.js Web<br/>Atomic Design + Tailwind"]
  end

  subgraph backend["Backend (apps/api)"]
    API["API Node + TS<br/>controllers / services / repositories"]
    Worker["Workers BullMQ<br/>jobs"]
  end

  Core["packages/core<br/>domínio puro + DTOs"]
  Redis[("Redis")]
  PGCat["pgcat (pooler)"]
  PG[("PostgreSQL")]
  S3[("S3<br/>extratos brutos")]
  WA["WhatsApp Business API"]
  Sentry["Sentry"]
  NR["New Relic APM"]

  Org -->|HTTPS| Web
  Web -->|REST/JSON + JWT| API
  API --> Core
  Worker --> Core
  API -->|pooled| PGCat
  Worker -->|pooled| PGCat
  PGCat --> PG
  API -->|migrations: conexão direta| PG
  API -->|extrato bruto| S3
  API <-->|enfileira| Redis
  Worker <-->|consome| Redis
  Worker -->|"lembretes (se habilitado)"| WA
  API -.erros.-> Sentry
  Worker -.erros.-> Sentry
  API -.métricas.-> NR
  Worker -.métricas.-> NR
```

## 2. Camadas do backend (fluxo de uma requisição)

```mermaid
flowchart TD
  Req["HTTP request"] --> Route["routes"]
  Route --> MW["middlewares<br/>ensureAuthenticated + validate(zod)"]
  MW --> Ctrl["controller (fino)"]
  Ctrl --> Svc["service (regra de negócio)"]
  Svc --> CoreP["@pelada/core (funções puras)"]
  Svc --> Repo["repository (Prisma)"]
  Repo --> DB[("Postgres via pgcat")]
  Svc --> Map["mapper (centavos→reais, shape)"]
  Map --> Resp["HTTP response (DTO)"]
  Svc -. AppError .-> Err["errorHandler middleware"]
  Err --> Resp
```

## 3. Modelo de dados (ER)

```mermaid
erDiagram
  USER {
    string id PK
    string email
    string password
  }
  PELADA {
    string id PK
    string nome
  }
  PELADA_MEMBER {
    string id PK
    string peladaId FK
    string userId FK
    string role
  }
  CONFIG {
    string id PK
    string peladaId FK
    int valorMensalidade
    int valorAvulso
    int valorAluguel
    bool whatsappRemindersEnabled
    int whatsappReminderDay
  }
  COURT_IDENTIFIER {
    string id PK
    string value
    string configId FK
  }
  PAYER {
    string id PK
    string peladaId FK
    string nome
    string tipo
    bool ativo
    string telefone
  }
  PAYER_ALIAS {
    string id PK
    string peladaId
    string aliasNorm
    string payerId FK
  }
  IMPORT {
    string id PK
    string peladaId FK
    string hash
    string rawFileKey
  }
  TRANSACTION {
    string id PK
    string peladaId FK
    int valor
    string competencia
    string chaveNatural
    string outflowCategory
    string importId FK
  }
  SHARE {
    string id PK
    int valor
    string categoria
    int ordem
    string transactionId FK
    string payerId FK
  }

  USER ||--o{ PELADA_MEMBER : participa
  PELADA ||--o{ PELADA_MEMBER : tem
  PELADA ||--|| CONFIG : tem
  PELADA ||--o{ PAYER : tem
  PELADA ||--o{ IMPORT : tem
  PELADA ||--o{ TRANSACTION : tem
  CONFIG ||--o{ COURT_IDENTIFIER : tem
  PAYER ||--o{ PAYER_ALIAS : "reconhece por"
  PAYER ||--o{ SHARE : recebe
  IMPORT ||--o{ TRANSACTION : contém
  TRANSACTION ||--o{ SHARE : "divide em (entradas)"
```

## 4. Importação e conciliação (sequência)

```mermaid
sequenceDiagram
  actor Org as Organizador
  participant Web
  participant API
  participant Core as core
  participant DB as Postgres

  Org->>Web: sobe o extrato (CSV/XLSX)
  Web->>API: POST /peladas/:id/imports/preview
  API->>Core: parse + naturalKey + autoCategorize
  API->>DB: busca pagantes e chaves existentes (dedup)
  API-->>Web: rascunho (novas, duplicadas, sugestões, aviso de arquivo idêntico)
  Org->>Web: ajusta categorias e divide cotas (140, 60...)
  Web->>API: POST /peladas/:id/imports/confirm
  API->>DB: $transaction — cria pagantes (merge por nome), cotas, import
  Note over API,DB: apelido do extrato só no pagador real (ordem 0)
  API-->>Web: confirmado (contadores)
```

## 5. Algoritmo de confirmação (regras críticas)

```mermaid
flowchart TD
  Start["para cada lançamento incluído"] --> Sign{"valor > 0?"}
  Sign -- não --> Out["saída: QUADRA ou OUTRA_SAIDA<br/>(sem cota/pagante)"] --> Persist
  Sign -- sim --> Shares["para cada cota"]
  Shares --> HasId{"cota já tem paganteId?"}
  HasId -- sim --> Alias0{"é a cota ordem 0<br/>(pagador real)?"}
  Alias0 -- sim --> AddAlias["adiciona nome-do-extrato como apelido"]
  Alias0 -- não --> NoAlias["NÃO adiciona apelido do extrato"]
  HasId -- não --> InBatch{"nome já criado neste lote?"}
  InBatch -- sim --> Reuse["reutiliza pagante<br/>baixa desde p/ menor competência"]
  InBatch -- não --> Create["cria pagante<br/>apelido = nome digitado (+ extrato se ordem 0)"]
  AddAlias --> Persist["grava transação + cotas + import<br/>(tudo em $transaction)"]
  NoAlias --> Persist
  Reuse --> Persist
  Create --> Persist
```

## 6. Lembrete de WhatsApp (parametrizado, default desligado)

```mermaid
flowchart TD
  Cron["scheduler diário (repeatable job)"] --> En{"Config.whatsappRemindersEnabled?"}
  En -- false --> Stop["não faz nada"]
  En -- true --> Day{"hoje == whatsappReminderDay?"}
  Day -- não --> Stop
  Day -- sim --> Comp["resolve competência atual"]
  Comp --> List["lista inadimplentes com telefone"]
  List --> Enq["enfileira 1 ChargeReminderJob por pessoa"]
  Enq --> Work["worker processa job"]
  Work --> Send["envia via WhatsApp Business API"]
  Send -. falha .-> Retry["retry/backoff do BullMQ"]
```

## 7. Notas

- **Observabilidade** (não-opcional): Sentry captura exceções na API e nos workers; New Relic
  faz APM (latência de rota, throughput, erros, jobs). Front pode usar New Relic Browser.
- **Filas** (não-opcional): BullMQ sobre Redis. Além do lembrete de WhatsApp, a fila pode
  absorver tarefas pós-import (ex.: notificações) sem travar a request.
- **pgcat**: pooler escolhido por lidar melhor com a transação interativa do
  `ConfirmReconciliationService`. Migrations sempre pela conexão direta.
