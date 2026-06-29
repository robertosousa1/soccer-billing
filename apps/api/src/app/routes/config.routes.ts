import { Router } from "express";
import { z } from "zod";
import { ConfigController } from "../controllers/ConfigController";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";

const configRouter = Router({ mergeParams: true });
const configController = new ConfigController();

const moneyInput = z.union([z.string(), z.number()]);

configRouter.get("/", authorize("READ"), (req, res, next) => configController.show(req, res).catch(next));

configRouter.put(
  "/",
  authorize("WRITE"),
  validate({
    body: z.object({
      valorMensalidade: moneyInput.optional(),
      valorAvulso: moneyInput.optional(),
      valorAluguel: moneyInput.optional(),
      diaPagamentoQuadra: z.number().int().min(1).max(31).optional(),
      identificadoresQuadra: z.array(z.string()).optional(),
      whatsappRemindersEnabled: z.boolean().optional(),
      whatsappReminderDay: z.number().int().min(1).max(31).nullable().optional(),
      whatsappTemplate: z.string().nullable().optional(),
    }),
  }),
  (req, res, next) => configController.update(req, res).catch(next),
);

export { configRouter };
