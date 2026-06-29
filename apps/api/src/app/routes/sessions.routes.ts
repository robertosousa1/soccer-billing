import { Router } from "express";
import { z } from "zod";
import { SessionsController } from "../controllers/SessionsController";
import { validate } from "../middlewares/validate";

const sessionsRouter = Router();
const sessionsController = new SessionsController();

sessionsRouter.post(
  "/",
  validate({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }),
  (req, res, next) => sessionsController.create(req, res).catch(next),
);

export { sessionsRouter };
