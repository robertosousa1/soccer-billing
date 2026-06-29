import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authConfig } from "../../config/auth";
import { AppError } from "../utils/AppError";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface TokenPayload {
  sub: string;
}

export function ensureAuthenticated(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new AppError("Token não informado", 401);

  const [, token] = authHeader.split(" ");
  if (!token) throw new AppError("Token mal formatado", 401);

  try {
    const decoded = jwt.verify(token, authConfig.secret) as TokenPayload;
    req.userId = decoded.sub;
    next();
  } catch {
    throw new AppError("Token inválido", 401);
  }
}
