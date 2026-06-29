# Domínio e regras de negócio

Documento-fonte das regras. Tudo aqui foi validado no protótipo. Se algo no código divergir
daqui, **este documento vence** (ou atualize-o de propósito).

## 1. Contexto

O organizador de uma pelada recebe pagamentos por Pix na conta do PicPay e exporta o extrato
periodicamente. A partir desse extrato, o sistema precisa: identificar pagantes, conciliar
com uma base própria, gerar relatório mensal, apontar inadimplentes e (futuramente) cobrar
por WhatsApp.

## 2. Formato do extrato do PicPay

Colunas (cabeçalho exato, pode variar de caixa/acentos — detectar por conteúdo):

```
data | hora | tipo | origem / destino | valor | forma de pagamento
```

- `data`: `YYYY-MM-DD` (mas aceitar `DD/MM/YYYY` e serial do Excel ao importar).
- `tipo`: `"Pix recebido"` (entrada) ou `"Pix enviado "` (saída — atenção ao espaço no fim).
- `origem / destino`: nome da pessoa/empresa. **Vem em caixas inconsistentes.**
- `valor`: positivo em entradas, negativo em saídas. Pode vir como número (`70.0`) ou texto
  pt-BR (`"R$ 1.200,00"`). Parsear ambos.
- `forma de pagamento`: vazio em entradas; `"Com saldo"` em saídas.

Exemplos reais do extrato de teste (período 11/04→09/06/2026):

- Entradas de 70 (mensalidade), 30 (avulso), 140 (= 2×70), 60 (= 2×30).
- A **quadra** aparece como `IMPACTO ARENA SOCIETY LTDA` em "Pix enviado", e pode vir em
  **mais de um pagamento** no mês (no exemplo: `-930` e `-140`).
- Mesma pessoa aparece com grafias diferentes: `DANILO CHAVES DA CUNHA` e
  `Danilo Chaves da Cunha` (mesma pessoa); cuidado com `Nicolas Chaves da Cunha` (outra).
- Empresas como `MX SERVICOS E CONSTRUCAO LTDA` podem ser pessoas pagando por conta PJ.

## 3. Entidades de negócio

- **Pelada**: o grupo. Tem `nome` (parâmetro exibido no front) e dados próprios. Uma pelada
  tem **vários membros** com papéis `OWNER` / `ADMIN` / `READER` (N:N via `PeladaMember`); um
  usuário pode participar de **várias peladas** com papéis diferentes. Permissões na §14.
  **Tudo abaixo é escopado por `peladaId`.**
- **Config**: `valorMensalidade` (R$70), `valorAvulso` (R$30), `valorAluguel` (R$1200),
  `diaPagamentoQuadra` (10), **identificadores da quadra**, e os parâmetros de WhatsApp
  (§12). 1:1 com a Pelada. Todos editáveis.
- **Pagante (Payer)**: `nome` (canônico, como aparece nos relatórios), `tipo`
  (`MENSALISTA` | `AVULSO`), `ativo`, `desde` (mês `YYYY-MM` a partir do qual cobra — só
  mensalista), `telefone` (WhatsApp), `apelidos` (grafias reconhecidas no extrato).
- **Importação (Import)**: arquivo importado — `hash`, `nomeArquivo`, `dataImportacao`,
  contadores (novas/duplicadas).
- **Lançamento (Transaction)**: uma linha do extrato — `data`, `hora`, `nomeOriginal`,
  `valor`, `competencia` (`YYYY-MM`), `chaveNatural` (única), e categoria/saída.
- **Cota (Share)**: parte de uma entrada atribuída a um pagante, com `categoria`
  (`MENSALIDADE` | `AVULSO` | `CONTRIBUICAO` | `OUTRO`) e `valor`. Uma entrada tem 1+ cotas.

## 4. Categorização

Ao importar uma linha:

- **Saída** (`valor < 0`): se o destino casar com um identificador da quadra →
  `QUADRA`; senão `OUTRA_SAIDA`. Saídas não têm cotas nem pagante.
