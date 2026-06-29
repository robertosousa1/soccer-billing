import { ScoreCell } from "@/components/molecules/ScoreCell";
import { ptBR } from "@/i18n/pt-BR";

export function Scoreboard({ entrou, saiu, saldo }: { entrou: string; saiu: string; saldo: string }) {
  return (
    <div className="rounded-card bg-gradient-to-br from-pitch-deep to-pitch-dark shadow-card">
      <div className="grid grid-cols-3 divide-x divide-white/15">
        <ScoreCell label={ptBR.painel.entrou} value={entrou} tone="pos" />
        <ScoreCell label={ptBR.painel.saiu} value={saiu} tone="neg" />
        <ScoreCell label={ptBR.painel.saldoMes} value={saldo} tone="gold" />
      </div>
    </div>
  );
}
