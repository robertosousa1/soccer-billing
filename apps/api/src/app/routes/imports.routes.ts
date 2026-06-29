import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ImportsController } from "../controllers/ImportsController";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";

const importsRouter = Router({ mergeParams: true });
const importsController = new ImportsController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

importsRouter.post("/preview", authorize("WRITE"), upload.single("file"), (req, res, next) =>
  importsController.preview(req, res).catch(next),
);

const shareSchema = z.object({
  valor: z.number().int(),
  categoria: z.enum(["MENSALIDADE", "AVULSO", "OUTRO", "CONTRIBUICAO"]),
  ordem: z.number().int(),
  payerId: z.string().nullable(),
  nome: z.string(),
  telefone: z.string().nullable().optional(),
});

const linhaSchema = z.object({
  data: z.string(),
  hora: z.string(),
  nomeOriginal: z.string(),
  valor: z.number().int(),
  formaPagamento: z.string().nullable().optional(),
  competencia: z.string(),
  chaveNatural: z.string(),
  duplicada: z.boolean(),
  ignorada: z.boolean().optional(),
  outflowCategory: z.enum(["QUADRA", "OUTRA_SAIDA"]).optional(),
  shares: z.array(shareSchema).optional(),
  novoPagante: z.boolean().optional(),
});

importsRouter.post(
  "/confirm",
  authorize("WRITE"),
  validate({
    body: z.object({
      nomeArquivo: z.string(),
      hash: z.string(),
      rawFileKey: z.string().nullable().optional(),
      linhas: z.array(linhaSchema),
    }),
  }),
  (req, res, next) => importsController.confirm(req, res).catch(next),
);

export { importsRouter };
