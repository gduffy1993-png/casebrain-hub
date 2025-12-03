/**
 * Case Overview PDF Generator
 *
 * Generates a comprehensive PDF overview of a case including:
 * - Case details and metadata
 * - Current analysis snapshot
 * - Key risks and issues
 * - Audit log of events
 * - Supervisor review status
 */

import PDFDocument from "pdfkit";
import type { AnalysisMeta } from "@/lib/versioning";

// Type definitions for case overview
type CaseOverviewData = {
  // Case basics
  caseId: string;
  title: string;
  practiceArea: string;
  createdAt: string;
  clientName?: string;
  opponentName?: string;

  // Version info
  meta?: AnalysisMeta;

  // Supervisor review
  supervisorReviewed: boolean;
  supervisorReviewedAt?: string;
  supervisorReviewNote?: string;

  // Analysis summary
  riskCount: number;
  criticalRisks: string[];
  keyIssues: string[];
  missingEvidenceCount: number;
  complianceGaps: string[];
  limitationDaysRemaining?: number;
  limitationDate?: string;

  // Next steps
  nextSteps: string[];

  // Audit log (recent events)
  auditEvents: Array<{
    eventType: string;
    timestamp: string;
    userId?: string;
  }>;

  // Document summary
  documentCount: number;
  lastDocumentDate?: string;

  // Generated timestamp
  generatedAt: string;
  generatedBy: string;
};

/**
 * Generate Case Overview PDF
 */
