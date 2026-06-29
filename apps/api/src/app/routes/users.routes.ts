import { Router } from "express";
import { z } from "zod";
import { UsersController } from "../controllers/UsersController";
import { validate } from "../middlewares/validate";

const usersRouter = Router();
const usersController = new UsersController();

usersRouter.post(
  "/",
  validate({
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
    }),
  }),
  (req, res, next) => usersController.create(req, res).catch(next),
);

export { usersRouter };
