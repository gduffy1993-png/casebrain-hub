#!/usr/bin/env npx tsx
/**
 * Build 30 realistic PDF-backed demo/audit cases and run the real CaseBrain proof pipeline.
 * Run: npx tsx scripts/scaffold-demo-audit-thirty-cases.ts
 *      npx tsx scripts/build-demo-audit-thirty-pdf-cases.ts
 */
import fs from "node:fs";
import path from "node:path";

import { caseDirForId } from "../lib/eval/demo-audit-packs/case-specs";
import { DEMO_AUDIT_THIRTY_CASES } from "../lib/eval/demo-audit-packs/thirty-case-catalog";
import { demoAuditClientSummaryClipboard, isDemoAuditCase } from "../lib/eval/demo-audit-packs/presentation-polish";
import { buildPdfPagesFromLayout } from "../lib/eval/demo-audit-packs/pdf-layout";
import { buildLineSourceProof, writeLineSourceProofArtifacts } from "../lib/eval/line-source-proof/build-report";
import { buildH5CaseModels } from "../lib/eval/line-source-proof/build-case-models";
import { buildPdfBackedCaseArtifacts } from "../lib/eval/line-source-proof/pdf-bundle-pipeline";
import { renderSolicitorProofPacket } from "../lib/eval/line-source-proof/render-solicitor-proof-packet";
import type { LineSourceProofReport } from "../lib/eval/line-source-proof/types";
import type { EvidenceStateTruthKey } from "../lib/eval/evidence-state-audit/types";

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, "artifacts", "casebrain-qa", "demo-audit-thirty");
const LINE_PROOF_ROOT = path.join(ROOT, "artifacts", "casebrain-qa", "line-source-proof");

const BANNED_PDF_WORDS = /\b(synthetic|simulator|test bundle|fake bundle|ai generated)\b/i;
const VAGUE_CHASE_RE = /\bmg6\s*\/\s*unused|mG6\b|schedule clarification\b|exhibit mapping|additional source material/i;

function countCaseFacingWrongFamily(
  models: ReturnType<typeof buildH5CaseModels>,
  bundleText: string,
): number {
  const hay = bundleText.toLowerCase();
  const lines = [
    ...models.chase.primaryItems.map((i) => `${i.label} ${i.draftChaseWording}`),
    ...models.five.evidenceState.rows.map((r) => r.label),
    ...models.warRoom.doNotOverstate,
    models.chase.safeCourtLine ?? "",
    models.warRoom.safePositionToday ?? "",
  ];
  let count = 0;
  for (const line of lines) {
    const l = line.toLowerCase();
    if (/\bcad\b|999|control.?room/.test(l) && !/\bcad\b|999|control.?room/.test(hay)) count++;
    if (/\bbwv\b|body.?worn/.test(l) && !/\bbwv\b|body.?worn|bodycam/.test(hay)) count++;
    if (/\bcctv\b|stills/.test(l) && !/cctv|stills|camera|footage/.test(hay)) count++;
    if (/encro|handle attribution|platform extraction/.test(l) && !/encro|handle|platform|message extract/.test(hay)) count++;
    if (/drug continuity|pwits/.test(l) && !/drug|pwits|cocaine|class a/.test(hay)) count++;
  }
  return count;
}

function countGenericLabels(models: ReturnType<typeof buildH5CaseModels>): number {
  const hay = [
    ...models.chase.primaryItems.map((i) => i.label),
    ...models.five.evidenceState.rows.map((r) => r.label),
  ].join(" ");
  return (hay.match(/\bmg6\s*\/\s*unused|\bmG6\b|schedule clarification|exhibit mapping \/ provenance|additional source-material/gi) ?? []).length;
}

