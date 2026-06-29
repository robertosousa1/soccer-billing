import { AppError } from "../utils/AppError";
import type { ConfigRepository } from "../repositories/ConfigRepository";

export class GetConfigService {
  constructor(private readonly configRepository: ConfigRepository) {}

  async execute(peladaId: string) {
    const config = await this.configRepository.findByPelada(peladaId);
    if (!config) throw new AppError("Config não encontrada para esta pelada", 404);
    return config;
  }
}
