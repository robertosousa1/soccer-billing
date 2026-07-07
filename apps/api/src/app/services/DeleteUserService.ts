import { AppError } from "../utils/AppError";
import type { MembersRepository } from "../repositories/MembersRepository";
import type { UsersRepository } from "../repositories/UsersRepository";

export class DeleteUserService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(peladaId: string, requesterId: string, targetUserId: string): Promise<void> {
    if (requesterId === targetUserId) {
      throw new AppError("Você não pode excluir sua própria conta.", 403);
    }

    const membership = await this.membersRepository.findByPeladaAndUser(peladaId, targetUserId);
    if (!membership) throw new AppError("Usuário não encontrado nesta pelada.", 404);

    await this.usersRepository.softDelete(targetUserId);
  }
}