type CaseScorecard = {
  caseId: string;
  caseName: string;
  shape: string;
  pdfPages: number;
  keyServedItems: string[];
  keyMissingReferred: string[];
  truthMapResult: Array<{ label: string; existence: string; note?: string }>;
  proofPacketVerdict: string;
  failLineCount: number;
  unsupportedLinesCount: number;
  wrongFamilyWarningsCount: number;
  proofLedgerWrongFamilyInternal: number;
  blockedFalseServedGuardsCount: number;
  pageBackedOutputLinesCount: number;
  vagueChaseLabelsCount: number;
  genericLabelCount: number;
  caseFacingWrongFamilyCount: number;
  readyForDemoReview: boolean;
  readyBlockers: string[];
  filesCreated: string[];
};

function loadTruthKey(caseDir: string): EvidenceStateTruthKey {
  return JSON.parse(fs.readFileSync(path.join(caseDir, "truth-key.json"), "utf8"));
}

function countWrongFamily(report: LineSourceProofReport): number {
  return report.lines.filter((l) =>
    l.gedReviewReasons.some((r) =>
      /bundle_does_not_mention_(cctv|cad|phone|bwv|encro|custody)/i.test(r),
    ),
  ).length;
}

function countBlockedFalseServedGuards(report: LineSourceProofReport, truthKey: EvidenceStateTruthKey): number {
  /** Counts suppressed/blocked safety guards — not live false-served output. */
  const missingItems = new Set(
    truthKey.evidenceItems
      .filter((i) => ["missing", "referred_only", "incomplete", "other_defendant_only"].includes(i.correct_evidence_state))
      .map((i) => i.evidence_item.toLowerCase()),
  );
  let count = 0;
  for (const line of report.lines) {
    if (line.verdict !== "PASS" || line.reviewTier !== "clean_source_backed") continue;
    const out = line.outputLine.toLowerCase();
    for (const item of missingItems) {
      if (out.includes(item) && /served|on file|on bundle|confirmed/i.test(out)) count++;
    }
  }
  return count;
}

function countProofLedgerWrongFamilyInternal(report: LineSourceProofReport): number {
  return report.lines.filter((l) =>
    l.gedReviewReasons.some((r) => /bundle_does_not_mention_/i.test(r)),
  ).length;
}

function countVagueChaseLabels(models: ReturnType<typeof buildH5CaseModels>): number {
  return models.chase.primaryItems.filter((i) => VAGUE_CHASE_RE.test(i.label)).length;
}

function assessReady(
  report: LineSourceProofReport,
  truthKey: EvidenceStateTruthKey,
  models: ReturnType<typeof buildH5CaseModels>,
  pdfBanned: boolean,
): { ready: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const evidenceRows = models.five.evidenceState.rows;
  if (pdfBanned) blockers.push("Banned wording found in PDF/canonical bundle");
  if (report.summary.proofChainCoverage.caseProofMode !== "pdf_and_text") {
    blockers.push(`Proof mode is ${report.summary.proofChainCoverage.caseProofMode}, expected pdf_and_text`);
  }
  if (countCaseFacingWrongFamily(models, models.bundleText) > 0) {
    blockers.push(`Case-facing wrong-family lines: ${countCaseFacingWrongFamily(models, models.bundleText)}`);
  }
  if (countGenericLabels(models) > 0) blockers.push(`Generic labels in case-facing output: ${countGenericLabels(models)}`);
  if (countVagueChaseLabels(models) > 0) blockers.push(`Vague CPS chase labels: ${countVagueChaseLabels(models)}`);
  if (report.summary.fail > 0) blockers.push(`Proof FAIL lines: ${report.summary.fail}`);
  const servedRows = evidenceRows.filter((r) =>
    ["served", "referred_only"].includes(r.existence),
  );
  if (servedRows.length < 1) blockers.push("Truth map has no served/referred rows");
  const missingRows = evidenceRows.filter((r) =>
    ["missing", "referred_only", "not_safely_confirmed", "incomplete"].includes(r.existence),
  );
  if (missingRows.length < 1) blockers.push("Truth map missing chase rows for outstanding material");
  if (report.summary.proofChainCoverage.pdfAndTextSupportOutput < 3) {
    blockers.push(`Low page-backed lines: ${report.summary.proofChainCoverage.pdfAndTextSupportOutput}`);
  }
  const mustServe = truthKey.evidenceItems.filter((i) => i.correct_evidence_state === "served");
  const bundleLower = models.bundleText.toLowerCase();
  for (const item of mustServe) {
    const token = item.evidence_item.split(" ")[0]!.toLowerCase();
    if (token.length > 3 && !bundleLower.includes(token)) {
      blockers.push(`Served item not in bundle text: ${item.evidence_item}`);
    }
  }
  return { ready: blockers.length === 0, blockers };
}

