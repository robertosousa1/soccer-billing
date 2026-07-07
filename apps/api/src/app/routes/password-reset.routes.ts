import { Router } from "express";
import { PasswordResetController } from "../controllers/PasswordResetController";

const passwordResetRouter = Router();
const controller = new PasswordResetController();

passwordResetRouter.post("/forgot", (req, res, next) => controller.forgot(req, res).catch(next));
passwordResetRouter.post("/reset", (req, res, next) => controller.reset(req, res).catch(next));

export { passwordResetRouter };
