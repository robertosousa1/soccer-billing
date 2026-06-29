export function telDigits(tel: string): string {
  let d = (tel ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length <= 11 && !d.startsWith("55")) d = "55" + d; // assume Brasil
  return d;
}
