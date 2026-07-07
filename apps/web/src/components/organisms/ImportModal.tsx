"use client";

import { useEffect, useState } from "react";
import { linhaNeedsSplitNames, parseMoneyToCents, type ImportLineDraft } from "@pelada/core";
import { DropZone } from "@/components/molecules/DropZone";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { ReconciliationTable } from "@/components/organisms/ReconciliationTable";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePelada } from "@/contexts/PeladaContext";
import { previewImport, confirmImport, type ImportPreviewResponse } from "@/services/imports";
import { getConfig } from "@/services/config";
import { ApiError } from "@/services/api";
import { ptBR, interpolate } from "@/i18n/pt-BR";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const { token } = useAuth();
  const { current } = usePelada();
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [linhas, setLinhas] = useState<ImportLineDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valoresRef, setValoresRef] = useState<{ avulso: number; mensalidade: number } | null>(null);

  useEscapeKey(confirming ? () => {} : onClose);

  useEffect(() => {
    if (!token || !current) return;
    getConfig(token, current.id).then((c) => {
      setValoresRef({
        avulso: parseMoneyToCents(c.valorAvulso),
        mensalidade: parseMoneyToCents(c.valorMensalidade),
      });
    });
  }, [token, current]);

  async function handleFile(file: File) {
    if (!token) return;
    if (!current) {
      setError(ptBR.importar.semPelada);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await previewImport(token, current.id, file);
      setPreview(result);
      setLinhas(result.linhas);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado ao importar o arquivo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!token || !current || !preview) return;
    const incluidas = linhas.filter((l) => !l.duplicada && !l.ignorada);
    if (incluidas.some(linhaNeedsSplitNames)) {
      setError(ptBR.importar.faltaNomeDivisao);
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      await confirmImport(token, current.id, {
        nomeArquivo: preview.nomeArquivo,
        hash: preview.hash,
        rawFileKey: preview.rawFileKey,
        linhas,
      });
      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado ao confirmar a importação.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-card bg-card shadow-card">

        {/* Cabeçalho fixo */}
        <div className="flex flex-none items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-lg">{ptBR.importar.titulo}</h2>
          {!confirming && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {ptBR.importar.fechar}
            </Button>
          )}
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4"><AlertBanner tone="error">{error}</AlertBanner></div>}

          <div className="mb-5">
            <DropZone onFile={handleFile} disabled={loading || confirming} />
            {loading && !preview && (
              <div className="mt-6 flex flex-col items-center justify-center gap-2.5 text-sm text-muted">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-line border-t-pitch" />
                {ptBR.importar.processando}
              </div>
            )}
          </div>

          {preview && (
            <div className="space-y-4">
              {preview.arquivoIdentico && <AlertBanner tone="warn">{ptBR.importar.arquivoIgual}</AlertBanner>}
              <div className="flex gap-4 text-sm text-muted">
                <span>{interpolate(ptBR.importar.novas, { n: preview.qtdNovas })}</span>
                <span>{interpolate(ptBR.importar.duplicadas, { n: preview.qtdDuplicadas })}</span>
              </div>

              <ReconciliationTable
                linhas={linhas}
                onChange={setLinhas}
                valorAvulso={valoresRef?.avulso ?? 0}
                valorMensalidade={valoresRef?.mensalidade ?? 0}
              />
            </div>
          )}

          {!preview && !loading && <p className="text-sm text-muted">{ptBR.importar.semLinhas}</p>}
        </div>

        {/* Rodapé fixo — só aparece quando há preview */}
        {preview && (
          <div className="flex flex-none items-center justify-end gap-2 border-t border-line px-6 py-4">
            {confirming && (
              <span className="flex items-center gap-2 text-sm text-muted">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-pitch" />
                Importando, aguarde...
              </span>
            )}
            {!confirming && (
              <Button
                variant="ghost"
                onClick={() => { setPreview(null); setLinhas([]); }}
              >
                {ptBR.importar.cancelar}
              </Button>
            )}
            <Button variant="primary" loading={confirming} disabled={confirming} onClick={handleConfirm}>
              {ptBR.importar.confirmar}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
