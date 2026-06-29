"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "gold" | "danger" | "ghost" | "default";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-pitch text-white hover:bg-pitch-deep border border-pitch",
  gold: "bg-gold text-white hover:opacity-90 border border-gold",
  danger: "bg-white text-clay border border-clay hover:bg-clay-soft",
  ghost: "bg-transparent text-ink hover:bg-chalk border border-transparent",
  default: "bg-white text-ink border border-line hover:bg-chalk",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "default",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pitch/35 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
