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
import { InvitesController } from "../controllers/InvitesController";

const peladasRouter = Router();
const peladasController = new PeladasController();
const invitesController = new InvitesController();

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

peladasRouter.get("/:peladaId/invites", ensureMember, authorize("MANAGE_MEMBERS"), (req, res, next) =>
  invitesController.listPending(req as Parameters<typeof invitesController.listPending>[0], res).catch(next),
);
peladasRouter.post(
  "/:peladaId/invites/resend",
  ensureMember,
  authorize("MANAGE_MEMBERS"),
  (req, res, next) =>
    invitesController.resend(req as Parameters<typeof invitesController.resend>[0], res).catch(next),
);
peladasRouter.delete(
  "/:peladaId/invites/:inviteId",
  ensureMember,
  authorize("MANAGE_MEMBERS"),
  (req, res, next) =>
    invitesController.cancel(req as Parameters<typeof invitesController.cancel>[0], res).catch(next),
);

peladasRouter.post("/:peladaId/archive", ensureMember, authorize("RENAME_OR_DELETE_PELADA"), (req, res, next) =>
  peladasController.archive(req as Parameters<typeof peladasController.archive>[0], res).catch(next),
);
peladasRouter.post("/:peladaId/unarchive", ensureMember, authorize("RENAME_OR_DELETE_PELADA"), (req, res, next) =>
  peladasController.unarchive(req as Parameters<typeof peladasController.unarchive>[0], res).catch(next),
);
peladasRouter.post(
  "/:peladaId/transfer-ownership",
  ensureMember,
  authorize("RENAME_OR_DELETE_PELADA"),
  validate({ body: z.object({ newOwnerUserId: z.string().uuid() }) }),
  (req, res, next) =>
    peladasController.transferOwnership(req as Parameters<typeof peladasController.transferOwnership>[0], res).catch(next),
);

export { peladasRouter };
