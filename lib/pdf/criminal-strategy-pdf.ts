/**
 * Phase 6: Criminal Strategy Export PDF
 * "Strategy on one page" – primary approach, burden map, pressure points, HRS, disclosure timeline, solicitor instructions.
 */

import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";

const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));

/** Resolve pdfkit AFM data directory so Helvetica.afm is found outside webpack chunks. */
function resolvePdfkitDataDir(): string | null {
  try {
    const pkg = requireFromCwd.resolve("pdfkit/package.json");
    const dataDir = path.join(path.dirname(pkg), "js", "data");
    if (fs.existsSync(path.join(dataDir, "Helvetica.afm"))) return dataDir;
  } catch {
    /* fall through */
  }
  const alt = path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");
  if (fs.existsSync(path.join(alt, "Helvetica.afm"))) return alt;
  return null;
}

function ensurePdfkitFontsResolvable(): void {
  const dataDir = resolvePdfkitDataDir();
  if (!dataDir) {
    throw new Error(
      "Strategy PDF export cannot locate Helvetica.afm (pdfkit font data). Ensure pdfkit is installed and serverExternalPackages includes pdfkit.",
    );
  }
  const helvetica = path.join(dataDir, "Helvetica.afm");
  if (!fs.existsSync(helvetica)) {
    throw new Error(`Missing Helvetica.afm at ${helvetica}`);
  }
}

/**
 * PDFKit's standard fonts use WinAnsi encoding. Characters outside it are dropped or
 * rendered as noise, which is where the malformed bullet glyphs came from. Anything
 * unrepresentable is mapped to a readable ASCII equivalent before it reaches the page.
 */
const WINANSI_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2610\u2611\u2612\u25A1\u25A0\u2751]/g, "[ ]"],
  [/[\u2713\u2714]/g, "[x]"],
  [/[\u25CF\u25CB\u25E6\u2043\u00B7\u2023]/g, "\u2022"],
  [/[\u2192\u27A4\u27F6]/g, "->"],
  [/[\u2190\u27F5]/g, "<-"],
  [/[\u2264]/g, "<="],
  [/[\u2265]/g, ">="],
  [/[\u2260]/g, "!="],
  [/[\u00A0\u2007\u202F]/g, " "],
  [/[\u2028\u2029]/g, "\n"],
];

/** Highest code point representable by WinAnsi after the explicit replacements above. */
const WINANSI_SAFE = /[^\u0000-\u007F\u00A1-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/g;

export function pdfSafeText(value: string): string {
  let out = value;
  for (const [re, replacement] of WINANSI_REPLACEMENTS) out = out.replace(re, replacement);
  return out.replace(WINANSI_SAFE, "");
}

export type CriminalStrategyChargeRow = {
  count: number | null;
  offence: string;
  defendants?: string[];
  documentRole?: string | null;
  status?: string | null;
  sourceLabel?: string | null;
};

export type CriminalStrategyExportData = {
  caseId: string;
  title: string;
  generatedAt: string;
  offenceLabel?: string;
  nextHearingType?: string;
  nextHearingDate?: string;
  /** Canonical hearing lifecycle note (e.g. earlier notice preserved / date conflict). */
  hearingLifecycleNote?: string | null;
  /** Charges taken from canonical state so the PDF never shows an empty charge block. */
  charges?: CriminalStrategyChargeRow[];
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
  /** Provenance limitations that must travel into the PDF exit (e.g. unknown page identity). */
  provenanceLimitations?: string[];
};

/** Usable vertical space left on the current page. */
function remainingSpace(doc: PDFKit.PDFDocument): number {
  return doc.page.height - doc.page.margins.bottom - doc.y;
}

/**
 * Start a new page only when the block genuinely will not fit. Section headers used to
 * land at the very bottom of a page and push their body over, leaving a near-empty
 * page behind; requiring room for the header plus its first lines avoids that.
 */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (remainingSpace(doc) < needed) doc.addPage();
}

/** Minimum room for a section header plus a couple of body lines. */
const SECTION_BLOCK_HEIGHT = 72;

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, SECTION_BLOCK_HEIGHT);
  doc
    .fillColor("#6366f1")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(pdfSafeText(title.toUpperCase()), { underline: false });
  doc.moveDown(0.3);
}

function infoRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  ensureSpace(doc, 24);
  doc
    .fillColor("#6b7280")
    .fontSize(9)
    .font("Helvetica")
    .text(pdfSafeText(`${label}: `), { continued: true })
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .text(pdfSafeText(value || "—"));
}

/** Body line with glyph sanitisation and a page break only when it will not fit. */
function bodyLine(
  doc: PDFKit.PDFDocument,
  text: string,
  opts: { indent?: number; color?: string; size?: number; font?: string } = {},
) {
  const size = opts.size ?? 9;
  ensureSpace(doc, size * 2.4);
  doc
    .fillColor(opts.color ?? "#1f2937")
    .fontSize(size)
    .font(opts.font ?? "Helvetica")
    .text(pdfSafeText(text), { indent: opts.indent ?? 10, align: "left" });
}