- **Entrada** (`valor > 0`): tenta achar o pagante por nome normalizado (canônico + apelidos).
  - Se achou e é mensalista → cota `MENSALIDADE`; se avulso → `AVULSO`.
  - Se não achou: palpite por valor (≈mensalidade → `MENSALIDADE`; ≈avulso → `AVULSO`;
    senão `MENSALIDADE` como chute) — e marca como **novo pagante** para o usuário confirmar.
  - O usuário sempre pode ajustar na tela de conciliação.
  - `CONTRIBUICAO`: categoria manual (não há heurística automática) para quando o mensalista
    **já pagou a mensalidade do mês** em outro lançamento e faz um pagamento adicional (ex.:
    ajuda extra no caixa, reposição de bola, etc.). Não conta como mensalidade paga nem como
    sessão avulsa no relatório (`computeReport`) — soma só no total de entradas/saldo do mês.
  - Na tela de conciliação, `categoria` (cota ou saída) e `competencia` são sempre editáveis
    pelo usuário via caixa de seleção, pré-preenchida com o palpite automático.

## 5. Cotas (pagamentos compartilhados) — CRÍTICO

Um pagamento pode cobrir mais de uma pessoa:

- **140 = dois mensalistas**: geralmente a pessoa paga a dela + a de um amigo. Divide em 2
  cotas de mensalidade; a 1ª é o pagador, a 2ª é o amigo (a nomear).
- **60 = dois avulsos**: pode ser dois amigos OU a mesma pessoa que jogou dois avulsos no
  mês. Default: 2 cotas de avulso ambas no pagador (fácil reatribuir se for amigo).

Sugestão automática de divisão: se o valor é múltiplo (k≥2) da mensalidade → k cotas de
mensalidade; senão se múltiplo do avulso → k cotas de avulso. Caso contrário, divisão
genérica em 2. O usuário pode dividir **qualquer** entrada manualmente, ajustar valores e
adicionar/remover cotas. **A soma das cotas tem de bater com o valor da transação.**

- **Divisão obrigatória para múltiplos de mensalidade:** quando o valor é múltiplo (k≥2) da
  mensalidade (ex.: 140, 210, 280), a 2ª+ cota nasce sem nome (a nomear). Confirmar a
  importação com essa cota ainda como `MENSALIDADE` e sem nome/pagante é **bloqueado**
  (front e back) — senão o fallback creditaria a mesma pessoa duas vezes na competência e o
  amigo real ficaria, incorretamente, inadimplente. Duas saídas: (a) informar o nome do amigo
  em "Dividir pagamento"; ou (b) recategorizar essa cota como `CONTRIBUICAO` — nesse caso a
  divisão por nome não é exigida (ver `shareNeedsName`/`linhaNeedsSplitNames` em
  `packages/core`).

Efeitos no relatório:

- O **dinheiro entra uma vez** (valor da transação). As cotas só atribuem.
- "Mensalistas que pagaram" = pagantes distintos com cota `MENSALIDADE` no mês. Um 140
  marca **dois** mensalistas como pagos → o amigo **não** cai em inadimplência.
- "Avulsos no mês" = número de **cotas** de avulso (não de transações).

## 6. Apelidos e reconhecimento (anti-confusão) — CRÍTICO

- O índice de busca de pagante mapeia `nome_normalizado -> paganteId` **dentro da pelada**,
  incluindo todos os apelidos. Normalização = upper + remover acentos + colapsar espaços.
  (`PayerAlias.aliasNorm` é único por pelada: um nome → um pagante na pelada.)
- Quando o usuário vincula uma linha do extrato a um pagante, a grafia do extrato vira
  **apelido** desse pagante → próximas importações reconhecem sozinhas.
