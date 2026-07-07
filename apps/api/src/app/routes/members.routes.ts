import { Router } from "express";
import { z } from "zod";
import { MembersController } from "../controllers/MembersController";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";

const membersRouter = Router({ mergeParams: true });
const membersController = new MembersController();

const roleSchema = z.enum(["OWNER", "ADMIN", "READER"]);

membersRouter.get("/", authorize("READ"), (req, res, next) => membersController.list(req, res).catch(next));

membersRouter.post(
  "/",
  authorize("MANAGE_MEMBERS"),
  validate({ body: z.object({ name: z.string().min(1), email: z.string().email(), role: roleSchema }) }),
  (req, res, next) => membersController.create(req, res).catch(next),
);

membersRouter.put(
  "/:userId",
  authorize("MANAGE_MEMBERS"),
  validate({ body: z.object({ role: roleSchema }) }),
  (req, res, next) => membersController.updateRole(req, res).catch(next),
);

membersRouter.delete("/:userId", authorize("MANAGE_MEMBERS"), (req, res, next) =>
  membersController.destroy(req, res).catch(next),
);

export { membersRouter };
