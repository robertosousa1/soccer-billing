# pgcat — pooler de Postgres (só produção)

Imagem própria (wrapper sobre [postgresml/pgcat](https://github.com/postgresml/pgcat)) que
gera `pgcat.toml` a partir de `pgcat.toml.template` no boot, substituindo as env vars abaixo.

## Por que pgcat (não pgbouncer)

`ConfirmReconciliationService` usa `prisma.$transaction(async (tx) => ...)` — uma transação
interativa que mantém uma conexão presa durante todo o callback (criação de pagantes, cotas,
transação, import). Em **pgbouncer no modo transaction pooling** isso pode conflitar com a
forma como ele recicla conexões. **pgcat** lida melhor com esse padrão — por isso foi a escolha
da spec (`docs/DATA_MODEL.md`, seção "Postgres + pgbouncer/pgcat").

## Dev local: **não precisa disso**

`apps/api/.env` (dev) aponta `DATABASE_URL`/`DIRECT_URL` **direto** pro Postgres do
`docker-compose.yml` da raiz — sem pooler. Isso é intencional: dev é um único processo
acessando o banco, pooler não traz benefício e só adiciona uma peça a mais pra rodar. Esse
container só importa em **produção**, onde há múltiplas instâncias da API competindo por
conexões.

## Variáveis de ambiente

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `POSTGRES_HOST` | sim | — | host do Postgres real (não o do pgcat) |
| `POSTGRES_PORT` | não | `5432` | porta do Postgres real |
| `POSTGRES_DB` | sim | — | nome do banco (`pelada` em dev/prod) |
| `POSTGRES_USER` | sim | — | usuário do Postgres |
| `POSTGRES_PASSWORD` | sim | — | senha do Postgres |
| `PGCAT_LISTEN_PORT` | não | `6432` | porta em que o pgcat escuta |
| `PGCAT_POOL_SIZE` | não | `20` | conexões no pool por usuário |
| `PGCAT_ADMIN_USER` | não | `admin` | usuário do console admin do pgcat |
| `PGCAT_ADMIN_PASSWORD` | sim | — | senha do console admin do pgcat |

## Build

```bash
docker build -t pelada-pgcat infra/pgcat
```

## Testar localmente antes de confiar em produção (opcional)

O `docker-compose.yml` da raiz tem um serviço `pgcat` sob o profile `pooled` (não sobe no
`docker compose up` padrão):

```bash
docker compose --profile pooled up -d
docker compose logs pgcat   # confirma que subiu e está escutando em 6432
```

Depois, aponte temporariamente `apps/api/.env` pro pgcat:

```
DATABASE_URL="postgresql://pelada:pelada@localhost:6432/pelada?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://pelada:pelada@localhost:5432/pelada?schema=public"
```

Rode a API e repita o fluxo de importar extrato → confirmar conciliação (o caso que exercita a
transação interativa). Se passar sem travar/timeout, o pooler está OK. **Reverta o `.env`** pra
conexão direta depois — esse desvio é só para teste, dev continua sem pooler.

## Em produção

`DATABASE_URL` aponta pro host:porta deste container (com `?pgbouncer=true` — o Prisma usa esse
parâmetro de forma genérica pra "estou atrás de um pooler", não é exclusivo do pgbouncer).
`DIRECT_URL` continua apontando direto pro Postgres real, sem passar pelo pgcat — é a conexão
usada só por `prisma migrate deploy`.
