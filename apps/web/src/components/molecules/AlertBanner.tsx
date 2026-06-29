type Tone = "warn" | "ok" | "error";

export function AlertBanner({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const classes =
    tone === "warn"
      ? "bg-clay-soft border-clay/30 text-clay"
      : tone === "error"
        ? "bg-red-50 border-red-300 text-red-700"
        : "bg-pitch/10 border-pitch/30 text-pitch-deep";
  return <div className={`rounded-card border px-4 py-3 text-sm ${classes}`}>{children}</div>;
}
