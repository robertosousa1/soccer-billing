import type { NextFunction, Response } from "express";
import type { MemberRole } from "@prisma/client";
import { prisma } from "../../database/client";
import { AppError } from "../utils/AppError";
import type { AuthenticatedRequest } from "./ensureAuthenticated";

export interface PeladaScopedRequest extends AuthenticatedRequest {
  peladaRole?: MemberRole;
  peladaArchivedAt?: Date | null;
}

export async function ensureMember(
  req: PeladaScopedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { peladaId } = req.params;
    if (!req.userId) throw new AppError("Não autenticado", 401);

    const membership = await prisma.peladaMember.findUnique({
      where: { peladaId_userId: { peladaId, userId: req.userId } },
      include: {
        user: { select: { deletedAt: true } },
        pelada: { select: { deletedAt: true, archivedAt: true } },
      },
    });
    if (
      !membership ||
      membership.deletedAt !== null ||
      membership.user.deletedAt !== null ||
      membership.pelada.deletedAt !== null
    ) {
      throw new AppError("Você não é membro desta pelada", 403);
    }

    req.peladaRole = membership.role;
    req.peladaArchivedAt = membership.pelada.archivedAt;
    next();
  } catch (err) {
    next(err);
  }
}
