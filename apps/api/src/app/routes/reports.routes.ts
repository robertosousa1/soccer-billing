import { Router } from "express";
import { ReportsController } from "../controllers/ReportsController";
import { authorize } from "../middlewares/authorize";

const reportsRouter = Router({ mergeParams: true });
const reportsController = new ReportsController();

reportsRouter.get("/competencia-range", authorize("READ"), (req, res, next) =>
  reportsController.competenciaRange(req, res).catch(next),
);

reportsRouter.get("/:competencia", authorize("READ"), (req, res, next) =>
  reportsController.show(req, res).catch(next),
);

reportsRouter.get("/:competencia/defaulters", authorize("READ"), (req, res, next) =>
  reportsController.defaulters(req, res).catch(next),
);

export { reportsRouter };
