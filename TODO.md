# TODO — Caixa da Pelada

> Ideias e melhorias futuras. Marque com `[x]` quando concluído.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| 🔴 | Alta prioridade |
| 🟡 | Média prioridade |
| 🟢 | Baixa / nice-to-have |
| 🔵 | Em andamento |
| ✅ | Concluído |

---

## Padrão antigo
- [ ] 🔴 cadastrar pagamentos hoje é individual, ter uma forma de cadastro em massa
- [ ] 🔴 relayout por skills de design.. principalmente opções de menu + adicionar logo na aplicação

- [ ] 🟢 lading page de divulgação com venda futura
- [ ] 🟢 remover: POST /users (auto-cadastro com nome+e-mail+senha) é mantido sem alteração para a criação da conta do primeiro OWNER, mas não há botão de "registre-se" exposto na UI de login.
- [ ] 🟢 refresh token
- [ ] 🟢 bloqueio de senha por tentativa de login (5 tentativas) + bloqueio temporário (30 min) + envio de e-mail para o usuário informando sobre o bloqueio
- [ ] 🟢 melhorar a qualidade das senhas

## Backend

### Segurança & Autenticação
- [ ] 🔴 Rate limiting nas rotas públicas (`/sessions`, `/password-reset/*`, `/invites/*`)
- [ ] 🔴 Revogar todos os tokens ativos ao redefinir a senha (blacklist JWT ou versionamento)
- [ ] 🟡 Refresh token (JWT de curta duração + refresh token de longa duração)
- [ ] 🟡 Bloquear conta após N tentativas de login falhas
- [ ] 🟢 Log de IPs nas tentativas de login

### Membros & Convites
- [x] ✅ Cancelar convite pendente (OWNER pode revogar antes de expirar)
- [x] ✅ Convite expira mas fica visível com status `EXPIRADO` na lista

### Pelada
- [x] ✅ Auditoria: `PELADA_CRIADA`, `PELADA_EDITADA` (faltam no fluxo atual)
- [x] ✅ Transferência de ownership (OWNER passa a pelada para outro membro)
- [x] ✅ Arquivar pelada (soft-disable sem excluir dados)
- [ ] 🟢 Imagem / avatar da pelada

### Financeiro
- [ ] 🔴 Lançamentos recorrentes (aluguel mensal gerado automaticamente)
- [ ] 🟡 Exportação CSV do extrato filtrado por competência
- [ ] 🟡 Resumo financeiro por ano (saldo mês a mês em tabela)
- [ ] 🟡 Notificação automática de inadimplentes via WhatsApp (BullMQ job)
- [ ] 🟢 Anexar comprovante de pagamento (upload S3)

### Importação
- [ ] 🟡 Suporte a outros bancos / carteiras além do PicPay
- [ ] 🟡 Re-importar extrato já importado (diferencial: só novas transações)
- [ ] 🟢 Progresso em tempo real da importação via SSE ou WebSocket

### Infraestrutura
- [ ] 🔴 Filas BullMQ para envio de e-mail (async robusto com retry)
- [ ] 🔴 Testes de integração com Testcontainers (meta ≥ 90% unit)
- [ ] 🟡 Health check detalhado (`/health` com status do banco e Redis)
- [ ] 🟡 Paginação nas rotas de listagem (pagantes, lançamentos, auditoria)
- [ ] 🟢 Cache Redis em consultas pesadas (relatório mensal, auditoria)
- [ ] 🟢 Migrar `console.error("[audit]")` para logger estruturado (Pino / Winston)

---

## Frontend

### UX & Usabilidade
- [ ] 🔴 Tela de onboarding para primeiro acesso (criar pelada + config inicial)
- [ ] 🔴 Estado vazio com ilustração em todas as listas
- [ ] 🟡 Confirmação antes de ações destrutivas (modal "tem certeza?")
- [ ] 🟡 Feedback visual de loading global (barra de progresso no topo)
- [ ] 🟡 Modo escuro (dark mode)
- [ ] 🟢 Atalhos de teclado nas principais ações

### Notificações
- [ ] 🟡 Toast de sucesso/erro em substituição aos banners inline
- [ ] 🟢 Sino de notificações in-app (convites, inadimplentes, novos membros)

### Painel / Dashboard
- [ ] 🔴 Cards de resumo: caixa atual, total recebido, total gasto, inadimplentes
- [ ] 🟡 Gráfico de entradas vs saídas por mês (últimos 6 meses)
- [ ] 🟡 Lista de inadimplentes do mês atual direto no painel
- [ ] 🟢 Mini-calendário de vencimentos

### Jogadores
- [ ] 🟡 Foto / avatar do jogador
- [ ] 🟡 Histórico de pagamentos do jogador em modal (sem sair da tela)
- [ ] 🟢 Filtro por tipo (mensalista / avulso) e status (ativo / inativo)
- [ ] 🟢 Busca por nome com debounce

### Relatórios
- [ ] 🟡 Preview do PDF antes de baixar
- [ ] 🟡 Compartilhar link do relatório (URL assinada S3 com TTL)
- [ ] 🟢 Relatório anual consolidado

### Configurações
- [ ] 🟡 Trocar e-mail da conta (com confirmação no novo e-mail)
- [ ] 🟡 Trocar senha logado (diferente do fluxo de reset)
- [ ] 🟢 Preferências de notificação por usuário

### Mobile
- [ ] 🟡 PWA (manifest + service worker básico para instalação)
- [ ] 🟢 Layout otimizado para telas pequenas (tabelas com scroll horizontal)

### Infra
- [ ] 🟢 Substituir Railway Bucket pelo AWS S3 
- [ ] 🟢 Substituir Resend pelo AWS SES 
- [ ] 🟢 Implementar PGCAT
- [ ] 🟢 Implementar validação de texto para commits
- [ ] 🟢 Implementar Skills de Security

---

## Ideias Livres

> Sem prioridade definida ainda — avaliar no futuro.

- [ ] App mobile nativo (React Native) com Expo
- [ ] Integração com Pix automático (webhook de confirmação de pagamento)
- [ ] Plano pago com limite de peladas / membros no free tier
- [ ] API pública documentada (Swagger / OpenAPI)

---

*Atualizado em: julho 2026*
