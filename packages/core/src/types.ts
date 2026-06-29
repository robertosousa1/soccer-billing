export type PayerType = "MENSALISTA" | "AVULSO";
export type ShareCategory = "MENSALIDADE" | "AVULSO" | "OUTRO" | "CONTRIBUICAO";
export type OutflowCategory = "QUADRA" | "OUTRA_SAIDA";

export interface Config {
  valorMensalidade: number; // centavos
  valorAvulso: number; // centavos
  valorAluguel: number; // centavos
  diaPagamentoQuadra: number;
  identificadoresQuadra: string[];
}

export interface Payer {
  id: string;
  nome: string;
  tipo: PayerType;
  ativo: boolean;
  desde?: string | null; // "YYYY-MM"
  telefone?: string | null;
  apelidos: string[];
}

export interface Share {
  valor: number; // centavos
  categoria: ShareCategory;
  payerId: string | null;
  ordem: number; // 0 = pagador real
}

export interface Transaction {
  id: string;
  data: string; // "YYYY-MM-DD"
  hora: string;
  nomeOriginal: string;
  valor: number; // centavos; <0 = saída
  formaPagamento?: string | null;
  competencia: string; // "YYYY-MM"
  chaveNatural: string;
  ignorada?: boolean;
  outflowCategory?: OutflowCategory | null; // saídas
  shares?: Share[]; // entradas
}
