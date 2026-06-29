/** Aceita number (em reais) ou string pt-BR/en e devolve CENTAVOS (inteiro). */
export function parseMoneyToCents(input: number | string): number {
  if (typeof input === "number") return Math.round(input * 100);
  let s = (input ?? "").toString().replace(/r\$/i, "").replace(/\s/g, "").trim();
  if (!s) return 0;
  const neg = s.startsWith("-");
  // remove qualquer símbolo residual antes do número (ex.: sinal corrompido por encoding do extrato)
  s = s.replace(/^[^\d,.]+/, "");
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const cents = Math.round((parseFloat(s) || 0) * 100);
  return neg ? -cents : cents;
}

export function formatBRL(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return (
    sign +
    "R$ " +
    (Math.abs(cents) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
