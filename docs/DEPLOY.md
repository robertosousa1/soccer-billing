# Deploy — Vercel (web) + Railway (api)

## Visão geral

| Serviço | Plataforma | Trigger de deploy |
|---------|------------|-------------------|
| `apps/web` | Vercel | Push em `main` com mudanças em `apps/web/**` ou `packages/**` |
| `apps/api` | Railway | Push em `main` com mudanças em `apps/api/**`, `packages/**`, `Dockerfile` ou arquivos de workspace na raiz |

Os deploys são independentes: um commit só no backend não dispara deploy no frontend e vice-versa.

---

## Vercel (frontend)

### Configuração no dashboard

| Campo | Valor |
|-------|-------|
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Build Command | `pnpm run build` (padrão do Next.js) |
| Output Directory | (vazio — o Next.js gerencia) |

### `apps/web/vercel.json`

```json
{
  "ignoreCommand": "bash ../../scripts/vercel-ignore.sh"
}
```

O `vercel.json` fica em `apps/web/` (não na raiz) porque o Root Directory está configurado como `apps/web/` no dashboard.

### `scripts/vercel-ignore.sh`

Evita deploy quando nenhum arquivo relevante mudou. Retorna exit 0 (ignorar) ou exit 1 (buildar).

```bash
#!/bin/bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

PREVIOUS_SHA=${VERCEL_GIT_PREVIOUS_SHA:-}

if [[ -z "$PREVIOUS_SHA" ]] || ! git cat-file -e "$PREVIOUS_SHA^{commit}" 2>/dev/null; then
  if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
    PREVIOUS_SHA="HEAD^"
  else
    exit 1  # primeiro commit: sempre builda
  fi
fi

# exit 0 = ignorar; exit 1 = buildar
git diff "$PREVIOUS_SHA" HEAD --quiet -- ":(top)apps/web" ":(top)packages"
```

**Observações:**
- A Vercel usa `VERCEL_GIT_PREVIOUS_SHA` para o SHA anterior; em shallow clones isso pode estar ausente.
- O `:(top)` no pathspec permite rodar o diff a partir de qualquer subdiretório.
- A Vercel exige exit code **1 exato** para buildar — qualquer outro código é tratado como "ignorar".

### `apps/web/package.json` — prebuild

```json
"prebuild": "cd ../.. && pnpm --filter @pelada/core build"
```

O `prebuild` compila `@pelada/core` antes do `next build`, necessário porque a Vercel instala apenas as deps declaradas e não compila pacotes do workspace automaticamente.

---

## Railway (backend)

### `railway.json` (raiz do repositório)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "services": {
    "api": {
      "watchPatterns": [
        "apps/api/**",
        "packages/**",
        "Dockerfile",
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "tsconfig.base.json"
      ],
      "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
      }
    }
  }
}
```

**Por que `watchPatterns` inclui arquivos da raiz:** mudanças no `Dockerfile`, `pnpm-lock.yaml` ou `tsconfig.base.json` afetam o build da API e precisam disparar deploy.

### `Dockerfile` (raiz do repositório)

O Dockerfile fica **na raiz** porque o Docker usa o diretório onde ele está como contexto de build. Se estivesse em `apps/api/`, não conseguiria acessar `packages/core/` (que é irmão de `apps/`).

```dockerfile
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

# Manifests primeiro — maximiza cache de layers
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Código-fonte
COPY packages/core/ ./packages/core/
COPY apps/api/ ./apps/api/

# Build
RUN pnpm --filter @pelada/api exec prisma generate --schema=prisma/schema.prisma
RUN pnpm --filter @pelada/core build
RUN pnpm --filter @pelada/api build

EXPOSE 3333
CMD ["node", "apps/api/dist/server.js"]
```

**Por que `openssl python3 make g++`:** o Prisma exige openssl; pacotes como `cpu-features` e `ssh2` compilam addons nativos via node-gyp, que exige python3, make e g++.

**Ordem das layers:** manifests (`package.json`) são copiados antes do código-fonte para que o `pnpm install` seja cacheado — só é refeito quando os lockfiles mudam, não a cada alteração de código.

### Variáveis de ambiente no Railway

Configure em **Variables** do serviço `api`:

| Variável | Obrigatória | Observação |
|----------|-------------|------------|
| `DATABASE_URL` | **sim** | String de conexão PostgreSQL (via pgcat em produção) |
| `DIRECT_URL` | recomendada | Conexão direta ao Postgres (sem pgcat), usada pelo Prisma Migrate |
| `JWT_SECRET` | **sim** em produção | Tem fallback `dev-secret` no código, mas deve ser substituído |
| `PORT` | não | Padrão: 3333 |
| `REDIS_URL` | não | Padrão: `redis://localhost:6379` |
| `SENTRY_DSN` | não | Deixe vazio para desativar Sentry |
| `NEW_RELIC_LICENSE_KEY` | não | Deixe vazio para desativar New Relic |

Se o PostgreSQL também estiver no Railway, use **Connect** no serviço `api` para linkar o banco — o Railway injeta `DATABASE_URL` automaticamente.

---

## Fluxo de deploy ponta-a-ponta

```
git push origin main
        │
        ├── Vercel avalia ignoreCommand
        │       ├── mudou apps/web/** ou packages/**? → builda
        │       └── não mudou? → ignora (Ignored Build Step)
        │
        └── Railway avalia watchPatterns
                ├── mudou apps/api/**, packages/**, Dockerfile, etc.? → builda com Docker
                └── não mudou? → ignora (No changes to watched files)
```

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Vercel: `Ignored Build Step` inesperado | `VERCEL_GIT_PREVIOUS_SHA` ausente ou shallow clone | O script faz fallback para `HEAD^`; verifique se há histórico suficiente |
| Vercel: `Module not found: @pelada/core` | `prebuild` não rodou | Verificar `scripts.prebuild` em `apps/web/package.json` |
| Vercel: `404` após deploy | Framework Preset não está como "Next.js" no dashboard | Mudar no dashboard (não no `vercel.json`) |
| Railway: `No changes to watched files` | Arquivo alterado não está nos `watchPatterns` | Adicionar o padrão em `railway.json` |
| Railway: `Cannot find module dist/server.js` | Build falhou silenciosamente ou Dockerfile antigo | Verificar build logs; o `railway.json` deve ter `"builder": "DOCKERFILE"` |
| Railway: `DATABASE_URL ausente` | Variável não configurada | Adicionar em Variables ou linkar serviço PostgreSQL via Connect |

