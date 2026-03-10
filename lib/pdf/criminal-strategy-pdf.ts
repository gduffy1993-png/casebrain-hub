/**
 * Phase 6: Criminal Strategy Export PDF
 * "Strategy on one page" – primary approach, burden map, pressure points, HRS, disclosure timeline, solicitor instructions.
 */

import PDFDocument from "pdfkit";

export type CriminalStrategyExportData = {
  caseId: string;
  title: string;
  generatedAt: string;
  offenceLabel?: string;
  nextHearingType?: string;
  nextHearingDate?: string;
  primaryStrategy?: string;
  confidence?: string;
  burdenMap?: Array<{ label: string; support: string; leverage: string }>;
  pressurePoints?: Array<{ label: string; priority?: string; reason?: string }>;
  hrsChecklist?: string[];
  hrsHearingLabel?: string;
  disclosureTimeline?: Array<{ item: string; action: string; date: string; note?: string }>;
  solicitorInstructions?: string | null;
  /** Phase 6 optional: Defence narrative (DNB) */
  defenceNarrative?: string;
  /** Phase 6 optional: Risk–outcome matrix rows */
  riskOutcomeMatrix?: Array<{ option: string; outcomeSummary: string; riskLevel: string; isPrimary?: boolean }>;
};

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc
    .fillColor("#6366f1")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(title.toUpperCase(), { underline: false });
  doc.moveDown(0.3);
}

function infoRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc
    .fillColor("#6b7280")
    .fontSize(9)
    .font("Helvetica")
    .text(`${label}: `, { continued: true })
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .text(value || "—");
}

function drawDivider(doc: PDFKit.PDFDocument) {
  doc
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function generateCriminalStrategyPdf(data: CriminalStrategyExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Strategy summary: ${data.title}`,
          Author: "CaseBrain",
          Subject: "Criminal Defence Strategy Summary",
          Creator: "CaseBrain Legal Intelligence",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const TEXT = "#1f2937";
      const MUTED = "#6b7280";

      doc
        .fillColor("#6366f1")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Strategy on one page", { align: "center" });
      doc.moveDown(0.3);
      doc
        .fillColor(MUTED)
        .fontSize(10)
        .font("Helvetica")
        .text(data.title || "Criminal case", { align: "center" })
        .text(`Generated: ${formatDate(data.generatedAt)}`, { align: "center" });
      doc.moveDown(1);
      drawDivider(doc);

      doc.moveDown(0.5);
      sectionHeader(doc, "Strategy at a glance");
      infoRow(doc, "Primary approach", data.primaryStrategy ?? "—");
      infoRow(doc, "Offence", data.offenceLabel ?? "—");
      infoRow(doc, "Next hearing", data.nextHearingType && data.nextHearingDate
        ? `${data.nextHearingType} – ${formatDate(data.nextHearingDate)}`
        : data.nextHearingType ?? "—");
      if (data.confidence) infoRow(doc, "Confidence", data.confidence);
      doc.moveDown(0.5);
      drawDivider(doc);

      if (data.solicitorInstructions && data.solicitorInstructions.trim()) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Solicitor instructions / overrides");
        doc
          .fillColor(TEXT)
          .fontSize(9)
          .font("Helvetica")
          .text(data.solicitorInstructions.trim(), { indent: 10, align: "left" });
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.defenceNarrative && data.defenceNarrative.trim()) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Defence narrative");
        doc
          .fillColor(TEXT)
          .fontSize(9)
          .font("Helvetica")
          .text(data.defenceNarrative.trim(), { indent: 10, align: "left" });
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.riskOutcomeMatrix && data.riskOutcomeMatrix.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Risk–outcome matrix");
        doc.fontSize(9).font("Helvetica").fillColor(MUTED).text("Strategic options and likely outcomes.", { indent: 10 });
        doc.moveDown(0.3);
        for (const row of data.riskOutcomeMatrix) {
          const primaryTag = row.isPrimary ? " (primary)" : "";
          doc
            .fillColor(TEXT)
            .fontSize(9)
            .text(`${row.option}${primaryTag} – ${row.outcomeSummary}; risk: ${row.riskLevel}`, { indent: 15 });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.burdenMap && data.burdenMap.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Burden map");
        doc.fontSize(9).font("Helvetica").fillColor(MUTED).text("What prosecution must prove and defence leverage.", { indent: 10 });
        doc.moveDown(0.3);
        for (const row of data.burdenMap.slice(0, 10)) {
          doc
            .fillColor(TEXT)
            .text(`• ${row.label} – strength: ${row.support}; leverage: ${row.leverage}`, { indent: 15 });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.pressurePoints && data.pressurePoints.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Pressure points");
        doc.fontSize(9).font("Helvetica").fillColor(MUTED).text("Missing evidence, weak inferences, disclosure gaps.", { indent: 10 });
        doc.moveDown(0.3);
        for (const p of data.pressurePoints.slice(0, 12)) {
          const pri = p.priority ? ` [${p.priority}]` : "";
          doc.fillColor(TEXT).text(`• ${p.label}${pri}`, { indent: 15 });
          if (p.reason) doc.fillColor(MUTED).fontSize(8).text(`  ${p.reason}`, { indent: 15 }).fontSize(9);
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.hrsChecklist && data.hrsChecklist.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "For your next hearing");
        if (data.hrsHearingLabel) {
          doc.fontSize(9).font("Helvetica").fillColor(MUTED).text(data.hrsHearingLabel, { indent: 10 });
          doc.moveDown(0.3);
        }
        for (const item of data.hrsChecklist) {
          doc.fillColor(TEXT).fontSize(9).text(`☐ ${item}`, { indent: 15 });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.disclosureTimeline && data.disclosureTimeline.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Disclosure timeline");
        for (const e of data.disclosureTimeline.slice(0, 15)) {
          doc
            .fillColor(TEXT)
            .fontSize(9)
            .text(`${e.item} – ${e.action}${e.date ? ` (${formatDate(e.date)})` : ""}`, { indent: 10 });
          if (e.note) doc.fillColor(MUTED).fontSize(8).text(`  ${e.note}`, { indent: 10 });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      doc.moveDown(1);
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica-Oblique")
        .text(
          "Generated by CaseBrain. For internal use and counsel. Does not constitute legal advice.",
          { align: "center" }
        );
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
