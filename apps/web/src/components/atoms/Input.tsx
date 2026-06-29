import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = "", ...rest }: InputProps) {
  return (
    <div>
      <input
        {...rest}
        className={`w-full min-h-[40px] rounded-[9px] border px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-pitch/35 ${
          error ? "border-clay" : "border-line"
        } ${className}`}
      />
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  );
}
