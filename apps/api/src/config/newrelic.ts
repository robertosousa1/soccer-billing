import { env } from "./env";

/**
 * Carrega o agente do New Relic só quando houver license key configurada.
 * Precisa ser chamado antes de qualquer outro import no boot (server.ts).
 */
export function initNewRelic(): void {
  if (!env.newRelicLicenseKey) return; // sem license key -> não carrega (dev/test)
  process.env.NEW_RELIC_NO_CONFIG_FILE = "true";
  process.env.NEW_RELIC_APP_NAME = process.env.NEW_RELIC_APP_NAME ?? "pelada-api";
  process.env.NEW_RELIC_LICENSE_KEY = env.newRelicLicenseKey;
  require("newrelic");
}
