import { Queue } from "bullmq";
import { getRedisConnection } from "./config/redis";

/** Fila de lembretes de cobrança (consumida no worker — implementação do job é Fase 5). */
export const chargeReminderQueue = new Queue("charge-reminder", {
  connection: getRedisConnection(),
});