- **Regra de ouro:** numa entrada dividida em cotas, **só a 1ª cota (o pagador real, quem
  mandou o Pix) recebe o nome-do-extrato como apelido.** As demais cotas (amigos pagos) NÃO
  recebem esse apelido — senão um Pix futuro do pagador seria atribuído ao amigo errado.
  Um pagante novo criado a partir de uma cota de amigo recebe como apelido apenas o **nome
  digitado** para ele.

## 7. Deduplicação — CRÍTICO

- **Chave natural** de cada lançamento: `data | hora | nome_normalizado | valor`.
- Dedup é **por pelada**: a chave natural é única dentro da pelada (`@@unique([peladaId,
  chaveNatural])`). Ao importar, ignore linhas cuja chave já exista **naquela pelada** ou já
  apareceu no próprio arquivo. Os períodos de extrato **se sobrepõem** → a dedup por
  transação é o que evita contagem dobrada (mais importante que a dedup por arquivo).
- **Hash do arquivo** (hash do conjunto ordenado de chaves naturais): se igual a uma
  importação anterior **da mesma pelada**, avise "arquivo idêntico" — mas siga.

## 8. Competência

- Default: mês da data do pagamento (`YYYY-MM`). Editável por lançamento na conciliação
  (ex.: mensalidade paga em 31/05 referente a junho).
- Saídas também têm competência (mês da data).

## 9. Inadimplência

Para um mês `M`: inadimplente = pagante **ativo**, tipo **mensalista** (resolvido para a
competência `M` — ver §11.1, não o tipo atual do cadastro), com `desde <= M` (idem), **sem**
nenhuma cota de mensalidade atribuída a ele em `M`. (Não depende de valor — quem pagou
mensalidade conta como pago, mesmo que o preço tenha mudado.)

## 10. Relatório mensal

- **Entrou** = soma dos valores das transações de entrada do mês.
- **Saiu** = soma dos valores absolutos das saídas (`QUADRA` + `OUTRA_SAIDA`).
- **Saldo do mês** = Entrou − Saiu.
- **Caixa acumulado** = soma dos saldos de todos os meses até o mês corrente (em ordem).
- **Quadra**: pagamentos `QUADRA` do mês (datas e valores). Se não houver, avisar que o
  aluguel ainda não saiu (vence dia `diaPagamentoQuadra`, referência `valorAluguel`).
- **Mensalistas**: lista de mensalistas ativos com situação Pago/Em aberto; quando um foi
  pago por outra pessoa, indicar "pago por Fulano".
- **Avulsos**: cotas de avulso do mês.
- **Inadimplentes**: ver §9.
- Transações marcadas como **ignorar** não entram em nenhum total.

## 11. Config é snapshot (não recalcula histórico)

Mudar `valorMensalidade`, `valorAvulso`, `valorAluguel`, `diaPagamentoQuadra` ou
identificadores da quadra **não altera meses já lançados**. Cada lançamento guarda o valor
real e a categoria do momento. Config afeta apenas: (a) o palpite em importações futuras e
(b) rótulos de referência na tela. Implementação: nunca derive números históricos da config;
sempre dos registros salvos.

## 11.1. Tipo do pagante também é snapshot por competência

Mesmo princípio do §11, aplicado a `Payer.tipo`/`desde`: quando um mensalista vira avulso (ou
vice-versa), a mudança **não pode alterar a leitura de competências já lançadas** — só vale a
partir da competência escolhida pelo usuário (e segue valendo nas seguintes, até a próxima
troca, se houver).

- Tabela `PayerTypeChange` registra só **trocas explícitas**: `{ payerId, tipo, vigenteDesde
  ("YYYY-MM") }`. Pagante que nunca trocou de tipo não tem nenhuma linha — comportamento
  idêntico ao de sempre (usa `Payer.tipo`/`desde` direto).
- **Resolução** (`resolveTipoEDesde(payer, changes, ym)` em `packages/core`): pega a troca mais
  recente com `vigenteDesde <= ym`. Se existir, usa o `tipo` dela (e `desde = vigenteDesde` se
  tornou mensalista, `null` se tornou avulso). Se `ym` for anterior a **todas** as trocas
  registradas, o tipo nessa competência é o **oposto** da troca mais antiga (só existem dois
  valores possíveis, então a troca mais antiga revela o que era antes dela). Sem nenhuma troca,
  cai no `tipo`/`desde` atuais do cadastro.