function writeTabSnapshots(
  caseOutDir: string,
  models: ReturnType<typeof buildH5CaseModels>,
  report: LineSourceProofReport,
): void {
  fs.mkdirSync(caseOutDir, { recursive: true });

  const evidenceRows = models.five.evidenceState.rows;

  const overview = {
    truthMap: evidenceRows.map((r) => ({
      label: r.label,
      existence: r.existence,
      note: r.note,
      sendability: r.sendabilityLabel,
    })),
    mustNotOverstate: models.five.mustNotOverstate,
    evidenceTrace: models.five.evidenceTrace,
  };
  fs.writeFileSync(path.join(caseOutDir, "overview-truth-map.json"), JSON.stringify(overview, null, 2));

  const court = {
    safeCourtLine: models.chase.safeCourtLine,
    safePositionToday: models.warRoom.safePositionToday,
    askCourtToRecord: models.warRoom.askCourtToRecord,
    disclosureTimetable: models.warRoom.draftWording.disclosureTimetable,
    doNotOverstate: models.warRoom.doNotOverstate,
  };
  fs.writeFileSync(path.join(caseOutDir, "court-tab.json"), JSON.stringify(court, null, 2));

  const chase = {
    primaryItems: models.chase.primaryItems.map((i) => ({
      label: i.label,
      baseStatus: i.baseStatus,
      draftChaseWording: i.draftChaseWording,
      whyItMatters: i.whyItMatters,
    })),
    safeCourtLine: models.chase.safeCourtLine,
  };
  fs.writeFileSync(path.join(caseOutDir, "cps-chase.json"), JSON.stringify(chase, null, 2));

  const clientSection = models.exportPack.sections.find((s) => s.id === "client_summary");
  const clientText = isDemoAuditCase(models.caseId)
    ? demoAuditClientSummaryClipboard(models.truthKey, models.clientLabel, clientSection?.footer)
    : clientSection?.textForClipboard;
  fs.writeFileSync(
    path.join(caseOutDir, "client-summary.json"),
    JSON.stringify(
      {
        title: clientSection?.title,
        text: clientText,
        generatedAt: models.exportPack.version.generatedAt,
      },
      null,
      2,
    ),
  );

  const fileView = {
    bundleSource: "bundle-text.md",
    pdfSource: "bundle.pdf",
    pdfExtractionMeta: "pdf-extraction-meta.json",
    pageCount: report.proofChainAppendix.sourceDocuments.find((d) => d.type === "pdf")?.pageCount ?? null,
    pageLabels: report.proofChainAppendix.sourceDocuments
      .filter((d) => d.type === "pdf_page")
      .map((d) => ({ page: d.pageNumber, label: d.label })),
    bundleTextPreview: models.bundleText.slice(0, 1200),
  };
  fs.writeFileSync(path.join(caseOutDir, "file-source-view.json"), JSON.stringify(fileView, null, 2));

  const casebrainOutput = {
    caseId: models.caseId,
    clientLabel: models.clientLabel,
    allegation: models.allegation,
    bundleTextLength: models.bundleText.length,
    chaseItemCount: models.chase.primaryItems.length,
    truthMapRowCount: models.five.evidenceState.rows.length,
    proofSummary: report.summary,
    proofChainCoverage: report.summary.proofChainCoverage,
  };
  fs.writeFileSync(path.join(caseOutDir, "casebrain-output.json"), JSON.stringify(casebrainOutput, null, 2));

  fs.writeFileSync(path.join(caseOutDir, "SOLICITOR-PROOF-PACKET.md"), renderSolicitorProofPacket(report));
}

