import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../../database/client";
import { PeladasRepository } from "../repositories/PeladasRepository";
import { MembersRepository } from "../repositories/MembersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import { AuditEntryRepository } from "../repositories/AuditEntryRepository";
import { CreatePeladaService } from "../services/CreatePeladaService";
import { ListPeladasService } from "../services/ListPeladasService";
import { UpdatePeladaService } from "../services/UpdatePeladaService";
import { DeletePeladaService } from "../services/DeletePeladaService";
import { ArchivePeladaService } from "../services/ArchivePeladaService";
import { TransferOwnershipService } from "../services/TransferOwnershipService";
import { AppError } from "../utils/AppError";
import type { AuthenticatedRequest } from "../middlewares/ensureAuthenticated";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class PeladasController {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const { nome } = req.body;
    const service = new CreatePeladaService();
    const pelada = await service.execute({ nome, ownerUserId: req.userId });
    res.status(201).json(pelada);
  }

  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new ListPeladasService(new PeladasRepository(prisma));
    const peladas = await service.execute(req.userId);
    res.status(200).json(peladas);
  }

  async show(req: PeladaScopedRequest, res: Response): Promise<void> {
    const pelada = await prisma.pelada.findUnique({ where: { id: req.params.peladaId } });
    if (!pelada) throw new AppError("Pelada não encontrada", 404);
    res.status(200).json({ ...pelada, role: req.peladaRole });
  }

  async update(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { nome } = req.body;
    const service = new UpdatePeladaService(
      new PeladasRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    const pelada = await service.execute(req.params.peladaId, nome, req.userId ?? null);
    res.status(200).json(pelada);
  }

  async destroy(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new DeletePeladaService(new PeladasRepository(prisma));
    await service.execute(req.params.peladaId);
    res.status(204).send();
  }

  async archive(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new ArchivePeladaService(
      new PeladasRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    await service.execute(req.params.peladaId, req.userId);
    res.status(204).send();
  }

  async unarchive(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new ArchivePeladaService(
      new PeladasRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    await service.execute(req.params.peladaId, req.userId, true);
    res.status(204).send();
  }

  async transferOwnership(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const { newOwnerUserId } = z.object({ newOwnerUserId: z.string().uuid() }).parse(req.body);
    const service = new TransferOwnershipService(
      new MembersRepository(prisma),
      new UsersRepository(prisma),
      new PeladasRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    await service.execute(req.params.peladaId, req.userId, newOwnerUserId);
    res.status(204).send();
  }
}
