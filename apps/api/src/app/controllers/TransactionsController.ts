import type { Response } from "express";
import { prisma } from "../../database/client";
import { TransactionsRepository } from "../repositories/TransactionsRepository";
import { PayersRepository } from "../repositories/PayersRepository";
import { UpdateTransactionService } from "../services/UpdateTransactionService";
import { ListTransactionsService } from "../services/ListTransactionsService";
import { DeleteTransactionService } from "../services/DeleteTransactionService";
import { CreateTransactionService } from "../services/CreateTransactionService";
import { TransactionMapper } from "../mappers/TransactionMapper";
import { TransactionHistoryMapper } from "../mappers/TransactionHistoryMapper";
import { TransactionHistoryRepository } from "../repositories/TransactionHistoryRepository";
import { AppError } from "../utils/AppError";
import type { PeladaScopedRequest } from "../middlewares/ensureMember";

export class TransactionsController {
  async list(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new ListTransactionsService(new TransactionsRepository(prisma));
    const transactions = await service.execute(req.params.peladaId);
    res.status(200).json(transactions.map(TransactionMapper.toDTO));
  }

  async store(req: PeladaScopedRequest, res: Response): Promise<void> {
    const service = new CreateTransactionService(new TransactionsRepository(prisma), new PayersRepository(prisma));
    const transaction = await service.execute({ peladaId: req.params.peladaId, ...req.body });
    res.status(201).json(TransactionMapper.toDTO(transaction));
  }

  async update(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new UpdateTransactionService(new TransactionsRepository(prisma), new PayersRepository(prisma), prisma);
    const transaction = await service.execute({
      peladaId: req.params.peladaId,
      id: req.params.id,
      ...req.body,
      userId: req.userId,
    });
    res.status(200).json(transaction);
  }

  async history(req: PeladaScopedRequest, res: Response): Promise<void> {
    const repo = new TransactionHistoryRepository(prisma);
    const entries = await repo.findByTransaction(req.params.id);
    res.status(200).json(entries.map(TransactionHistoryMapper.toDTO));
  }

  async destroy(req: PeladaScopedRequest, res: Response): Promise<void> {
    if (!req.userId) throw new AppError("Não autenticado", 401);
    const service = new DeleteTransactionService(new TransactionsRepository(prisma), new PayersRepository(prisma));
    await service.execute(req.params.peladaId, req.params.id, req.userId);
    res.status(204).send();
  }
}
