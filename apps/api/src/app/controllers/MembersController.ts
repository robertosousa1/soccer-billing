import type { Response } from "express";
import { prisma } from "../../database/client";
import { MembersRepository } from "../repositories/MembersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import { ListMembersService } from "../services/ListMembersService";
import { AddMemberService } from "../services/AddMemberService";
import { UpdateMemberRoleService } from "../services/UpdateMemberRoleService";
import { RemoveMemberService } from "../services/RemoveMemberService";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class MembersController {
  async list(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new ListMembersService(new MembersRepository(prisma));
    const members = await service.execute(req.params.peladaId);
    res.status(200).json(members);
  }

  async create(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { email, role } = req.body;
    const service = new AddMemberService(new MembersRepository(prisma), new UsersRepository(prisma));
    const member = await service.execute({ peladaId: req.params.peladaId, email, role });
    res.status(201).json(member);
  }

  async updateRole(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { role } = req.body;
    const service = new UpdateMemberRoleService(new MembersRepository(prisma));
    const member = await service.execute(req.params.peladaId, req.params.userId, role);
    res.status(200).json(member);
  }

  async destroy(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new RemoveMemberService(new MembersRepository(prisma));
    await service.execute(req.params.peladaId, req.params.userId);
    res.status(204).send();
  }
}
