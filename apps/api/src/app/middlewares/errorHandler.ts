import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { Sentry } from "../../config/sentry";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Erro de validação", issues: err.issues });
    return;
  }
  Sentry.captureException(err);
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor" });
};
