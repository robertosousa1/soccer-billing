# Lógica de domínio

A lógica está em `reference/domain-logic.ts`. Copie para `packages/core/src/` (quebrando nos
arquivos sugeridos em ARCHITECTURE.md) e escreva os testes com **Jest** a partir dos cenários
abaixo (todos validados no protótipo). Detalhes da stack de teste em `TESTING.md`.

## Funções

- `normalizeName` / `toTitle` — comparação e exibição de nomes. `toTitle` capitaliza cada
  palavra, exceto conectivos (`de`/`da`/`do`/`das`/`dos`/`e`) quando não são a primeira
  palavra do nome.
- `parseMoneyToCents` / `formatBRL` — dinheiro. **Usados no backend** (parse na entrada da
  API, format no mapper de saída). O front recebe R$ já pronto e não formata.
- `normalizeDate` / `ymOf` — datas e competência.
- `naturalKey` / `fileHash` — deduplicação.
- `buildPayerIndex` — `nomeNorm -> payerId` (canônico + apelidos).
- `isCourt` / `autoCategorize` — categorização na importação.
- `suggestSplit` / `defaultShares` — sugestão de cotas (140 → 2×mensal; 60 → 2×avulso).
- `computeReport` / `caixaAcumulado` — relatório mensal e caixa.
- `telDigits` — normaliza telefone para link `wa.me`.

A **confirmação da conciliação** (criação de pagantes + cotas com as 3 regras-bug) é um
**service** com persistência — o pseudocódigo e os invariantes estão no fim do arquivo `.ts`
e em DOMAIN.md §13.

## Cenários de teste (porte para Jest/Vitest)

Use o extrato real de exemplo (em DOMAIN.md §2). Asserções que já passaram no protótipo:

1. **Dedup de arquivo idêntico:** importar o mesmo extrato 2× → a 2ª importação gera 0 novas.
2. **Período sobreposto:** reimportar um extrato que cobre dias já vistos + 1 dia novo →
   só a transação nova é incluída (dedup por chave natural).
3. **Mesma pessoa, grafias diferentes, no mesmo arquivo** ("DANILO" + "Danilo") →
   **1 único pagante**, com as duas transações vinculadas a ele.
4. **Pessoa distinta com sobrenome parecido** ("Nicolas Chaves da Cunha") → pagante separado.
5. **Quadra:** as N saídas para o identificador da quadra (ex.: -930 e -140) → `QUADRA`.
6. **`desde` = menor competência:** alguém que pagou em 31/05 e 12/05 → `desde = 2026-05`
   (não a primeira linha processada).
7. **Cota 140 = 2 mensalistas:** total entra 140 (uma vez); 2 mensalistas marcados como
   pagos; o amigo **não** fica inadimplente.
8. **Cota 60 = 2 avulsos:** `avulsoCount` conta 2 cotas.
9. **Apelido só no pagador:** num 140, o pagante da cota `ordem=0` recebe o nome-do-extrato
   como apelido; o amigo (cota seguinte) recebe só o nome digitado. No mês seguinte, um Pix
   com o nome-do-extrato é reconhecido como o **pagador**, nunca como o amigo.
10. **Config é snapshot:** mudar `valorMensalidade` não altera o relatório de um mês anterior
    já lançado.

> Dica: o protótipo (`reference/pelada-caixa.html`, incluído no pacote) é executável e serve
> de oráculo — rode-o e compare resultados se tiver dúvida sobre algum caso de borda.
