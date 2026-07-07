export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-[9px] ${className}`} />;
}
