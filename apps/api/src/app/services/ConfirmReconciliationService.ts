import { linhaNeedsSplitNames, normalizeName, type ImportLineDraft, type ImportShareDraft } from "@pelada/core";
import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "../utils/AppError";

interface Request {
  peladaId: string;
  nomeArquivo: string;
  hash: string;
  rawFileKey?: string | null;
  linhas: ImportLineDraft[];
}

interface BatchPayer {
  id: string;
  tipo: "MENSALISTA" | "AVULSO";
  desde: string | null;
}

/**
 * Regras-bug (DOMAIN.md §13), todas dentro de UMA transação de banco:
 * 1. Pagante novo com grafias diferentes no mesmo lote -> reaproveita via novosPorNome.
 * 2. Ao reaproveitar mensalista no lote, `desde` baixa para a MENOR competência vista.
 * 3. Apelido do extrato (nomeOriginal) só é adicionado ao pagante da cota ordem=0 (pagador real).
 */
export class ConfirmReconciliationService {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(req: Request) {
    const incluidas = req.linhas.filter((l) => !l.duplicada && !l.ignorada);
    if (incluidas.length === 0) {
      throw new AppError("Nenhum lançamento novo para confirmar", 400);
    }
    if (incluidas.some(linhaNeedsSplitNames)) {
      throw new AppError(
        "Há cota de mensalidade sem nome do amigo. Informe o nome na divisão ou recategorize como Contribuição.",
        400,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const novosPorNome = new Map<string, BatchPayer>();
      let qtdNovas = 0;

      for (const linha of incluidas) {
        if (linha.valor < 0) {
          await tx.transaction.create({
            data: {
              peladaId: req.peladaId,
              data: linha.data,
              hora: linha.hora,
              nomeOriginal: linha.nomeOriginal,
              valor: linha.valor,
              formaPagamento: linha.formaPagamento,
              competencia: linha.competencia,
              chaveNatural: linha.chaveNatural,
              outflowCategory: linha.outflowCategory,
            },
          });
          qtdNovas += 1;
          continue;
        }

        const sharesData: Prisma.ShareCreateWithoutTransactionInput[] = [];

        for (const share of linha.shares ?? []) {
          const payerId = await this.resolvePayerId({
            tx,
            peladaId: req.peladaId,
            share,
            nomeOriginal: linha.nomeOriginal,
            competencia: linha.competencia,
            novosPorNome,
          });
          sharesData.push({
            valor: share.valor,
            categoria: share.categoria,
            ordem: share.ordem,
            payer: payerId ? { connect: { id: payerId } } : undefined,
          });
        }

        await tx.transaction.create({
          data: {
            peladaId: req.peladaId,
            data: linha.data,
            hora: linha.hora,
            nomeOriginal: linha.nomeOriginal,
            valor: linha.valor,
            formaPagamento: linha.formaPagamento,
            competencia: linha.competencia,
            chaveNatural: linha.chaveNatural,
            shares: { create: sharesData },
          },
        });
        qtdNovas += 1;
      }

      const qtdDuplicadas = req.linhas.length - incluidas.length;

      const novaImport = await tx.import.create({
        data: {
          peladaId: req.peladaId,
          hash: req.hash,
          nomeArquivo: req.nomeArquivo,
          rawFileKey: req.rawFileKey ?? null,
          qtdNovas,
          qtdDuplicadas,
        },
      });

      await tx.transaction.updateMany({
        where: { peladaId: req.peladaId, chaveNatural: { in: incluidas.map((l) => l.chaveNatural) } },
        data: { importId: novaImport.id },
      });

      return novaImport;
    });
  }

  private async resolvePayerId(params: {
    tx: Prisma.TransactionClient;
    peladaId: string;
    share: ImportShareDraft;
    nomeOriginal: string;
    competencia: string;
    novosPorNome: Map<string, BatchPayer>;
  }): Promise<string | null> {
    const { tx, peladaId, share, nomeOriginal, competencia, novosPorNome } = params;

    // já tem paganteId resolvido (pagante existente reconhecido por apelido/nome)
    if (share.payerId) {
      if (share.ordem === 0) {
        await this.addAliasIfMissing(tx, peladaId, share.payerId, nomeOriginal);
        await this.bumpDesdeIfEarlier(tx, share.payerId, competencia);
      }
      await this.bumpTelefoneIfMissing(tx, share.payerId, share.telefone);
      return share.payerId;
    }

    const nomeDigitado = (share.nome || nomeOriginal).trim();
    if (!nomeDigitado) return null;

    const key = normalizeName(nomeDigitado);
    const reaproveitado = novosPorNome.get(key);
    if (reaproveitado) {
      if (reaproveitado.tipo === "MENSALISTA" && competencia < (reaproveitado.desde ?? competencia)) {
        reaproveitado.desde = competencia;
        await tx.payer.update({ where: { id: reaproveitado.id }, data: { desde: competencia } });
      }
      await this.bumpTelefoneIfMissing(tx, reaproveitado.id, share.telefone);
      return reaproveitado.id;
    }

    const tipo = share.categoria === "MENSALIDADE" ? "MENSALISTA" : "AVULSO";
    const apelidos = share.ordem === 0 && nomeDigitado !== nomeOriginal ? [nomeDigitado, nomeOriginal] : [nomeDigitado];

    const created = await tx.payer.create({
      data: {
        peladaId,
        nome: nomeDigitado,
        tipo,
        desde: tipo === "MENSALISTA" ? competencia : null,
        telefone: share.telefone?.trim() || null,
        aliases: {
          create: apelidos.map((alias) => ({
            peladaId,
            alias,
            aliasNorm: normalizeName(alias),
          })),
        },
      },
    });

    novosPorNome.set(key, { id: created.id, tipo: created.tipo, desde: created.desde });
    return created.id;
  }

  private async addAliasIfMissing(
    tx: Prisma.TransactionClient,
    peladaId: string,
    payerId: string,
    nomeOriginal: string,
  ): Promise<void> {
    const aliasNorm = normalizeName(nomeOriginal);
    const existing = await tx.payerAlias.findUnique({ where: { peladaId_aliasNorm: { peladaId, aliasNorm } } });
    if (existing) return;
    await tx.payerAlias.create({ data: { peladaId, payerId, alias: nomeOriginal, aliasNorm } });
  }

  private async bumpDesdeIfEarlier(
    tx: Prisma.TransactionClient,
    payerId: string,
    competencia: string,
  ): Promise<void> {
    const payer = await tx.payer.findUnique({ where: { id: payerId } });
    if (!payer || payer.tipo !== "MENSALISTA") return;
    if (!payer.desde || competencia < payer.desde) {
      await tx.payer.update({ where: { id: payerId }, data: { desde: competencia } });
    }
  }

  private async bumpTelefoneIfMissing(
    tx: Prisma.TransactionClient,
    payerId: string,
    telefone?: string | null,
  ): Promise<void> {
    const tel = telefone?.trim();
    if (!tel) return;
    const payer = await tx.payer.findUnique({ where: { id: payerId } });
    if (!payer || payer.telefone) return;
    await tx.payer.update({ where: { id: payerId }, data: { telefone: tel } });
  }
}
