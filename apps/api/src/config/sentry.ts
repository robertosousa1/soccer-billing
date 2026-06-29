import * as Sentry from "@sentry/node";
import { env } from "./env";

export function initSentry(): void {
  if (!env.sentryDsn) return; // sem DSN -> não inicializa (dev/test)
  Sentry.init({ dsn: env.sentryDsn, environment: env.nodeEnv });
}

export { Sentry };
