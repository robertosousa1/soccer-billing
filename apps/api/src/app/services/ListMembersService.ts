import type { MembersRepository } from "../repositories/MembersRepository";

export class ListMembersService {
  constructor(private readonly membersRepository: MembersRepository) {}

  async execute(peladaId: string) {
    const members = await this.membersRepository.listByPelada(peladaId);
    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    }));
  }
}
