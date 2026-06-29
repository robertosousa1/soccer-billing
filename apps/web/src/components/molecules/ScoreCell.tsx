type Tone = "pos" | "neg" | "gold";

const toneClasses: Record<Tone, string> = {
  pos: "text-emerald-300",
  neg: "text-red-300",
  gold: "text-amber-300",
};

export function ScoreCell({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{label}</span>
      <span className={`font-display tabular text-2xl ${toneClasses[tone]}`}>{value}</span>
    </div>
  );
}
