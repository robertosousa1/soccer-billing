type Tone = "pos" | "neg" | "gold" | "default";

const toneClasses: Record<Tone, string> = {
  pos: "text-pitch",
  neg: "text-clay",
  gold: "text-gold",
  default: "text-ink",
};

/** Recebe a string já formatada vinda da API (ex.: "R$ 70,00"). Não formata nem calcula. */
export function Money({ value, tone = "default" }: { value: string; tone?: Tone }) {
  return <span className={`tabular font-semibold ${toneClasses[tone]}`}>{value}</span>;
}
