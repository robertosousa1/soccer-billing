import type { Response } from "express";
import { normalizeName } from "@pelada/core";
import { prisma } from "../../database/client";
import { PayersRepository } from "../repositories/PayersRepository";
import { PayerHistoryRepository } from "../repositories/PayerHistoryRepository";
import { ListPayersService } from "../services/ListPayersService";
import { CreatePayerService } from "../services/CreatePayerService";
import { UpdatePayerService } from "../services/UpdatePayerService";
import { DeletePayerService } from "../services/DeletePayerService";
import { MergePayersService } from "../services/MergePayersService";
import { PayerMapper } from "../mappers/PayerMapper";
import { PayerHistoryMapper } from "../mappers/PayerHistoryMapper";
import { AppError } from "../utils/AppError";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class PayersController {
  async list(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new ListPayersService(new PayersRepository(prisma));
    const payers = await service.execute(req.params.peladaId);
    res.status(200).json(payers.map(PayerMapper.toDTO));
  }

  async create(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new CreatePayerService(new PayersRepository(prisma));
    const payer = await service.execute({ peladaId: req.params.peladaId, ...req.body, userId: req.userId });
    res.status(201).json(PayerMapper.toDTO(payer));
  }

  async update(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new UpdatePayerService(new PayersRepository(prisma));
    const payer = await service.execute({
      peladaId: req.params.peladaId,
      id: req.params.id,
      ...req.body,
      userId: req.userId,
    });
    const full = await new PayersRepository(prisma).findById(req.params.peladaId, payer.id);
    res.status(200).json(PayerMapper.toDTO(full!));
  }

  async destroy(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new DeletePayerService(new PayersRepository(prisma));
    await service.execute(req.params.peladaId, req.params.id);
    res.status(204).send();
  }

  async merge(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new MergePayersService(prisma);
    const payer = await service.execute({
      peladaId: req.params.peladaId,
      targetPayerId: req.body.targetPayerId,
      sourcePayerIds: req.body.sourcePayerIds,
      userId: req.userId,
    });
    res.status(200).json(PayerMapper.toDTO(payer));
  }

  async history(req: PeladaScopedRequest, res: Response): Promise<void> {
    const payer = await new PayersRepository(prisma).findById(req.params.peladaId, req.params.id);
    if (!payer) throw new AppError("Pagante não encontrado", 404);
    const entries = await new PayerHistoryRepository(prisma).findByPayer(req.params.id);
    res.status(200).json(entries.map(PayerHistoryMapper.toDTO));
  }

  async createAlias(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { peladaId, id: payerId } = req.params;
    const payer = await new PayersRepository(prisma).findById(peladaId, payerId);
    if (!payer) throw new AppError("Pagante não encontrado", 404);
    const alias: string = req.body.alias;
    const aliasNorm = normalizeName(alias);
    try {
      const created = await prisma.payerAlias.create({
        data: { peladaId, payerId, alias, aliasNorm },
      });
      res.status(201).json({ id: created.id, alias: created.alias });
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
        throw new AppError("Apelido já existe para esta pelada", 409);
      }
      throw err;
    }
  }

  async destroyAlias(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { peladaId, id: payerId, aliasId } = req.params;
    const payer = await new PayersRepository(prisma).findById(peladaId, payerId);
    if (!payer) throw new AppError("Pagante não encontrado", 404);
    const alias = await prisma.payerAlias.findFirst({ where: { id: aliasId, payerId, peladaId } });
    if (!alias) throw new AppError("Apelido não encontrado", 404);
    await prisma.payerAlias.delete({ where: { id: aliasId } });
    res.status(204).send();
  }
}
