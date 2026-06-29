#!/bin/sh
# Gera /etc/pgcat/pgcat.toml a partir do template substituindo as env vars (sed; sem depender
# de bash/envsubst) e inicia o pgcat. Ver README.md desta pasta para a lista de variáveis.
set -e

: "${POSTGRES_HOST:?obrigatório: host do Postgres real}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:?obrigatório: nome do banco}"
: "${POSTGRES_USER:?obrigatório: usuário do Postgres}"
: "${POSTGRES_PASSWORD:?obrigatório: senha do Postgres}"
: "${PGCAT_LISTEN_PORT:=6432}"
: "${PGCAT_POOL_SIZE:=20}"
: "${PGCAT_ADMIN_USER:=admin}"
: "${PGCAT_ADMIN_PASSWORD:?obrigatório: senha do admin do pgcat (usada no painel/health do próprio pgcat)}"

sed \
  -e "s|\${POSTGRES_HOST}|$POSTGRES_HOST|g" \
  -e "s|\${POSTGRES_PORT}|$POSTGRES_PORT|g" \
  -e "s|\${POSTGRES_DB}|$POSTGRES_DB|g" \
  -e "s|\${POSTGRES_USER}|$POSTGRES_USER|g" \
  -e "s|\${POSTGRES_PASSWORD}|$POSTGRES_PASSWORD|g" \
  -e "s|\${PGCAT_LISTEN_PORT}|$PGCAT_LISTEN_PORT|g" \
  -e "s|\${PGCAT_POOL_SIZE}|$PGCAT_POOL_SIZE|g" \
  -e "s|\${PGCAT_ADMIN_USER}|$PGCAT_ADMIN_USER|g" \
  -e "s|\${PGCAT_ADMIN_PASSWORD}|$PGCAT_ADMIN_PASSWORD|g" \
  /etc/pgcat/pgcat.toml.template > /etc/pgcat/pgcat.toml

exec pgcat /etc/pgcat/pgcat.toml
