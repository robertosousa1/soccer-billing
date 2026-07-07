import type { NextFunction, Response } from "express";
import { AppError } from "../utils/AppError";
import type { PeladaScopedRequest } from "./ensureMember";

export function ensureNotArchived(req: PeladaScopedRequest, _res: Response, next: NextFunction): void {
  if (req.peladaArchivedAt) {
    throw new AppError("Esta pelada está arquivada e não aceita alterações", 423);
  }
  next();
}
