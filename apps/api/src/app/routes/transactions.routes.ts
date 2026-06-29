import { Router } from "express";
import { z } from "zod";
import { TransactionsController } from "../controllers/TransactionsController";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";

const transactionsRouter = Router({ mergeParams: true });
const transactionsController = new TransactionsController();

transactionsRouter.get("/", authorize("READ"), (req, res, next) =>
  transactionsController.list(req, res).catch(next),
);

const createBodySchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("ENTRADA"),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hora: z.string().regex(/^\d{2}:\d{2}$/).default("00:00"),
    competencia: z.string().regex(/^\d{4}-\d{2}$/),
    valor: z.number().int().positive(),
    payerId: z.string().min(1),
    categoria: z.enum(["MENSALIDADE", "AVULSO", "CONTRIBUICAO", "OUTRO"]),
  }),
  z.object({
    tipo: z.literal("SAIDA"),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hora: z.string().regex(/^\d{2}:\d{2}$/).default("00:00"),
    competencia: z.string().regex(/^\d{4}-\d{2}$/),
    valor: z.number().int().positive(),
    outflowCategory: z.enum(["QUADRA", "OUTRA_SAIDA"]),
  }),
]);

transactionsRouter.post(
  "/",
  authorize("WRITE"),
  validate({ body: createBodySchema }),
  (req, res, next) => transactionsController.store(req, res).catch(next),
);

transactionsRouter.put(
  "/:id",
  authorize("WRITE"),
  validate({
    body: z.object({
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      valor: z.number().int().positive().optional(),
      competencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      outflowCategory: z.enum(["QUADRA", "OUTRA_SAIDA"]).optional(),
      ignorada: z.boolean().optional(),
    }),
  }),
  (req, res, next) => transactionsController.update(req, res).catch(next),
);

transactionsRouter.delete("/:id", authorize("WRITE"), (req, res, next) =>
  transactionsController.destroy(req, res).catch(next),
);

export { transactionsRouter };
