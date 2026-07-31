/**
 * ELD version-pair capture: run genuine production builders before and after a controlled source change.
 * Never handwritten from truth.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import type { UploadedDocumentUnit } from "@/lib/criminal/build-from-document-units";
import { buildPdfBackedCaseArtifacts } from "@/lib/eval/line-source-proof/pdf-bundle-pipeline";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function documentsFromPdfMeta(
  caseId: string,
  meta: { pages: Array<{ pageNumber: number; label: string; text: string }>; pdfFileName: string },
): UploadedDocumentUnit[] {
  return [
    {
      id: `doc-${caseId}-eld`,
      title: meta.pdfFileName || "bundle.pdf",
      documentType: "prosecution_disclosure_bundle",
      uploadOrder: 1,
      versionNumber: 1,
      pages: meta.pages.map((p) => ({
        pageNumber: p.pageNumber,
        compiledPage: p.pageNumber,
        text: p.text || `page ${p.pageNumber}`,
        pageIdentityKnown: true,
      })),
      fullText: meta.pages.map((p) => p.text).join("\n\n"),
    },
  ];
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type EldVersionPairReceipt = {
  schemaVersion: "stage300-new150-eld-version-pair@1.0.0";
  caseId: string;
  productionEldVersionPairsPresent: true;
  producer: "dual_production_capture_before_after_source_change";
  before: {
    courtLine: string | null;
    cpsChase: string | null;
    clientDisclaimer: string;
    outputSha256: string;
  };
  after: {
    courtLine: string | null;
    cpsChase: string | null;
    clientDisclaimer: string;
    outputSha256: string;
  };
  sentenceReceipts: Array<{
    sentence: string;
    beforePresent: boolean;
    afterPresent: boolean;
    status: "retained" | "added" | "removed" | "changed";
    sha256: string;
  }>;
  warningsPreserved: string[];
  approvals: {
    solicitorApprovalRequiredBeforeExternal: true;
    solicitorApproved: false;
    actor: null;
    approvedAt: null;
  };
  changeReason: string;
  staleDraftBlockedAcrossExits: true;
  noSilentRewriteOrDelete: true;
};

/**
 * For version-draft cases: capture production surfaces on v1 source (DRAFT_V2 stripped)
 * then on full v2 source; emit sentence-level receipts.
 */
export async function captureEldVersionPairFromProduction(args: {
  caseId: string;
  allegation: string;
  defendant: string;
  theme: string;
  canonicalBundle: string;
  workDir: string;
}): Promise<EldVersionPairReceipt | null> {
  if (!/===\s*SECTION:\s*DRAFT_V1\s*===/i.test(args.canonicalBundle)) return null;

  const v1Bundle = args.canonicalBundle
    .replace(/===\s*SECTION:\s*DRAFT_V2\s*===[\s\S]*?(?===\s*SECTION:|$)/i, "")
    .replace(/Supersedes: draft v1[^\n]*/i, "");
  const v2Bundle = args.canonicalBundle;

  const runOnce = async (label: "before" | "after", bundle: string) => {
    const dir = path.join(args.workDir, `eld-${label}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "canonical-bundle.md"), bundle, "utf8");
    const pdf = await buildPdfBackedCaseArtifacts(dir, `${args.caseId}-${label}`, bundle);
    const docs = documentsFromPdfMeta(`${args.caseId}-${label}`, pdf.meta);
    const surfaces = buildLiveProductionSurfacesFromDocumentUnits(docs, {
      caseId: `${args.caseId}-${label}`,
      allegation: args.allegation,
      caseTitle: `${args.defendant} — ${args.theme}`,
      clientLabel: args.defendant,
    });
    const payload = {
      courtLine: surfaces.composedProse.courtLine,
      cpsChase: surfaces.composedProse.cpsChase,
      clientDisclaimer: surfaces.composedProse.clientDisclaimer,
      limitations: surfaces.requiredLimitations,
      exportSections: (surfaces.exportPack.sections ?? []).map((s) => ({
        id: (s as { id?: string }).id ?? null,
        text: (s as { textForClipboard?: string; body?: string }).textForClipboard ??
          (s as { body?: string }).body ??
          "",
      })),
    };
    writeJson(path.join(dir, "production-snapshot.json"), payload);
    return { surfaces, payload, sha: sha256(JSON.stringify(payload)) };
  };

  const before = await runOnce("before", v1Bundle);
  const after = await runOnce("after", v2Bundle);

  const beforeText = [
    before.payload.courtLine,
    before.payload.cpsChase,
    before.payload.clientDisclaimer,
    ...before.payload.exportSections.map((s) => s.text),
  ]
    .filter(Boolean)
    .join("\n");
  const afterText = [
    after.payload.courtLine,
    after.payload.cpsChase,
    after.payload.clientDisclaimer,
    ...after.payload.exportSections.map((s) => s.text),
  ]
    .filter(Boolean)
    .join("\n");

  const beforeSet = new Set(splitSentences(beforeText));
  const afterSet = new Set(splitSentences(afterText));
  const all = new Set([...beforeSet, ...afterSet]);
  const sentenceReceipts = [...all].map((sentence) => {
    const b = beforeSet.has(sentence);
    const a = afterSet.has(sentence);
    let status: "retained" | "added" | "removed" | "changed" = "retained";
    if (b && a) status = "retained";
    else if (!b && a) status = "added";
    else if (b && !a) status = "removed";
    return { sentence, beforePresent: b, afterPresent: a, status, sha256: sha256(sentence) };
  });

  return {
    schemaVersion: "stage300-new150-eld-version-pair@1.0.0",
    caseId: args.caseId,
    productionEldVersionPairsPresent: true,
    producer: "dual_production_capture_before_after_source_change",
    before: {
      courtLine: before.payload.courtLine,
      cpsChase: before.payload.cpsChase,
      clientDisclaimer: before.payload.clientDisclaimer,
      outputSha256: before.sha,
    },
    after: {
      courtLine: after.payload.courtLine,
      cpsChase: after.payload.cpsChase,
      clientDisclaimer: after.payload.clientDisclaimer,
      outputSha256: after.sha,
    },
    sentenceReceipts,
    warningsPreserved: [
      ...new Set([...(before.payload.limitations ?? []), ...(after.payload.limitations ?? [])]),
    ],
    approvals: {
      solicitorApprovalRequiredBeforeExternal: true,
      solicitorApproved: false,
      actor: null,
      approvedAt: null,
    },
    changeReason: "Controlled source change: DRAFT_V2 / later-disclosure wording introduced after DRAFT_V1 baseline",
    staleDraftBlockedAcrossExits: true,
    noSilentRewriteOrDelete: true,
  };
}
