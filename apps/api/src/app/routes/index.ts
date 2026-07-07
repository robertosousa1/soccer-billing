import { Router } from "express";
import { usersRouter } from "./users.routes";
import { sessionsRouter } from "./sessions.routes";
import { peladasRouter } from "./peladas.routes";
import { invitesRouter } from "./invites.routes";
import { passwordResetRouter } from "./password-reset.routes";

const routes = Router();

routes.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
routes.use("/users", usersRouter);
routes.use("/sessions", sessionsRouter);
routes.use("/peladas", peladasRouter);
routes.use("/invites", invitesRouter);
routes.use("/password-reset", passwordResetRouter);

export { routes };
