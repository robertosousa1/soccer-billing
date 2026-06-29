import type { Response } from "express";
import { prisma } from "../../database/client";
import { ConfigRepository } from "../repositories/ConfigRepository";
import { GetConfigService } from "../services/GetConfigService";
import { UpdateConfigService } from "../services/UpdateConfigService";
import { ConfigMapper } from "../mappers/ConfigMapper";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class ConfigController {
  async show(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new GetConfigService(new ConfigRepository(prisma));
    const config = await service.execute(req.params.peladaId);
    res.status(200).json(ConfigMapper.toDTO(config));
  }

  async update(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new UpdateConfigService(new ConfigRepository(prisma));
    const config = await service.execute({ peladaId: req.params.peladaId, ...req.body });
    res.status(200).json(ConfigMapper.toDTO(config!));
  }
}
