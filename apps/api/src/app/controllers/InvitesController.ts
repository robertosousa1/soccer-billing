import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../database/client";
import { UserInviteRepository } from "../repositories/UserInviteRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import { MembersRepository } from "../repositories/MembersRepository";
import { PeladasRepository } from "../repositories/PeladasRepository";
import { AuditEntryRepository } from "../repositories/AuditEntryRepository";
import { ActivateInviteService } from "../services/ActivateInviteService";
import { ResendInviteService } from "../services/ResendInviteService";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  READER: "Leitor",
};

export class InvitesController {
  async show(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const repo = new UserInviteRepository(prisma);
    const invite = await repo.findByToken(token);

    if (!invite) {
      res.status(200).json({ valid: false, reason: "not_found" });
      return;
    }
    if (invite.usedAt) {
      res.status(200).json({ valid: false, reason: "used" });
      return;
    }
    if (invite.expiresAt < new Date()) {
      res.status(200).json({ valid: false, reason: "expired" });
      return;
    }

    const pelada = await new PeladasRepository(prisma).findById(invite.peladaId);

    res.status(200).json({
      valid: true,
      email: invite.email,
      name: invite.name,
      peladaNome: pelada?.nome ?? "",
      role: ROLE_LABEL[invite.role] ?? invite.role,
    });
  }

  async activate(req: Request, res: Response): Promise<void> {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(6) })
      .parse(req.body);

    const service = new ActivateInviteService(
      new UserInviteRepository(prisma),
      new UsersRepository(prisma),
      new MembersRepository(prisma),
      new PeladasRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    const result = await service.execute({ token, password });
    res.status(201).json(result);
  }

  async listPending(req: PeladaScopedRequest, res: Response): Promise<void> {
    const invites = await new UserInviteRepository(prisma).findPendingByPelada(req.params.peladaId);
    res.status(200).json(
      invites.map((i) => ({
        id: i.id,
        email: i.email,
        name: i.name,
        role: i.role,
        lastSentAt: i.lastSentAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
    );
  }

  async resend(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const service = new ResendInviteService(
      new UserInviteRepository(prisma),
      new PeladasRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    await service.execute({ peladaId: req.params.peladaId, email, actorUserId: req.userId ?? null });
    res.status(204).send();
  }
}
