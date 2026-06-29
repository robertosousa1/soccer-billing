# Modelo de dados

Schema completo em `prisma/schema.prisma`. Decisões e mapeamentos abaixo.

## Decisões

- **Multi-tenant por pelada.** Uma `Pelada` agrupa tudo; `User` e `Pelada` têm N:N via
  `PeladaMember` (papéis `OWNER`/`ADMIN`/`READER` — DOMAIN §14). `Config`, `Payer`, `Import` e
  `Transaction` carregam `peladaId`. Unicidades **por pelada**: `Transaction(peladaId,
  chaveNatural)` e `PayerAlias(peladaId, aliasNorm)`.
- **Dinheiro: centavos no banco, R$ na API.** Guardado em `Int` (centavos) por exatidão; a API
  expõe string já formatada ("R$ 70,00") e o front exibe direto. Format (saída) e parse
  (entrada) são responsabilidade do **backend** — o front nunca formata. (Se preferir o banco
  em reais, troque para `Decimal`/NUMERIC.)
- **Datas como string.** `data` em `"YYYY-MM-DD"`, `competencia`/`desde` em `"YYYY-MM"`.
- **Auditoria:** `Import.rawFileKey` aponta o extrato original guardado no storage (S3).
- **Saída vs entrada na própria `Transaction`.** `valor < 0` é saída e usa `outflowCategory`;
  `valor > 0` é entrada e usa `shares` (1+ cotas). `ignorada = true` exclui dos totais.
- **`Share.ordem`**: `0` marca o **pagador real**; só essa cota recebe o nome-do-extrato como
  apelido (DOMAIN.md §6).

## Mapa: protótipo (JSON) → schema

O protótipo guarda em `window.storage` quatro chaves. O backup `.json` tem o formato:

```jsonc
{
  "versao": 1,
  "config":   { "valorMensalidade": 70, "valorAvulso": 30, "valorAluguel": 1200,
                "diaPagamentoQuadra": 10, "identificadoresQuadra": ["IMPACTO ARENA SOCIETY LTDA"] },
  "pagantes": [ { "id","nome","tipo":"mensalista|avulso","ativo","desde","telefone","apelidos":[...] } ],
  "transacoes": [ { "id","data","hora","nomeOriginal","valor","formaPagamento",
                    "categoria","paganteId","competencia",
                    "cotas":[ { "valor","categoria","paganteId" } ]? } ],
  "importacoes": [ { "id","hash","nomeArquivo","qtdNovas","qtdDuplicadas" } ]
}
```

Mapeamento para o seed (`apps/api/prisma/seed.ts`). O backup do protótipo não tem o conceito
de pelada, então o seed **cria uma `Pelada` padrão**, vincula o organizador como `OWNER`
(`PeladaMember`) e escopa todos os registros importados nessa pelada (`peladaId`):

| Protótipo | Schema | Observação |
|---|---|---|
| `config.valor*` (reais) | `Config.valor*` (centavos) | multiplicar por 100 |
| `config.identificadoresQuadra[]` | `CourtIdentifier[]` | um por valor |
| `pagantes[].tipo` `"mensalista"` | `PayerType.MENSALISTA` | upper |
| `pagantes[].apelidos[]` | `PayerAlias[]` | gerar `aliasNorm = normalizeName(alias)`; dedup |
| `transacoes[]` (valor<0) | `Transaction` + `outflowCategory` | `categoria` → enum |
| `transacoes[]` (valor>0, sem `cotas`) | `Transaction` + 1 `Share` | cota sintetizada de `categoria`/`paganteId`, `ordem=0` |
| `transacoes[]` (valor>0, com `cotas`) | `Transaction` + N `Share` | 1ª cota `ordem=0` (pagador) |
| `transacoes[].competencia` | `Transaction.competencia` | igual |
| `chaveNatural` | recomputar | `naturalKey()` em centavos |
| `importacoes[]` | `Import` | igual |

> Atenção ao recomputar `chaveNatural`: no protótipo o valor entra com 2 casas decimais
> (`70.00`). No banco é centavos; padronize a chave para uma das duas formas e seja
> consistente (sugestão: `data|hora|nomeNorm|valorCentavos`).

## Postgres + pgbouncer/pgcat (atenção)

- `schema.prisma` usa `url` (POOLED, com `?pgbouncer=true`) e `directUrl` (DIRETA). As
  migrations rodam pela conexão direta; o runtime usa a pooled. Ver `.env.example`.
- **Transação interativa** (`prisma.$transaction(async (tx) => ...)`), usada em
  `ConfirmReconciliationService`, mantém uma conexão "presa" durante o callback. Em
  **pgbouncer transaction mode** isso pode conflitar com o pooling — mantenha a transação
  curta e sem await externo. **pgcat** lida melhor com esse caso; se ficar no pgbouncer,
  considere rotear essa rota específica pela conexão direta ou usar session pooling para ela.
- Em testes de integração, o Postgres do Testcontainers é acessado **direto** (sem pooler),
  então esse cuidado não afeta os testes — só produção.
