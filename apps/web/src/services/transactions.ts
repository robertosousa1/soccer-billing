import { apiFetch } from "./api";

export interface TransactionDTO {
  id: string;
  data: string;
  hora: string;
  nomeOriginal: string;
  valor: string;
  isOutflow: boolean;
  outflowCategory: "QUADRA" | "OUTRA_SAIDA" | null;
  competencia: string;
  ignorada: boolean;
  editada: boolean;
  origem: "IMPORTACAO" | "MANUAL";
  cotas: {
    categoria: "MENSALIDADE" | "AVULSO" | "CONTRIBUICAO" | "OUTRO";
    valor: string;
    payerId: string | null;
    payerNome: string | null;
  }[];
}

export function listTransactions(token: string, peladaId: string) {
  return apiFetch<TransactionDTO[]>(`/peladas/${peladaId}/transactions`, { token });
}

export function updateTransaction(
  token: string,
  peladaId: string,
  id: string,
  data: {
    data?: string;
    valor?: number;
    competencia?: string;
    outflowCategory?: "QUADRA" | "OUTRA_SAIDA";
    ignorada?: boolean;
  },
) {
  return apiFetch(`/peladas/${peladaId}/transactions/${id}`, { method: "PUT", token, body: data });
}

export function deleteTransaction(token: string, peladaId: string, id: string) {
  return apiFetch<void>(`/peladas/${peladaId}/transactions/${id}`, { method: "DELETE", token });
}

export type CreateTransactionInput =
  | {
      tipo: "ENTRADA";
      data: string;
      competencia: string;
      valor: number;
      payerId: string;
      categoria: "MENSALIDADE" | "AVULSO" | "CONTRIBUICAO" | "OUTRO";
    }
  | {
      tipo: "SAIDA";
      data: string;
      competencia: string;
      valor: number;
      outflowCategory: "QUADRA" | "OUTRA_SAIDA";
    };

export function createTransaction(token: string, peladaId: string, data: CreateTransactionInput) {
  return apiFetch<TransactionDTO>(`/peladas/${peladaId}/transactions`, { method: "POST", token, body: data });
}

export interface TransactionFieldChange {
  campo: string;
  de: string | null;
  para: string | null;
}

export interface TransactionHistoryEntryDTO {
  id: string;
  alteracoes: TransactionFieldChange[];
  usuario: string;
  data: string;
  hora: string;
}

export function getTransactionHistory(token: string, peladaId: string, transactionId: string) {
  return apiFetch<TransactionHistoryEntryDTO[]>(`/peladas/${peladaId}/transactions/${transactionId}/history`, { token });
}
