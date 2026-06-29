import { Router } from "express";
import { z } from "zod";
import { PayersController } from "../controllers/PayersController";
import { ReportsController } from "../controllers/ReportsController";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";

const payersRouter = Router({ mergeParams: true });
const payersController = new PayersController();
const reportsController = new ReportsController();

payersRouter.get("/", authorize("READ"), (req, res, next) => payersController.list(req, res).catch(next));

payersRouter.post(
  "/",
  authorize("WRITE"),
  validate({
    body: z.object({
      nome: z.string().min(1),
      tipo: z.enum(["MENSALISTA", "AVULSO"]),
      desde: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
      telefone: z.string().nullable().optional(),
    }),
  }),
  (req, res, next) => payersController.create(req, res).catch(next),
);

payersRouter.put(
  "/:id",
  authorize("WRITE"),
  validate({
    body: z.object({
      nome: z.string().min(1).optional(),
      ativo: z.boolean().optional(),
      desde: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
      telefone: z.string().nullable().optional(),
      tipo: z.enum(["MENSALISTA", "AVULSO"]).optional(),
      vigenteDesde: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }),
  }),
  (req, res, next) => payersController.update(req, res).catch(next),
);

payersRouter.delete("/:id", authorize("WRITE"), (req, res, next) =>
  payersController.destroy(req, res).catch(next),
);

payersRouter.post(
  "/merge",
  authorize("WRITE"),
  validate({
    body: z.object({
      targetPayerId: z.string().min(1),
      sourcePayerIds: z.array(z.string().min(1)).min(1),
    }),
  }),
  (req, res, next) => payersController.merge(req, res).catch(next),
);

payersRouter.get("/:id/charge-message", authorize("WRITE"), (req, res, next) =>
  reportsController.chargeMessage(req, res).catch(next),
);

payersRouter.get("/:id/history", authorize("READ"), (req, res, next) =>
  payersController.history(req, res).catch(next),
);

export { payersRouter };