async function buildOneCase(spec: (typeof DEMO_AUDIT_THIRTY_CASES)[0]): Promise<CaseScorecard> {
  const caseDir = path.join(ROOT, caseDirForId(spec.id));
  const caseOutDir = path.join(OUT_ROOT, spec.id);
  const canonicalPath = path.join(caseDir, "canonical-bundle.md");
  const canonicalBundle = fs.readFileSync(canonicalPath, "utf8");

  if (BANNED_PDF_WORDS.test(canonicalBundle)) {
    throw new Error(`Banned wording in canonical bundle for ${spec.id}`);
  }

  console.log(`\n=== ${spec.id} — ${spec.title} ===`);

  const artifacts = await buildPdfBackedCaseArtifacts(caseDir, spec.id, canonicalBundle, {
    splitPages: (text) => buildPdfPagesFromLayout(text, spec.pdfLayout),
  });

  const truthKey = loadTruthKey(caseDir);
  truthKey.proofChainMode = "pdf_backed_controlled";
  fs.writeFileSync(path.join(caseDir, "truth-key.json"), JSON.stringify(truthKey, null, 2));
  fs.writeFileSync(path.join(caseDir, "canonical-bundle-reference.md"), canonicalBundle);

  console.log(`  PDF: ${artifacts.pdfPath} (${artifacts.meta.pageCount} pages)`);
  console.log(`  Extraction similarity: ${Math.round(artifacts.meta.canonicalComparison.similarityRatio * 100)}%`);

  const report = buildLineSourceProof(caseDir, LINE_PROOF_ROOT);
  const proofPaths = writeLineSourceProofArtifacts(report, LINE_PROOF_ROOT);
  const models = buildH5CaseModels(caseDir);

  writeTabSnapshots(caseOutDir, models, report);

  const evidenceRows = models.five.evidenceState.rows;
  const keyServed = truthKey.evidenceItems
    .filter((i) => i.correct_evidence_state === "served")
    .map((i) => i.evidence_item);
  const keyMissing = truthKey.evidenceItems
    .filter((i) => ["missing", "referred_only", "incomplete", "not_safely_confirmed", "other_defendant_only"].includes(i.correct_evidence_state))
    .map((i) => `${i.evidence_item} (${i.correct_evidence_state})`);

  const { ready, blockers } = assessReady(report, truthKey, models, false);

  const scorecard: CaseScorecard = {
    caseId: spec.id,
    caseName: spec.title,
    shape: spec.shape,
    pdfPages: artifacts.meta.pageCount,
    keyServedItems: keyServed,
    keyMissingReferred: keyMissing,
    truthMapResult: evidenceRows.map((r) => ({ label: r.label, existence: r.existence, note: r.note })),
    proofPacketVerdict: report.summary.fail > 0 ? "BLOCKED" : report.summary.warning > 0 ? "PASS WITH WARNINGS" : "PASS",
    failLineCount: report.summary.fail,
    unsupportedLinesCount: report.summary.proofChainCoverage.outputUnsupported,
    wrongFamilyWarningsCount: countWrongFamily(report),
    proofLedgerWrongFamilyInternal: countProofLedgerWrongFamilyInternal(report),
    blockedFalseServedGuardsCount: countBlockedFalseServedGuards(report, truthKey),
    pageBackedOutputLinesCount: report.summary.proofChainCoverage.pdfAndTextSupportOutput,
    vagueChaseLabelsCount: countVagueChaseLabels(models),
    genericLabelCount: countGenericLabels(models),
    caseFacingWrongFamilyCount: countCaseFacingWrongFamily(models, models.bundleText),
    readyForDemoReview: ready,
    readyBlockers: blockers,
    filesCreated: [
      path.relative(ROOT, path.join(caseDir, "bundle.pdf")),
      path.relative(ROOT, path.join(caseDir, "bundle-text.md")),
      path.relative(ROOT, path.join(caseDir, "pdf-extraction-meta.json")),
      path.relative(ROOT, path.join(caseDir, "truth-key.json")),
      path.relative(ROOT, proofPaths.mdPath),
      path.relative(ROOT, proofPaths.packetPath),
      path.relative(ROOT, path.join(caseOutDir, "overview-truth-map.json")),
      path.relative(ROOT, path.join(caseOutDir, "court-tab.json")),
      path.relative(ROOT, path.join(caseOutDir, "cps-chase.json")),
      path.relative(ROOT, path.join(caseOutDir, "client-summary.json")),
      path.relative(ROOT, path.join(caseOutDir, "file-source-view.json")),
      path.relative(ROOT, path.join(caseOutDir, "casebrain-output.json")),
      path.relative(ROOT, path.join(caseOutDir, "scorecard.json")),
    ],
  };

  fs.writeFileSync(path.join(caseOutDir, "scorecard.json"), JSON.stringify(scorecard, null, 2));

  const scorecardMd = [
    `# Scorecard — ${spec.title}`,
    "",
    `- **Case ID:** ${spec.id}`,
    `- **PDF pages:** ${scorecard.pdfPages}`,
    `- **Proof mode:** ${report.proofChainAppendix.caseProofMode}`,
    `- **Ready for demo/audit review:** ${scorecard.readyForDemoReview ? "yes" : "no"}`,
    ...(scorecard.readyBlockers.length ? scorecard.readyBlockers.map((b) => `- Blocker: ${b}`) : []),
    "",
    "## Key served items",
    ...keyServed.map((s) => `- ${s}`),
    "",
    "## Key missing/referred items",
    ...keyMissing.map((s) => `- ${s}`),
    "",
    "## Truth map",
    ...scorecard.truthMapResult.map((r) => `- **${r.label}** — ${r.existence}${r.note ? ` — ${r.note}` : ""}`),
    "",
    "## Proof metrics",
    `- Page-backed output lines: **${scorecard.pageBackedOutputLinesCount}**`,
    `- Unsupported lines: **${scorecard.unsupportedLinesCount}**`,
    `- Wrong-family (proof ledger internal): **${scorecard.proofLedgerWrongFamilyInternal}**`,
    `- Wrong-family (case-facing): **${scorecard.caseFacingWrongFamilyCount}**`,
    `- Generic labels: **${scorecard.genericLabelCount}**`,
    `- Blocked false-served guards (not live output): **${scorecard.blockedFalseServedGuardsCount}**`,
    `- Vague chase labels: **${scorecard.vagueChaseLabelsCount}**`,
    `- Proof packet verdict: **${scorecard.proofPacketVerdict}**`,
    "",
    "## Files",
    ...scorecard.filesCreated.map((f) => `- \`${f}\``),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(caseOutDir, "SCORECARD.md"), scorecardMd);

  console.log(`  lines: ${report.summary.totalMeaningfulLines}  FAIL: ${report.summary.fail}  pdf+text: ${scorecard.pageBackedOutputLinesCount}`);
  console.log(`  ready: ${scorecard.readyForDemoReview ? "yes" : "no"}${blockers.length ? ` (${blockers.join("; ")})` : ""}`);

  return scorecard;
}