export function generateCaseOverviewPdf(data: CaseOverviewData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Case Overview: ${data.title}`,
          Author: "CaseBrain",
          Subject: "Case Overview Report",
          Creator: "CaseBrain Legal Intelligence",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Colors
      const PRIMARY = "#6366f1";
      const DANGER = "#ef4444";
      const WARNING = "#f59e0b";
      const SUCCESS = "#22c55e";
      const TEXT = "#1f2937";
      const MUTED = "#6b7280";

      // =========================================================================
      // Header
      // =========================================================================

      doc
        .fillColor(PRIMARY)
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("Case Overview Report", { align: "center" });

      doc.moveDown(0.5);

      doc
        .fillColor(MUTED)
        .fontSize(10)
        .font("Helvetica")
        .text(`Generated: ${formatDate(data.generatedAt)}`, { align: "center" })
        .text(`By: ${data.generatedBy}`, { align: "center" });

      doc.moveDown(1);

      // Divider
      drawDivider(doc);

      // =========================================================================
      // Case Details Section
      // =========================================================================

      doc.moveDown(0.5);

      sectionHeader(doc, "Case Details");

      infoRow(doc, "Case ID", data.caseId);
      infoRow(doc, "Case Title", data.title);
      infoRow(doc, "Practice Area", formatPracticeArea(data.practiceArea));
      infoRow(doc, "Created", formatDate(data.createdAt));
      if (data.clientName) infoRow(doc, "Client", data.clientName);
      if (data.opponentName) infoRow(doc, "Opponent", data.opponentName);

      doc.moveDown(0.5);
      drawDivider(doc);

      // =========================================================================
      // Version & Meta Section
      // =========================================================================

      if (data.meta) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Analysis Version");

        infoRow(doc, "CaseBrain Version", data.meta.casebrainVersion);
        infoRow(doc, "Pack", `${data.meta.packId} v${data.meta.packVersion}`);
        if (data.meta.modelInfo) {
          infoRow(doc, "AI Model", `${data.meta.modelInfo.provider}/${data.meta.modelInfo.model}`);
        }
        infoRow(doc, "Generated", formatDate(data.meta.generatedAt));

        doc.moveDown(0.5);
        drawDivider(doc);
      }

      // =========================================================================
      // Supervisor Review Section
      // =========================================================================

      doc.moveDown(0.5);
      sectionHeader(doc, "Supervisor Review");

      if (data.supervisorReviewed) {
        doc
          .fillColor(SUCCESS)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("✓ REVIEWED", { continued: true })
          .fillColor(MUTED)
          .font("Helvetica")
          .text(` on ${formatDate(data.supervisorReviewedAt ?? "")}`);

        if (data.supervisorReviewNote) {
          doc.moveDown(0.3);
          doc
            .fillColor(TEXT)
            .fontSize(10)
            .font("Helvetica-Oblique")
            .text(`"${data.supervisorReviewNote}"`, { indent: 20 });
        }
      } else {
        doc
          .fillColor(WARNING)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("⏳ PENDING REVIEW");
      }

      doc.moveDown(0.5);
      drawDivider(doc);

      // =========================================================================
      // Risk Summary Section
      // =========================================================================

      doc.moveDown(0.5);
      sectionHeader(doc, "Risk Summary");

      // Total risks
      doc
        .fillColor(TEXT)
        .fontSize(10)
        .font("Helvetica")
        .text(`Total Risks Identified: ${data.riskCount}`);

      // Critical risks
      if (data.criticalRisks.length) {
        doc.moveDown(0.3);
        doc
          .fillColor(DANGER)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("Critical Risks:");

        for (const risk of data.criticalRisks.slice(0, 5)) {
          doc
            .fillColor(TEXT)
            .fontSize(9)
            .font("Helvetica")
            .text(`• ${risk}`, { indent: 15 });
        }
      }

      // Limitation
      if (data.limitationDaysRemaining !== undefined) {
        doc.moveDown(0.3);
        const limitColor =
          data.limitationDaysRemaining <= 30
            ? DANGER
            : data.limitationDaysRemaining <= 90
              ? WARNING
              : SUCCESS;
        doc
          .fillColor(limitColor)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(
            `Limitation: ${data.limitationDaysRemaining} days remaining${data.limitationDate ? ` (${formatDate(data.limitationDate)})` : ""}`
          );
      }

      doc.moveDown(0.5);
      drawDivider(doc);

      // =========================================================================
      // Key Issues Section
      // =========================================================================

      if (data.keyIssues.length) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Key Issues");

        for (const issue of data.keyIssues.slice(0, 10)) {
          doc
            .fillColor(TEXT)
            .fontSize(9)
            .font("Helvetica")
            .text(`• ${issue}`, { indent: 10 });
        }

        doc.moveDown(0.5);
        drawDivider(doc);
      }

      // =========================================================================
      // Compliance Gaps Section
      // =========================================================================

      if (data.complianceGaps.length) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Compliance Gaps");

        for (const gap of data.complianceGaps.slice(0, 8)) {
          doc
            .fillColor(WARNING)
            .fontSize(9)
            .font("Helvetica")
            .text(`⚠ ${gap}`, { indent: 10 });
        }

        doc.moveDown(0.5);
        drawDivider(doc);
      }

      // =========================================================================
      // Missing Evidence Section
      // =========================================================================

      if (data.missingEvidenceCount > 0) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Evidence Status");

        doc
          .fillColor(TEXT)
          .fontSize(10)
          .font("Helvetica")
          .text(`Total Documents: ${data.documentCount}`)
          .text(`Missing Evidence Items: ${data.missingEvidenceCount}`);

        if (data.lastDocumentDate) {
          doc.text(`Last Document Added: ${formatDate(data.lastDocumentDate)}`);
        }

        doc.moveDown(0.5);
        drawDivider(doc);
      }

      // =========================================================================
      // Next Steps Section
      // =========================================================================

      if (data.nextSteps.length) {
        doc.moveDown(0.5);
        sectionHeader(doc, "Recommended Next Steps");

        for (let i = 0; i < Math.min(data.nextSteps.length, 5); i++) {
          doc
            .fillColor(TEXT)
            .fontSize(9)
            .font("Helvetica")
            .text(`${i + 1}. ${data.nextSteps[i]}`, { indent: 10 });
        }

        doc.moveDown(0.5);
        drawDivider(doc);
      }

      // =========================================================================
      // Audit Log Section (new page if needed)
      // =========================================================================

      if (data.auditEvents.length) {
        if (doc.y > 650) {
          doc.addPage();
        }

        doc.moveDown(0.5);
        sectionHeader(doc, "Recent Activity Log");

        for (const event of data.auditEvents.slice(0, 15)) {
          doc
            .fillColor(MUTED)
            .fontSize(8)
            .font("Helvetica")
            .text(
              `${formatDate(event.timestamp)} - ${formatEventType(event.eventType)}`,
              { indent: 10 }
            );
        }
      }

      // =========================================================================
      // Footer
      // =========================================================================

      doc.moveDown(2);

      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font("Helvetica-Oblique")
        .text(
          "This report is generated by CaseBrain for internal case management purposes only. " +
            "It does not constitute legal advice. AI-generated insights are non-binding and should be reviewed by qualified personnel.",
          { align: "center" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc
    .fillColor("#6366f1")
    .fontSize(12)
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
    .text(value);
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatPracticeArea(area: string): string {
  return area
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEventType(eventType: string): string {
  return eventType
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export type { CaseOverviewData };

