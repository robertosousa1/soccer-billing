import { normalizeName } from "./name";
import type { Transaction } from "./types";

/** Chave natural: data | hora | nomeNormalizado | valorCentavos. */
export function naturalKey(
  t: Pick<Transaction, "data" | "hora" | "nomeOriginal" | "valor">,
): string {
  return `${t.data}|${t.hora}|${normalizeName(t.nomeOriginal)}|${t.valor}`;
}

/** Hash estável do conjunto de chaves (detecta arquivo idêntico). djb2. */
export function fileHash(naturalKeys: string[]): string {
  const str = [...naturalKeys].sort().join("§");
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
