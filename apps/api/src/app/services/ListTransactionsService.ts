import type { TransactionsRepository } from "../repositories/TransactionsRepository";

export class ListTransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  execute(peladaId: string) {
    return this.transactionsRepository.listByPelada(peladaId);
  }
}
