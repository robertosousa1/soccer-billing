import type { NextFunction, Response } from "express";
import { AppError } from "../utils/AppError";
import { roleCan, type Capability } from "../utils/authorizationMatrix";
import type { PeladaScopedRequest } from "./ensureMember";

export function authorize(capability: Capability) {
  return (req: PeladaScopedRequest, _res: Response, next: NextFunction): void => {
    if (!req.peladaRole) throw new AppError("Papel do usuário na pelada não resolvido", 403);
    if (!roleCan(req.peladaRole, capability)) {
      throw new AppError("Você não tem permissão para esta ação", 403);
    }
    next();
  };
}
