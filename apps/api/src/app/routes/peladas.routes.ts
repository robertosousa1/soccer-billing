import { Router } from "express";
import { z } from "zod";
import { PeladasController } from "../controllers/PeladasController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureMember } from "../middlewares/ensureMember";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { membersRouter } from "./members.routes";
import { configRouter } from "./config.routes";
import { payersRouter } from "./payers.routes";
import { importsRouter } from "./imports.routes";
import { transactionsRouter } from "./transactions.routes";
import { reportsRouter } from "./reports.routes";
import { AuditController } from "../controllers/AuditController";

const peladasRouter = Router();
const peladasController = new PeladasController();

const nomeSchema = z.object({ nome: z.string().min(1) });

peladasRouter.use(ensureAuthenticated);

peladasRouter.post("/", validate({ body: nomeSchema }), (req, res, next) =>
  peladasController.create(req, res).catch(next),
);
peladasRouter.get("/", (req, res, next) => peladasController.list(req, res).catch(next));

peladasRouter.get("/:peladaId", ensureMember, authorize("READ"), (req, res, next) =>
  peladasController.show(req, res).catch(next),
);
peladasRouter.put(
  "/:peladaId",
  ensureMember,
  authorize("RENAME_OR_DELETE_PELADA"),
  validate({ body: nomeSchema }),
  (req, res, next) => peladasController.update(req, res).catch(next),
);
peladasRouter.delete("/:peladaId", ensureMember, authorize("RENAME_OR_DELETE_PELADA"), (req, res, next) =>
  peladasController.destroy(req, res).catch(next),
);

peladasRouter.use("/:peladaId/members", ensureMember, membersRouter);
peladasRouter.use("/:peladaId/config", ensureMember, configRouter);
peladasRouter.use("/:peladaId/payers", ensureMember, payersRouter);
peladasRouter.use("/:peladaId/imports", ensureMember, importsRouter);
peladasRouter.use("/:peladaId/transactions", ensureMember, transactionsRouter);
peladasRouter.use("/:peladaId/reports", ensureMember, reportsRouter);

const auditController = new AuditController();
peladasRouter.get("/:peladaId/audit", ensureMember, authorize("READ"), (req, res, next) =>
  auditController.index(req as Parameters<typeof auditController.index>[0], res).catch(next),
);

export { peladasRouter };
