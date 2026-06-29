type BadgeVariant =
  | "mensal"
  | "avulso"
  | "contribuicao"
  | "quadra"
  | "saida"
  | "outro"
  | "novo"
  | "ok"
  | "due"
  | "importacao"
  | "manual";

const classes: Record<BadgeVariant, string> = {
  mensal: "bg-pitch/10 text-pitch",
  avulso: "bg-blue/10 text-blue",
  contribuicao: "bg-gold-soft text-gold",
  quadra: "bg-gold-soft text-gold",
  saida: "bg-clay-soft text-clay",
  outro: "bg-line text-muted",
  novo: "bg-gold-soft text-gold",
  ok: "bg-pitch/10 text-pitch",
  due: "bg-clay-soft text-clay",
  importacao: "bg-blue/10 text-blue",
  manual: "bg-line text-muted",
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${classes[variant]}`}
    >
      {children}
    </span>
  );
}
