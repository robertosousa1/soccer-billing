export function Stat({
  label,
  value,
  compact,
  compactLabel,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
  compactLabel?: boolean;
}) {
  return (
    <div className={`rounded-card border border-line bg-card shadow-card ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <p className={`font-semibold uppercase tracking-wide text-muted ${compact || compactLabel ? "text-[10px]" : "text-xs"}`}>
        {label}
      </p>
      <p className={`mt-1 font-display tabular text-ink whitespace-nowrap ${compact ? "text-lg" : "text-xl"}`}>{value}</p>
    </div>
  );
}
