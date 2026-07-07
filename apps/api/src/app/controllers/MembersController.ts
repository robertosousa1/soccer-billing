import type { Response } from "express";
import { prisma } from "../../database/client";
import { MembersRepository } from "../repositories/MembersRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import { UserInviteRepository } from "../repositories/UserInviteRepository";
import { PeladasRepository } from "../repositories/PeladasRepository";
import { AuditEntryRepository } from "../repositories/AuditEntryRepository";
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
    const { email, name, role } = req.body;
    const service = new AddMemberService(
      new MembersRepository(prisma),
      new UsersRepository(prisma),
      new UserInviteRepository(prisma),
      new PeladasRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    const result = await service.execute({
      peladaId: req.params.peladaId,
      email,
      name,
      role,
      actorUserId: req.userId ?? null,
    });

    if (result.type === "invited") {
      res.status(201).json({ invited: true, email: result.email, name: result.name });
    } else {
      res.status(201).json(result.member);
    }
  }

  async updateRole(req: PeladaScopedRequest, res: Response): Promise<void> {
    const { role } = req.body;
    const service = new UpdateMemberRoleService(
      new MembersRepository(prisma),
      new UsersRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    const member = await service.execute(req.params.peladaId, req.params.userId, role, req.userId ?? null);
    res.status(200).json(member);
  }

  async destroy(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new RemoveMemberService(
      new MembersRepository(prisma),
      new UsersRepository(prisma),
      new AuditEntryRepository(prisma),
    );
    await service.execute(req.params.peladaId, req.params.userId, req.userId ?? null);
    res.status(204).send();
  }


}