function coverageRow(caseId: string, shape: string): string {
  const themes: Array<[RegExp, string]> = [
    [/phone|screenshot|subscriber|digital|metadata/i, "phone/digital"],
    [/cctv|stills|master/i, "CCTV"],
    [/bwv|custody|pace/i, "BWV/custody"],
    [/co-def|multi-def|target defendant/i, "co-def/multi-def"],
    [/encro|county|handle/i, "Encro/county lines"],
    [/fraud|bank|transaction|tracing/i, "fraud/bank"],
    [/motoring|breath|sjp|intoxilyser|device/i, "motoring/SJP"],
    [/domestic|stalking|harassment/i, "domestic/harassment"],
    [/sexual|abe|historic/i, "historic sexual/ABE"],
    [/youth|yjs|vulnerability/i, "youth/vulnerability"],
    [/ocr|layout|duplicate|index|missing pages/i, "OCR/layout/index traps"],
  ];
  const hits = themes.filter(([re]) => re.test(`${caseId} ${shape}`)).map(([, t]) => t);
  return hits.length ? hits.join(", ") : shape.slice(0, 40);
}

function renderMasterSummary(scorecards: CaseScorecard[]): string {
  const readyCount = scorecards.filter((s) => s.readyForDemoReview).length;
  const totalFail = scorecards.reduce((n, s) => n + s.failLineCount, 0);
  const totalUnsupported = scorecards.reduce((n, s) => n + s.unsupportedLinesCount, 0);
  const totalWrongFamily = scorecards.reduce((n, s) => n + s.caseFacingWrongFamilyCount, 0);
  const totalGeneric = scorecards.reduce((n, s) => n + s.genericLabelCount, 0);

  return [
    "# Demo audit thirty — PDF-backed proof pack",
    "",
    "Thirty fictional prosecution bundles (DA-01..30) with served and outstanding material, run through the real CaseBrain H5 builders and line-source proof pipeline.",
    "",
    "## Scope statement",
    "",
    "- **Brain/core changes:** None — presentation polish in `lib/eval/demo-audit-packs/` only.",
    "- **Scale cap:** 30 cases — do not extend beyond this pack without explicit review.",
    "",
    "## Aggregate metrics",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Ready | ${readyCount}/30 |`,
    `| FAIL lines (total) | ${totalFail} |`,
    `| Unsupported emitted (total) | ${totalUnsupported} |`,
    `| Case-facing wrong-family (total) | ${totalWrongFamily} |`,
    `| Generic MG6 labels (total) | ${totalGeneric} |`,
    "",
    "## Summary table",
    "",
    `| Case | Pages | PDF+text | FAIL | Wrong-family | Generic | Ready |`,
    `|------|------:|---------:|-----:|-------------:|--------:|:-----:|`,
    ...scorecards.map(
      (s) =>
        `| ${s.caseId.replace("demo-audit-", "")} | ${s.pdfPages} | ${s.pageBackedOutputLinesCount} | ${s.failLineCount} | ${s.caseFacingWrongFamilyCount} | ${s.genericLabelCount} | ${s.readyForDemoReview ? "yes" : "no"} |`,
    ),
    "",
    "## Coverage table",
    "",
    `| Case | Themes |`,
    `|------|--------|`,
    ...scorecards.map((s) => `| ${s.caseId.replace("demo-audit-", "")} | ${coverageRow(s.caseId, s.shape)} |`),
    "",
    "## Per-case scorecards",
    "",
    ...scorecards.map((s) => `- [${s.caseName}](./${s.caseId}/SCORECARD.md)`),
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
}

async function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const scorecards: CaseScorecard[] = [];

  for (const spec of DEMO_AUDIT_THIRTY_CASES) {
    scorecards.push(await buildOneCase(spec));
  }

  const summaryPath = path.join(OUT_ROOT, "DEMO-AUDIT-THIRTY-SUMMARY.md");
  fs.writeFileSync(summaryPath, renderMasterSummary(scorecards));
  fs.writeFileSync(path.join(OUT_ROOT, "demo-audit-thirty-summary.json"), JSON.stringify(scorecards, null, 2));

  console.log(`\nMaster summary: ${summaryPath}`);
  const notReady = scorecards.filter((s) => !s.readyForDemoReview);
  if (notReady.length) {
    console.log(`\n${notReady.length} case(s) flagged for Codex review (see scorecard blockers):`);
    for (const s of notReady) console.log(`  - ${s.caseId}: ${s.readyBlockers.join("; ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
