FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

# Workspace manifests only (cache de dependências)
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
