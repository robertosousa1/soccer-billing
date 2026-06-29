import { apiFetch } from "./api";
import type { ImportLineDraft } from "@pelada/core";

export interface ImportPreviewResponse {
  linhas: ImportLineDraft[];
  qtdNovas: number;
  qtdDuplicadas: number;
  hash: string;
  arquivoIdentico: boolean;
  rawFileKey: string;
  nomeArquivo: string;
}

export function previewImport(token: string, peladaId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ImportPreviewResponse>(`/peladas/${peladaId}/imports/preview`, {
    method: "POST",
    token,
    formData,
  });
}

export function confirmImport(
  token: string,
  peladaId: string,
  data: {
    nomeArquivo: string;
    hash: string;
    rawFileKey: string | null;
    linhas: ImportLineDraft[];
  },
) {
  return apiFetch<{ id: string; qtdNovas: number; qtdDuplicadas: number }>(
    `/peladas/${peladaId}/imports/confirm`,
    { method: "POST", token, body: data },
  );
}
