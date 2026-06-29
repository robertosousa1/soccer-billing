import type { OutflowCategory, ShareCategory } from "./types";

/** Cota proposta/ajustada de uma linha de entrada do extrato (preview e confirm). */
export interface ImportShareDraft {
  valor: number; // centavos
  categoria: ShareCategory;
  ordem: number; // 0 = pagador real
  payerId: string | null; // já resolvido (pagante existente)
  nome: string; // nome digitado/sugerido para esta cota (usado quando payerId é null)
  telefone?: string | null; // telefone opcional digitado na conciliação, para preencher o pagante
}

/** Uma linha do extrato, já com a categorização/dedup sugeridos. */
export interface ImportLineDraft {
  data: string; // "YYYY-MM-DD"
  hora: string;
  nomeOriginal: string;
  valor: number; // centavos; <0 = saída
  formaPagamento?: string | null;
  competencia: string; // "YYYY-MM"
  chaveNatural: string;
  duplicada: boolean; // já existe na pelada (ou repetida no próprio arquivo)
  ignorada?: boolean;
  // saídas
  outflowCategory?: OutflowCategory;
  // entradas
  shares?: ImportShareDraft[];
  novoPagante?: boolean;
}

export interface ImportPreviewResult {
  linhas: ImportLineDraft[];
  qtdNovas: number;
  qtdDuplicadas: number;
  hash: string;
  arquivoIdentico: boolean;
}
