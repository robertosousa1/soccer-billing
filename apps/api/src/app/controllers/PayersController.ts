import type { Response } from "express";
import { prisma } from "../../database/client";
import { PayersRepository } from "../repositories/PayersRepository";
import { ListPayersService } from "../services/ListPayersService";
import { CreatePayerService } from "../services/CreatePayerService";
import { UpdatePayerService } from "../services/UpdatePayerService";
import { DeletePayerService } from "../services/DeletePayerService";
import { MergePayersService } from "../services/MergePayersService";
import { PayerMapper } from "../mappers/PayerMapper";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class PayersController {
  async list(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new ListPayersService(new PayersRepository(prisma));
    const payers = await service.execute(req.params.peladaId);
    res.status(200).json(payers.map(PayerMapper.toDTO));
  }

  async create(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new CreatePayerService(new PayersRepository(prisma));
    const payer = await service.execute({ peladaId: req.params.peladaId, ...req.body });
    res.status(201).json(PayerMapper.toDTO(payer));
  }

  async update(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new UpdatePayerService(new PayersRepository(prisma));
    const payer = await service.execute({ peladaId: req.params.peladaId, id: req.params.id, ...req.body });
    const full = await new PayersRepository(prisma).findById(req.params.peladaId, payer.id);
    res.status(200).json(PayerMapper.toDTO(full!));
  }

  async destroy(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new DeletePayerService(new PayersRepository(prisma));
    await service.execute(req.params.peladaId, req.params.id);
    res.status(204).send();
  }

  async merge(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new MergePayersService(prisma);
    const payer = await service.execute({
      peladaId: req.params.peladaId,
      targetPayerId: req.body.targetPayerId,
      sourcePayerIds: req.body.sourcePayerIds,
    });
    res.status(200).json(PayerMapper.toDTO(payer));
  }
}
