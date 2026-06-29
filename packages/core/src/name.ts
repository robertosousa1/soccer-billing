export function normalizeName(s: string): string {
  return (s ?? "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e"]);

/** Capitaliza cada palavra do nome, exceto conectivos (de/da/do/das/dos/e) quando não são a primeira palavra. */
export function toTitle(s: string): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((palavra, i) => (i > 0 && CONECTIVOS.has(palavra) ? palavra : palavra.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ");
}
