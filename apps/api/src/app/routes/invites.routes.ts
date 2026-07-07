import { Router } from "express";
import { InvitesController } from "../controllers/InvitesController";

const invitesRouter = Router();
const invitesController = new InvitesController();

invitesRouter.get("/:token", (req, res, next) => invitesController.show(req, res).catch(next));
invitesRouter.post("/activate", (req, res, next) => invitesController.activate(req, res).catch(next));

export { invitesRouter };
