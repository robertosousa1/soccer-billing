import { formatDateBR } from "@pelada/core";
import PDFDocument from "pdfkit";
import { GetMonthlyReportService } from "./GetMonthlyReportService";
import { PeladasRepository } from "../repositories/PeladasRepository";
import { prisma } from "../../database/client";
import { AppError } from "../utils/AppError";

type MonthlyReport = Awaited<ReturnType<GetMonthlyReportService["execute"]>>;

const COLORS = {
  pitch: "#0e6b46",
  pitchDeep: "#0a4f34",
  pitchDark: "#082c1f",
  card: "#ffffff",
  ink: "#13201a",
  muted: "#5f6f66",
  line: "#dde4dd",
  clay: "#c0492f",
  claySoft: "#fbeae5",
  pitchSoft: "#e7f1ec",
  blue: "#256364",
  emerald300: "#6ee7b7",
  red300: "#fca5a5",
  amber300: "#fcd34d",
  white: "#ffffff",
};

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function mesLabelTitulo(ym: string): string {
  const [y, m] = ym.split("-");
  const nome = MESES[Number(m) - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} / ${y}`;
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number, margin: number): number {
  const bottom = doc.page.height - margin;
  if (y + needed > bottom) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  peladaNome: string,
  competencia: string,
  report: MonthlyReport,
  margin: number,
  width: number,
): number {
  let y = margin;
  doc.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.pitchDeep).text(peladaNome, margin, y, {
    width,
    align: "center",
  });
  y += 30;
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.muted).text("Resumo Financeiro", margin, y, {
    width,
    align: "center",
  });
  y += 16;
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(COLORS.ink)
    .text(mesLabelTitulo(competencia), margin, y, { width, align: "center" });
  y += 18;
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`${formatDateBR(report.periodo.inicio)} a ${formatDateBR(report.periodo.fim)}`, margin, y, {
      width,
      align: "center",
    });
  y += 13;
  doc
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(`Gerado em ${formatDateBR(new Date())}`, margin, y, { width, align: "center" });
  y += 16;
  doc.moveTo(margin, y).lineTo(margin + width, y).lineWidth(1).strokeColor(COLORS.line).stroke();
  return y + 20;
}

function drawScoreboard(doc: PDFKit.PDFDocument, report: MonthlyReport, margin: number, width: number, y: number): number {
  const height = 90;
  const gradient = doc.linearGradient(margin, y, margin, y + height);
  gradient.stop(0, COLORS.pitchDeep).stop(1, COLORS.pitchDark);
  doc.roundedRect(margin, y, width, height, 12).fill(gradient);

  const colWidth = width / 3;
  const cells: { label: string; value: string; color: string }[] = [
    { label: "ENTRADA", value: report.entrou, color: COLORS.emerald300 },
    { label: "SAÍDA", value: report.saiu, color: COLORS.red300 },
    { label: "SALDO", value: report.saldo, color: COLORS.amber300 },
  ];

  cells.forEach((cell, i) => {
    const cx = margin + i * colWidth;
    doc.fillOpacity(0.7);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLORS.white)
      .text(cell.label, cx, y + 26, { width: colWidth, align: "center" });
    doc.fillOpacity(1);
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(cell.color)
      .text(cell.value, cx, y + 42, { width: colWidth, align: "center" });

    if (i > 0) {
      doc.strokeOpacity(0.15);
      doc.moveTo(cx, y + 16).lineTo(cx, y + height - 16).lineWidth(1).strokeColor(COLORS.white).stroke();
      doc.strokeOpacity(1);
    }
  });

  return y + height + 20;
}

function drawStatCards(doc: PDFKit.PDFDocument, report: MonthlyReport, margin: number, width: number, y: number): number {
  const gap = 12;
  const cardWidth = (width - gap * 3) / 4;
  const cardHeight = 64;
  const mensalistasPagos = report.mensalistas.filter((m) => m.pago).length;
  const pctMensalistas =
    report.mensalistas.length === 0 ? 0 : Math.round((mensalistasPagos / report.mensalistas.length) * 100);

  const cards: { label: string; value: string; secondary: string; secondaryColor: string }[] = [
    {
      label: "CAIXA INÍCIO",
      value: report.caixaInicial,
      secondary: "antes da competência",
      secondaryColor: COLORS.muted,
    },
    {
      label: "CAIXA FIM",
      value: report.caixaFinal,
      secondary:
        report.caixaVariacaoPct === null
          ? "sem base para %"
          : `${report.caixaVariacaoPct >= 0 ? "+" : ""}${report.caixaVariacaoPct.toFixed(0)}% na competência`,
      secondaryColor: report.caixaVariacaoPct === null || report.caixaVariacaoPct >= 0 ? COLORS.pitch : COLORS.clay,
    },
    {
      label: "MENSALISTAS",
      value: `${mensalistasPagos}/${report.mensalistas.length}`,
      secondary: `${pctMensalistas}% pagaram`,
      secondaryColor: COLORS.muted,
    },
    {
      label: "AVULSOS",
      value: String(report.avulsos.length),
      secondary: report.avulsos.length === 1 ? "jogador" : "jogadores",
      secondaryColor: COLORS.blue,
    },
  ];

  cards.forEach((card, i) => {
    const cx = margin + i * (cardWidth + gap);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 10).fillAndStroke(COLORS.card, COLORS.line);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(card.label, cx + 10, y + 10, { width: cardWidth - 20 });
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(COLORS.ink)
      .text(card.value, cx + 10, y + 24, { width: cardWidth - 20 });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(card.secondaryColor)
      .text(card.secondary, cx + 10, y + 46, { width: cardWidth - 20 });
  });

  return y + cardHeight + 20;
}

function drawQuadraSection(doc: PDFKit.PDFDocument, report: MonthlyReport, margin: number, width: number, y: number): number {
  const paga = report.quadra.paga;
  const pagamentos = report.quadra.pagamentos;
  const bg = paga ? COLORS.pitchSoft : COLORS.claySoft;
  const border = paga ? COLORS.pitch : COLORS.clay;
  const text = paga ? COLORS.pitchDeep : COLORS.clay;

  const lineHeight = 14;
  const detailLines = paga ? Math.max(pagamentos.length, 1) : 1;
  const height = 28 + detailLines * lineHeight;

  y = ensureSpace(doc, y, height + 20, margin);

  doc.lineWidth(1);
  doc.roundedRect(margin, y, width, height, 8).fillAndStroke(bg, border);

  const titulo = paga ? "Quadra paga" : "Quadra pendente";
  doc.font("Helvetica-Bold").fontSize(10).fillColor(text).text(titulo, margin + 14, y + 8, { width: width - 28 });

  let detailY = y + 22;
  if (paga) {
    if (pagamentos.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(text).text(`Valor: ${report.quadra.total}`, margin + 14, detailY, {
        width: width - 28,
      });
    } else {
      for (const pagamento of pagamentos) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(text)
          .text(`${formatDateBR(pagamento.data)}  ·  ${pagamento.valor}`, margin + 14, detailY, {
            width: width - 28,
          });
        detailY += lineHeight;
      }
    }
  } else {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(text)
      .text(
        `Referência: ${report.quadra.valorReferencia ?? "?"}, vencimento dia ${report.quadra.diaPagamento ?? "?"}`,
        margin + 14,
        detailY,
        { width: width - 28 },
      );
  }

  return y + height + 24;
}

function drawPeopleColumn(
  doc: PDFKit.PDFDocument,
  cx: number,
  colWidth: number,
  y: number,
  titulo: string,
  nomes: string[],
  color: string,
): void {
  doc.font("Helvetica-Bold").fontSize(10).fillColor(color).text(`${titulo} (${nomes.length})`, cx, y, { width: colWidth });
  let rowY = y + 18;
  const rowHeight = 14;
  for (const nome of nomes) {
    doc.circle(cx + 4, rowY + 4, 3).fill(color);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink).text(nome, cx + 14, rowY, {
      width: colWidth - 14,
      height: rowHeight,
      ellipsis: true,
    });
    rowY += rowHeight;
  }
}

function drawParticipants(doc: PDFKit.PDFDocument, report: MonthlyReport, margin: number, width: number, y: number): void {
  const pagos = report.mensalistas.filter((m) => m.pago).map((m) => m.nome);
  const inadimplentes = report.mensalistas.filter((m) => !m.pago).map((m) => m.nome);
  const avulsos = report.avulsos.map((a) => a.nome);

  const maxRows = Math.max(pagos.length, inadimplentes.length, avulsos.length);
  const sectionHeight = 18 + 18 + maxRows * 14;
  y = ensureSpace(doc, y, sectionHeight, margin);

  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.ink).text("Pessoas e status", margin, y);
  y += 22;

  const gap = 16;
  const colWidth = (width - gap * 2) / 3;

  drawPeopleColumn(doc, margin, colWidth, y, "Pagos", pagos, COLORS.pitch);
  drawPeopleColumn(doc, margin + colWidth + gap, colWidth, y, "Inadimplentes", inadimplentes, COLORS.clay);
  drawPeopleColumn(doc, margin + (colWidth + gap) * 2, colWidth, y, "Avulsos", avulsos, COLORS.blue);
}

export class BuildMonthlyReportPdfService {
  async execute(peladaId: string, competencia: string): Promise<Buffer> {
    const pelada = await new PeladasRepository(prisma).findById(peladaId);
    if (!pelada) throw new AppError("Pelada não encontrada", 404);

    const report = await new GetMonthlyReportService().execute(peladaId, competencia);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

    const margin = 40;
    const width = doc.page.width - margin * 2;

    let y = drawHeader(doc, pelada.nome, competencia, report, margin, width);
    y = drawScoreboard(doc, report, margin, width, y);
    y = drawStatCards(doc, report, margin, width, y);
    y = drawQuadraSection(doc, report, margin, width, y);
    drawParticipants(doc, report, margin, width, y);

    doc.end();
    return done;
  }
}
