/**
 * Catálogo de strings do front (pt-BR) — fonte única do texto exibido ao usuário.
 * Destino sugerido: apps/web/src/i18n/pt-BR.ts (ou usar next-intl, ver FRONTEND.md).
 *
 * Regras:
 *  - NENHUMA string fixa hardcoded em componente; tudo vem daqui.
 *  - Use {placeholders} para valores dinâmicos (ex.: nome da pelada, mês, valor).
 *  - O NOME DA PELADA é dado (Pelada.nome), injetado via {pelada} — não fica no catálogo.
 */

export type Vars = Record<string, string | number>;

/** Interpolação simples: t("ola", { nome: "Ana" }) -> "Olá, Ana!" */
export function interpolate(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export const ptBR = {
  app: {
    brand: "Caixa da Pelada",
    subtitle: "Gestão financeira do futebol",
    // título com o nome da pelada vindo do dado:
    headerWithPelada: "{pelada} · Caixa",
  },
  nav: {
    painel: "Painel",
    importar: "Importar extrato",
    pagantes: "Pagantes",
    config: "Configurações",
  },
  painel: {
    entrou: "Entrou",
    saiu: "Saiu",
    saldoMes: "Saldo do mês",
    mensalistasPagaram: "Mensalistas que pagaram",
    avulsosNoMes: "Avulsos no mês",
    inadimplentes: "Inadimplentes",
    caixaAcumulado: "Caixa acumulado",
    quadraPaga: "Aluguel da quadra pago.",
    quadraEmAberto: "Aluguel da quadra ainda não saiu neste mês. Vence dia {dia}.",
    pagoPor: "pago por {nome}",
  },
  situacao: { pago: "Pago", emAberto: "Em aberto" },
  importar: {
    arraste: "Arraste o arquivo aqui",
    escolher: "Escolher arquivo",
    novas: "{n} transação(ões) nova(s)",
    duplicadas: "{n} já existiam e foram ignoradas",
    arquivoIgual: "Esse arquivo parece idêntico a um já importado. Pode continuar — nada será contado em dobro.",
    dividir: "Dividir pagamento",
  },
  pagantes: {
    titulo: "Base de pagantes",
    semWhatsapp: "{n} mensalista(s) ativo(s) sem WhatsApp.",
    novo: "Novo pagante",
  },
  whatsapp: {
    cobrar: "Cobrar no WhatsApp",
    // template padrão (também editável por pelada em Config.whatsappTemplate):
    mensagemCobranca:
      "Olá, {nome}! Tudo certo? Passando pra lembrar da mensalidade do nosso futebol referente a {mes}, no valor de {valor}. Pode mandar no Pix quando puder. Valeu! ⚽",
  },
  config: {
    avisoSnapshot:
      "Mudar estes valores não altera meses já lançados — vale só para as próximas importações e para os rótulos de referência.",
  },
} as const;