function drawDivider(doc: PDFKit.PDFDocument) {
  // Never draw a rule below the text area — that produced stray marks and
  // apparently blank space at the foot of a page.
  if (remainingSpace(doc) < 8) return;
  doc
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
}

/** "Page X of Y" on every page, written inside the bottom margin band. */
function paginate(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .fillColor("#6b7280")
      .fontSize(8)
      .font("Helvetica")
      .text(
        `Page ${i - range.start + 1} of ${range.count}`,
        50,
        doc.page.height - 32,
        { align: "center", width: doc.page.width - 100, lineBreak: false },
      );
    doc.page.margins.bottom = bottomMargin;
  }
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
      ensurePdfkitFontsResolvable();
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
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
        .text(pdfSafeText(data.title || "Criminal case"), { align: "center" })
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
      if (data.hearingLifecycleNote?.trim()) {
        bodyLine(doc, data.hearingLifecycleNote.trim(), { color: MUTED, size: 8 });
      }
      doc.moveDown(0.5);
      drawDivider(doc);

      if (data.charges && data.charges.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Charges");
        for (const charge of data.charges) {
          const countLabel = charge.count != null ? `Count ${charge.count}` : "Count not stated";
          const defendants = charge.defendants?.length
            ? charge.defendants.join(", ")
            : "defendant not allocated on this instrument";
          const role = charge.documentRole ? ` [${charge.documentRole}]` : "";
          const status = charge.status ? `; status: ${charge.status}` : "";
          bodyLine(doc, `\u2022 ${countLabel}${role} - ${charge.offence}`, { indent: 15 });
          bodyLine(doc, `Defendant: ${defendants}${status}`, {
            indent: 25,
            color: MUTED,
            size: 8,
          });
          if (charge.sourceLabel) {
            bodyLine(doc, `Source: ${charge.sourceLabel}`, { indent: 25, color: MUTED, size: 8 });
          }
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.solicitorInstructions && data.solicitorInstructions.trim()) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Solicitor instructions / overrides");
        bodyLine(doc, data.solicitorInstructions.trim(), { color: TEXT });
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.defenceNarrative && data.defenceNarrative.trim()) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Defence narrative");
        bodyLine(doc, data.defenceNarrative.trim(), { color: TEXT });
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.riskOutcomeMatrix && data.riskOutcomeMatrix.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Risk–outcome matrix");
        bodyLine(doc, "Strategic options and likely outcomes.", { color: MUTED });
        doc.moveDown(0.3);
        for (const row of data.riskOutcomeMatrix) {
          const primaryTag = row.isPrimary ? " (primary)" : "";
          bodyLine(
            doc,
            `\u2022 ${row.option}${primaryTag} - ${row.outcomeSummary}; risk: ${row.riskLevel}`,
            { indent: 15, color: TEXT },
          );
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.burdenMap && data.burdenMap.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Burden map");
        bodyLine(doc, "What prosecution must prove and defence leverage.", { color: MUTED });
        doc.moveDown(0.3);
        for (const row of data.burdenMap.slice(0, 10)) {
          bodyLine(
            doc,
            `\u2022 ${row.label} - strength: ${row.support}; leverage: ${row.leverage}`,
            { indent: 15, color: TEXT },
          );
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.pressurePoints && data.pressurePoints.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Pressure points");
        bodyLine(doc, "Missing evidence, weak inferences, disclosure gaps.", { color: MUTED });
        doc.moveDown(0.3);
        for (const p of data.pressurePoints.slice(0, 12)) {
          const pri = p.priority ? ` [${p.priority}]` : "";
          bodyLine(doc, `\u2022 ${p.label}${pri}`, { indent: 15, color: TEXT });
          if (p.reason) bodyLine(doc, p.reason, { indent: 25, color: MUTED, size: 8 });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.hrsChecklist && data.hrsChecklist.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "For your next hearing");
        if (data.hrsHearingLabel) {
          bodyLine(doc, data.hrsHearingLabel, { color: MUTED });
          doc.moveDown(0.3);
        }
        for (const item of data.hrsChecklist) {
          bodyLine(doc, `[ ] ${item}`, { indent: 15, color: TEXT });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.disclosureTimeline && data.disclosureTimeline.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Disclosure timeline");
        for (const e of data.disclosureTimeline.slice(0, 15)) {
          bodyLine(
            doc,
            `\u2022 ${e.item} - ${e.action}${e.date ? ` (${formatDate(e.date)})` : ""}`,
            { indent: 15, color: TEXT },
          );
          if (e.note) bodyLine(doc, e.note, { indent: 25, color: MUTED, size: 8 });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      if (data.provenanceLimitations && data.provenanceLimitations.length > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Provenance limitations");
        for (const limitation of data.provenanceLimitations.slice(0, 20)) {
          bodyLine(doc, `\u2022 ${limitation}`, { indent: 15, color: TEXT });
        }
        doc.moveDown(0.5);
        drawDivider(doc);
      }

      doc.moveDown(1);
      ensureSpace(doc, 30);
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica-Oblique")
        .text(
          "Generated by CaseBrain. For internal use and counsel. Does not constitute legal advice.",
          { align: "center" }
        );
      paginate(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