- Editar o tipo de um pagante (`PUT /payers/:id` com `tipo` diferente do atual) **exige**
  informar `vigenteDesde` — o usuário escolhe manualmente a competência, nunca é assumido "o
  mês atual" automaticamente. O sistema suporta histórico completo: um pagante pode trocar de
  tipo mais de uma vez na vida (mensalista → avulso → mensalista → ...).
- `computeReport()` e a lista de mensalistas do relatório mensal usam essa resolução por
  competência, não `payer.tipo`/`payer.desde` direto — é a mesma função em ambos os lugares,
  para não divergirem de novo.

## 12. WhatsApp (presente e futuro)

- **Agora (sem servidor):** cada pagante tem `telefone`. Para inadimplentes, gerar link
  click-to-chat `https://wa.me/<digits>?text=<mensagem>`; o usuário revisa e envia. Normalizar
  telefone para dígitos; se não tiver código do país e tiver ≤11 dígitos, prefixar `55`.
  Na tela de conciliação (importação), o telefone é um campo opcional por cota: ao confirmar,
  preenche o `telefone` do pagante (novo ou existente) só se ele **ainda não tiver um
  cadastrado** — nunca sobrescreve um telefone já existente.
- **Automático (parametrizado):** a `Config` tem `whatsappRemindersEnabled` (default
  `false`), `whatsappReminderDay` e `whatsappTemplate`. Um scheduler diário (BullMQ) só age
  quando `enabled = true` e `hoje == whatsappReminderDay`: enfileira um `ChargeReminderJob`
  por inadimplente com telefone, e o worker envia pela API oficial do WhatsApp Business.
  **Começa desligado** — ligar é só mudar a config. Ver SYSTEM_DESIGN §6.

## 13. Bugs já descobertos (não regredir)

1. **Pagante duplicado na mesma importação:** se a mesma pessoa nova aparece com grafias
   diferentes no mesmo arquivo, criava dois cadastros. Correção: ao confirmar uma importação,
   mantenha um mapa `nome_normalizado -> novoPaganteId` e reaproveite dentro do lote.
2. **`desde` errado:** ao reaproveitar o pagante no lote, `desde` deve ficar com a **menor**
   competência observada (não a primeira processada).
3. **Apelido vazando para o amigo:** ver §6 — só o pagador real recebe o apelido do extrato.
4. **Inadimplente duplicado:** era efeito colateral do bug 1. Some quando 1 é corrigido.

## 14. Perfis e permissões (autorização)

Papéis são **por pelada** (`PeladaMember.role`). Um mesmo usuário pode ser OWNER de uma
pelada e READER de outra. Criar uma **nova** pelada é ação de usuário autenticado — quem cria
vira `OWNER` dela.

| Capacidade | OWNER | ADMIN | READER |
|---|:--:|:--:|:--:|
| Ver dados, infos e relatórios | ✅ | ✅ | ✅ |
| Config, pagantes, importar, lançamentos, editar, cobrar | ✅ | ✅ | — |
| Gerir membros (readers, admins, owners) | ✅ | — | — |
| Renomear / excluir a pelada | ✅ | — | — |
| Criar **novas** peladas | ✅* | — | — |

\* criar nova pelada é, na prática, disponível a qualquer usuário autenticado (vira OWNER da
nova). A coluna reflete que ADMIN/READER não "promovem" a si mesmos dentro da pelada atual.

Implementação: middleware `authorize(capability)` que resolve o papel do usuário na
`:peladaId` e checa contra o mapa de capacidades. READER só acessa rotas `GET` de dados/
relatórios; escrita de dados exige OWNER ou ADMIN; **toda gestão de membros (qualquer papel)
e rename/delete da pelada são exclusivas do OWNER**.
