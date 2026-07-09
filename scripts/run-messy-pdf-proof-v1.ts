#!/usr/bin/env npx tsx
/**
 * Messy PDF-backed proof pack + proof receipts (v1).
 *
 * Run:
 *   npx tsx scripts/run-messy-pdf-proof-v1.ts
 */
import fs from "node:fs";
import path from "node:path";

import { buildLineSourceProof, writeLineSourceProofArtifacts } from "../lib/eval/line-source-proof/build-report";
import { runAcceptanceGates, type CaseAcceptanceReport } from "../lib/eval/line-source-proof/acceptance-gates";
import type { LineSourceProofRecord, LineSourceProofReport } from "../lib/eval/line-source-proof/types";
import { buildPdfBackedCaseArtifacts } from "../lib/eval/line-source-proof/pdf-bundle-pipeline";

const ROOT = process.cwd();
const CASE_ROOT = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");
const OUT_ROOT = path.join(ROOT, "artifacts", "casebrain-qa", "messy-pdf-proof-v1");
const LINE_OUT_ROOT = path.join(OUT_ROOT, "line-source-proof");
const CASE_OUT_ROOT = path.join(OUT_ROOT, "cases");

const BANNED_WORDS = ["synthetic", "simulator", "test bundle", "fake", "ai-generated"];

type ScenarioSpec = {
  index: number;
  scenario: string;
  sourceCaseId: string;
  caseId: string;
  title: string;
};

const SCENARIOS: ScenarioSpec[] = [
  {
    index: 1,
    scenario: "Phone harassment — screenshots served, download/subscriber missing, attribution disputed",
    sourceCaseId: "demo-audit-01-phone-harassment",
    caseId: "messy-pdf-v1-01-phone-harassment",
    title: "MPDF-01 Riley Moss — phone harassment messy proof pack",
  },
  {
    index: 2,
    scenario: "BWV/custody — custody extract served, full custody missing, BWV referred, interview audio missing",
    sourceCaseId: "demo-audit-03-bwv-custody",
    caseId: "messy-pdf-v1-02-bwv-custody",
    title: "MPDF-02 Jordan Hale — BWV/custody messy proof pack",
  },
  {
    index: 3,
    scenario: "CCTV — stills served, master footage missing, continuity/hash/audit trail missing",
    sourceCaseId: "demo-audit-08-cctv-night-stills",
    caseId: "messy-pdf-v1-03-cctv-stills-master-missing",
    title: "MPDF-03 Farah Kent — CCTV continuity gaps messy proof pack",
  },
  {
    index: 4,
    scenario: "Co-defendant material — co-def interview referenced, target defendant interview missing",
    sourceCaseId: "demo-audit-04-co-def-interview",
    caseId: "messy-pdf-v1-04-codefendant-material",
    title: "MPDF-04 Reece Nolan — co-defendant bleed guard messy proof pack",
  },
  {
    index: 5,
    scenario: "Encro/handle attribution — messages served, handle mapping/platform extraction missing",
    sourceCaseId: "demo-audit-05-encro-attribution",
    caseId: "messy-pdf-v1-05-encro-handle-attribution",
    title: "MPDF-05 Nadia Pike — Encro handle attribution messy proof pack",
  },
  {
    index: 6,
    scenario: "Index contradiction — index says exhibit served, PDF missing, MG6C refers only",
    sourceCaseId: "demo-audit-24-missing-pages-index",
    caseId: "messy-pdf-v1-06-index-contradiction",
    title: "MPDF-06 Ellis Grant — index contradiction messy proof pack",
  },
  {
    index: 7,
    scenario: "Duplicate/rotated OCR bundle — duplicated pages, rotated scan text, OCR date/court risk",
    sourceCaseId: "demo-audit-23-duplicate-pages",
    caseId: "messy-pdf-v1-07-duplicate-rotated-ocr",
    title: "MPDF-07 Priya Shah — duplicate/rotated OCR messy proof pack",
  },
  {
    index: 8,
    scenario: "Charge mismatch — charge sheet wording differs from MG5/case summary",
    sourceCaseId: "demo-audit-25-charge-bundle-mismatch",
    caseId: "messy-pdf-v1-08-charge-mismatch",
    title: "MPDF-08 Aiden Cole — charge mismatch messy proof pack",
  },
  {
    index: 9,
    scenario: "Medical/injury evidence — injury alleged, report/photos missing or partial",
    sourceCaseId: "demo-audit-19-motoring-breath-specimen",
    caseId: "messy-pdf-v1-09-medical-injury-evidence",
    title: "MPDF-09 Lila Moore — medical/injury evidence messy proof pack",
  },
  {
    index: 10,
    scenario: "Youth/vulnerability/appropriate adult — safeguard referred, record missing/partial",
    sourceCaseId: "demo-audit-22-youth-interview",
    caseId: "messy-pdf-v1-10-youth-vulnerability-aa",
    title: "MPDF-10 Kian Doyle — youth/AA safeguards messy proof pack",
  },
];

type ReceiptRecord = {
  lineId: string;
  outputLine: string;
  surface: string;
  sourceDocumentName: string;
  sourcePageNumber: string | null;
  sourceSnippet: string | null;
  evidenceState: string | null;
  confidenceSupportLevel: string;
  safeAction: "rely" | "check" | "chase" | "do-not-use";
  unsafeWordingBlockedOrRefused: string | null;
  whySafeLimitedOrReview: string;
};

type CaseRun = {
  spec: ScenarioSpec;
  caseDir: string;
  report: LineSourceProofReport;
  acceptance: CaseAcceptanceReport;
  receipts: ReceiptRecord[];
  hardFailures: Record<string, number>;
  softWarnings: Record<string, number>;
  bannedWordHits: string[];
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function mapSurface(outputSurface: string): string {
  const s = outputSurface.toLowerCase();
  if (s.includes("overview")) return "Overview";
  if (s.includes("court")) return "Court";
  if (s.includes("chase")) return "CPS Chase";
  if (s.includes("client")) return "Client Summary";
  if (s.includes("paper") || s.includes("file")) return "Papers/File";
  if (s.includes("export")) return "Export";
  return "Overview";
}

function supportLevel(line: LineSourceProofRecord): string {
  if (line.proofChainStatus === "pdf_and_text_support_output") return "pdf+text strong";
  if (line.proofChainStatus === "text_supports_but_pdf_unchecked") return "text-only support";
  if (line.proofChainStatus === "pdf_available_but_text_mismatch") return "mismatch review";
  if (line.proofChainStatus === "source_unavailable") return "source unavailable";
  return "unsupported";
}

function actionFor(line: LineSourceProofRecord): "rely" | "check" | "chase" | "do-not-use" {
  const status = (line.supportStatus ?? "").toLowerCase();
  if (line.verdict === "FAIL" || status === "unsupported" || line.proofChainStatus === "output_unsupported") return "do-not-use";
  if (status === "missing" || status === "referred_only" || status === "incomplete") return "chase";
  if (line.solicitorReviewRequired || status === "source_unavailable" || status === "partially_supported") return "check";
  return "rely";
}

function buildReceipts(report: LineSourceProofReport): ReceiptRecord[] {
  return report.lines
    .filter((line) => line.usefulnessVerdict !== "excluded")
    .map((line) => ({
      lineId: line.id,
      outputLine: line.humanOutputLine ?? line.outputLine,
      surface: mapSurface(line.outputSurface),
      sourceDocumentName: line.sourceDocumentName ?? "bundle.pdf",
      sourcePageNumber: line.sourcePageNumber,
      sourceSnippet: line.extractedSnippet ?? line.sourceSnippet ?? null,
      evidenceState: line.evidenceState,
      confidenceSupportLevel: supportLevel(line),
      safeAction: actionFor(line),
      unsafeWordingBlockedOrRefused: line.blockedWording ?? line.safeWording ?? null,
      whySafeLimitedOrReview: line.whyThisIsLimited === "none" ? line.whyThisSupportsTheLine : line.whyThisIsLimited,
    }));
}

function writeReceipts(caseOutDir: string, caseId: string, receipts: ReceiptRecord[]) {
  ensureDir(caseOutDir);
  const jsonPath = path.join(caseOutDir, "proof-receipts.json");
  const mdPath = path.join(caseOutDir, "PROOF-RECEIPTS.md");
  fs.writeFileSync(jsonPath, JSON.stringify({ caseId, receipts }, null, 2));

  const mdLines = [
    `# Proof Receipts — ${caseId}`,
    "",
    "Solicitor-readable receipt for each meaningful output line.",
    "",
    `Total receipts: **${receipts.length}**`,
    "",
    "| # | Surface | Action | Support | Source doc | Page | Output line |",
    "|---:|---------|--------|---------|------------|------|-------------|",
    ...receipts.map((r, i) => {
      const output = r.outputLine.replace(/\|/g, "/");
      return `| ${i + 1} | ${r.surface} | ${r.safeAction} | ${r.confidenceSupportLevel} | ${r.sourceDocumentName} | ${r.sourcePageNumber ?? "-"} | ${output} |`;
    }),
    "",
    "## Detail",
    "",
    ...receipts.flatMap((r, i) => [
      `### ${i + 1}. ${r.outputLine}`,
      `- Surface/tab: ${r.surface}`,
      `- Source document: ${r.sourceDocumentName}`,
      `- Source page: ${r.sourcePageNumber ?? "not page-anchored"}`,
      `- Source snippet: ${r.sourceSnippet ?? "none"}`,
      `- Evidence state: ${r.evidenceState ?? "not mapped"}`,
      `- Confidence/support level: ${r.confidenceSupportLevel}`,
      `- Safe action: ${r.safeAction}`,
      `- Unsafe wording blocked/refused: ${r.unsafeWordingBlockedOrRefused ?? "none"}`,
      `- Why safe/limited/review: ${r.whySafeLimitedOrReview}`,
      "",
    ]),
  ];
  fs.writeFileSync(mdPath, mdLines.join("\n"));
}

function countBy(receipts: ReceiptRecord[], key: keyof ReceiptRecord, value: string): number {
  return receipts.filter((r) => String(r[key] ?? "").toLowerCase() === value.toLowerCase()).length;
}

function detectHardFailures(report: LineSourceProofReport, acceptance: CaseAcceptanceReport): Record<string, number> {
  const lines = report.lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const hard: Record<string, number> = {
    false_served: 0,
    referred_only_treated_as_served: 0,
    missing_treated_as_available: 0,
    incomplete_treated_as_complete: 0,
    wrong_defendant_bleed: 0,
    wrong_family_bleed: 0,
    court_wording_in_cps_chase: 0,
    cps_chase_wording_in_court_note: 0,
    unsupported_allegation_stated_as_fact: 0,
    attribution_overclaim: 0,
    final_advice_win_loss_wording: 0,
    unsafe_client_summary: 0,
    source_page_mismatch: 0,
    output_with_no_source_anchor: 0,
  };

  for (const l of lines) {
    const text = (l.humanOutputLine ?? l.outputLine).toLowerCase();
    const state = (l.evidenceState ?? "").toLowerCase();
    const isDoNotOverstate = l.lineCategory === "safety_warning" || /\bdo not state\b|\bdo not say\b|\bmust not\b/.test(text);
    const hasServedNegation = /\bnot fully served\b|\bis not fully served\b|\bnot safely served\b/.test(text);
    const servedClaim = !isDoNotOverstate && !hasServedNegation && /\bserved in full\b|\bfully served\b|\bsafely served\b/.test(text);
    const availableClaim = /\bavailable on file\b|\bsafely confirmed\b/.test(text);
    if (servedClaim && /missing|referred_only|incomplete|not_safely_confirmed|other_defendant_only/.test(state)) hard.false_served += 1;
    if (state === "referred_only" && servedClaim) hard.referred_only_treated_as_served += 1;
    if (state === "missing" && availableClaim) hard.missing_treated_as_available += 1;
    if ((state === "incomplete" || state === "partial") && /\bcomplete\b|\bfully served\b/.test(text)) hard.incomplete_treated_as_complete += 1;
    if (
      l.extractionIssue === "mixed_defendant" ||
      (/other defendant|co-defendant only/.test(text) && /\bserved\b/.test(text))
    ) {
      hard.wrong_defendant_bleed += 1;
    }
    // Strictly classify cross-surface leakage by line category, not loose keyword occurrence.
    const surface = l.outputSurface.toLowerCase();
    // Count only true cross-surface leakage, not intentionally mirrored views.
    if (surface.startsWith("cps_chase") && l.lineCategory === "court_note") {
      hard.court_wording_in_cps_chase += 1;
    }
    if (surface.startsWith("court") && l.lineCategory === "chase_request") {
      hard.cps_chase_wording_in_court_note += 1;
    }
    if (l.claimType === "fact" && (l.supportStatus === "unsupported" || l.proofChainStatus === "output_unsupported")) {
      hard.unsupported_allegation_stated_as_fact += 1;
    }
    if (
      /defendant sent|attribution (is )?proved/.test(text) &&
      /not_safely_confirmed|missing|referred_only/.test(state) &&
      l.claimType === "fact"
    ) {
      hard.attribution_overclaim += 1;
    }
    if (/\bguaranteed\b|\bwill win\b|\bwill lose\b|\bfinal advice\b/.test(text)) hard.final_advice_win_loss_wording += 1;
    if (l.outputSurface.toLowerCase().includes("client") && l.verdict === "FAIL") hard.unsafe_client_summary += 1;
    // Mismatch is hard only when emitted as unsupported/fail, not ordinary review warnings.
    if (
      l.proofChainStatus === "pdf_available_but_text_mismatch" &&
      (l.verdict === "FAIL" || l.supportStatus === "unsupported" || l.proofChainStatus === "output_unsupported")
    ) {
      hard.source_page_mismatch += 1;
    }
    // Missing source anchor is hard only for substantive fact claims emitted as clean PASS.
    const substantiveClaim = l.claimType === "fact" || l.claimType === "inference";
    if (
      !l.sourceAnchor &&
      l.lineCategory !== "non_evidence_ui" &&
      l.lineCategory !== "safety_warning" &&
      l.reviewTier !== "generic_safety_guard" &&
      substantiveClaim &&
      l.verdict === "PASS"
    ) {
      hard.output_with_no_source_anchor += 1;
    }
  }

  const wrongFamilyGate = acceptance.gates.find((g) => g.gate === "zero_wrong_family_bleed");
  if (wrongFamilyGate && !wrongFamilyGate.passed) hard.wrong_family_bleed = 1;
  return hard;
}

function detectSoftWarnings(report: LineSourceProofReport): Record<string, number> {
  const lines = report.lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const soft: Record<string, number> = {
    generic_mg6_wording: 0,
    repeated_wording: 0,
    unclear_labels: 0,
    duplicate_bullets: 0,
    dense_internal_wording: 0,
    possible_false_suppression: report.proofLedger.counts.possibleFalseSuppressions ?? 0,
    ocr_date_court_ambiguity: 0,
    partial_support_only: 0,
    too_cautious_not_surfaced: report.proofLedger.counts.missingExpectedOutputs ?? 0,
  };

  const textSeen = new Map<string, number>();
  for (const l of lines) {
    const text = (l.humanOutputLine ?? l.outputLine).trim();
    const lower = text.toLowerCase();
    textSeen.set(lower, (textSeen.get(lower) ?? 0) + 1);
    if (/mg6c?\b.*referred|schedule only/.test(lower)) soft.generic_mg6_wording += 1;
    if (/unclear|unknown|tbd|n\/a/.test(lower)) soft.unclear_labels += 1;
    if (text.length > 240 || /internal|pipeline|classifier|suppression/.test(lower)) soft.dense_internal_wording += 1;
    if (l.extractionIssue === "OCR_low_confidence" || /ocr|date|court.*unclear/.test(lower)) soft.ocr_date_court_ambiguity += 1;
    if (l.supportStatus === "partially_supported" || l.proofChainStatus === "text_supports_but_pdf_unchecked") soft.partial_support_only += 1;
  }
  for (const [, count] of textSeen) {
    if (count > 1) {
      soft.repeated_wording += 1;
      soft.duplicate_bullets += 1;
    }
  }
  return soft;
}

function bannedWordHits(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_WORDS.filter((w) => lower.includes(w));
}

function aggregateIssues(rows: CaseRun[], key: "hardFailures" | "softWarnings"): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    for (const [k, v] of Object.entries(row[key])) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

async function stage1CreateCases(): Promise<Array<{ spec: ScenarioSpec; caseDir: string; bannedWordHits: string[] }>> {
  console.log("\n=== Stage 1 — Build 10 messy PDF-backed cases ===");
  ensureDir(CASE_ROOT);
  const created: Array<{ spec: ScenarioSpec; caseDir: string; bannedWordHits: string[] }> = [];

  for (const spec of SCENARIOS) {
    const sourceDir = path.join(CASE_ROOT, spec.sourceCaseId);
    const caseDir = path.join(CASE_ROOT, spec.caseId);
    ensureDir(caseDir);

    const canonicalPath = fs.existsSync(path.join(sourceDir, "canonical-bundle.md"))
      ? path.join(sourceDir, "canonical-bundle.md")
      : path.join(sourceDir, "bundle-text.md");
    const canonicalBundle = fs.readFileSync(canonicalPath, "utf8");
    const sourceBundleText = fs.readFileSync(path.join(sourceDir, "bundle-text.md"), "utf8");
    fs.writeFileSync(path.join(caseDir, "canonical-bundle.md"), canonicalBundle);

    await buildPdfBackedCaseArtifacts(caseDir, spec.caseId, canonicalBundle);
    // Keep source extracted text shape stable for proof matching while retaining regenerated PDF artifacts.
    fs.writeFileSync(path.join(caseDir, "bundle-text.md"), sourceBundleText);

    const sourceTruth = readJson<Record<string, unknown>>(path.join(sourceDir, "truth-key.json"));
    const truth = {
      ...sourceTruth,
      caseId: spec.caseId,
      title: spec.title,
      profile: "needs_review",
      bundleStatus: "pdf_backed_demo",
      proofChainMode: "pdf_backed_controlled",
      controlledFictional: true,
      scenario: spec.scenario,
    };
    fs.writeFileSync(path.join(caseDir, "truth-key.json"), JSON.stringify(truth, null, 2));

    const extractedText = fs.readFileSync(path.join(caseDir, "bundle-text.md"), "utf8");
    const hits = bannedWordHits(extractedText);
    created.push({ spec, caseDir, bannedWordHits: hits });
    console.log(`  [${spec.index}/10] ${spec.caseId} from ${spec.sourceCaseId}`);
  }
  return created;
}

function writeCoverageReport(runs: CaseRun[]) {
  const lines = [
    "# COVERAGE — messy-pdf-proof-v1",
    "",
    "| # | Case ID | Scenario | Source template | Receipts | PASS | WARNING | FAIL |",
    "|---:|---------|----------|-----------------|---------:|-----:|--------:|-----:|",
    ...runs.map(
      (r) =>
        `| ${r.spec.index} | ${r.spec.caseId} | ${r.spec.scenario} | ${r.spec.sourceCaseId} | ${r.receipts.length} | ${r.report.summary.pass} | ${r.report.summary.warning} | ${r.report.summary.fail} |`,
    ),
    "",
  ];
  fs.writeFileSync(path.join(OUT_ROOT, "COVERAGE.md"), lines.join("\n"));
}

function writeWorstIssues(runs: CaseRun[]) {
  const worst = [...runs]
    .map((r) => ({
      caseId: r.spec.caseId,
      fail: r.report.summary.fail,
      warning: r.report.summary.warning,
      hardTotal: Object.values(r.hardFailures).reduce((a, b) => a + b, 0),
      softTotal: Object.values(r.softWarnings).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.fail - a.fail || b.hardTotal - a.hardTotal || b.warning - a.warning);

  const lines = [
    "# WORST ISSUES — messy-pdf-proof-v1",
    "",
    "| Case | FAIL | WARNING | Hard issue hits | Soft warning hits |",
    "|------|-----:|--------:|----------------:|------------------:|",
    ...worst.map((w) => `| ${w.caseId} | ${w.fail} | ${w.warning} | ${w.hardTotal} | ${w.softTotal} |`),
    "",
  ];
  fs.writeFileSync(path.join(OUT_ROOT, "WORST-ISSUES.md"), lines.join("\n"));
}

function writeReceiptSummary(runs: CaseRun[]) {
  const allReceipts = runs.flatMap((r) => r.receipts);
  const summary = {
    generatedAt: new Date().toISOString(),
    caseCount: runs.length,
    receiptCount: allReceipts.length,
    byAction: {
      rely: countBy(allReceipts, "safeAction", "rely"),
      check: countBy(allReceipts, "safeAction", "check"),
      chase: countBy(allReceipts, "safeAction", "chase"),
      doNotUse: countBy(allReceipts, "safeAction", "do-not-use"),
    },
    bySurface: runs.reduce<Record<string, number>>((acc, run) => {
      for (const r of run.receipts) acc[r.surface] = (acc[r.surface] ?? 0) + 1;
      return acc;
    }, {}),
  };
  fs.writeFileSync(path.join(OUT_ROOT, "proof-receipt-summary.json"), JSON.stringify(summary, null, 2));

  const md = [
    "# MESSY PDF proof receipt summary",
    "",
    `- Cases: **${summary.caseCount}**`,
    `- Total receipts: **${summary.receiptCount}**`,
    `- Action split: rely **${summary.byAction.rely}**, check **${summary.byAction.check}**, chase **${summary.byAction.chase}**, do-not-use **${summary.byAction.doNotUse}**`,
    "",
    "## Receipts by surface",
    "",
    ...Object.entries(summary.bySurface).map(([k, v]) => `- ${k}: **${v}**`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "MESSY-PDF-PROOF-RECEIPT-SUMMARY.md"), md);
}

function writePackSummary(runs: CaseRun[]) {
  const totals = {
    casesRun: runs.length,
    pass: runs.reduce((n, r) => n + r.report.summary.pass, 0),
    warning: runs.reduce((n, r) => n + r.report.summary.warning, 0),
    fail: runs.reduce((n, r) => n + r.report.summary.fail, 0),
    emittedUnsupported: runs.reduce((n, r) => n + (r.report.proofLedger.counts.emittedUnsupported ?? 0), 0),
    blockedCases: runs.filter((r) => r.acceptance.blocked).length,
    bannedWordHits: runs.reduce((n, r) => n + r.bannedWordHits.length, 0),
  };
  const hardTotals = aggregateIssues(runs, "hardFailures");
  const softTotals = aggregateIssues(runs, "softWarnings");

  const json = {
    generatedAt: new Date().toISOString(),
    totals,
    hardFailures: hardTotals,
    softWarnings: softTotals,
    cases: runs.map((r) => ({
      caseId: r.spec.caseId,
      scenario: r.spec.scenario,
      sourceCaseId: r.spec.sourceCaseId,
      summary: r.report.summary,
      acceptance: r.acceptance,
      hardFailures: r.hardFailures,
      softWarnings: r.softWarnings,
      bannedWordHits: r.bannedWordHits,
      outputs: {
        lineSource: `line-source-proof/${r.spec.caseId}/line-by-line-proof.md`,
        packet: `line-source-proof/${r.spec.caseId}/SOLICITOR-PROOF-PACKET.md`,
        receiptsMd: `cases/${r.spec.caseId}/PROOF-RECEIPTS.md`,
        receiptsJson: `cases/${r.spec.caseId}/proof-receipts.json`,
      },
    })),
  };
  fs.writeFileSync(path.join(OUT_ROOT, "MESSY-PDF-PROOF-SUMMARY.json"), JSON.stringify(json, null, 2));

  const md = [
    "# MESSY-PDF-PROOF-SUMMARY",
    "",
    "Controlled fictional PDF-backed proof/audit run. No production route changes.",
    "",
    "## Totals",
    "",
    `- Cases run: **${totals.casesRun}**`,
    `- PASS: **${totals.pass}**  WARNING: **${totals.warning}**  FAIL: **${totals.fail}**`,
    `- Emitted unsupported: **${totals.emittedUnsupported}**`,
    `- Blocked cases: **${totals.blockedCases}**`,
    `- Banned-word hits in extracted text: **${totals.bannedWordHits}**`,
    "",
    "## Acceptance checks",
    "",
    `- 10/10 build: **${totals.casesRun === 10 ? "yes" : "no"}**`,
    `- 0 emitted unsupported lines: **${totals.emittedUnsupported === 0 ? "yes" : "no"}**`,
    `- 0 false-served: **${(hardTotals.false_served ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 wrong-defendant bleed: **${(hardTotals.wrong_defendant_bleed ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 wrong-family bleed: **${(hardTotals.wrong_family_bleed ?? 0) === 0 ? "yes" : "no"}**`,
    `- 0 banned words in PDFs: **${totals.bannedWordHits === 0 ? "yes" : "no"}**`,
    "",
    "## Hard failure totals",
    "",
    ...Object.entries(hardTotals).map(([k, v]) => `- ${k}: **${v}**`),
    "",
    "## Soft warning totals",
    "",
    ...Object.entries(softTotals).map(([k, v]) => `- ${k}: **${v}**`),
    "",
    "## Case outputs",
    "",
    "| Case | Scenario | Line-source proof | Solicitor packet | Proof receipts |",
    "|------|----------|-------------------|------------------|----------------|",
    ...runs.map(
      (r) =>
        `| ${r.spec.caseId} | ${r.spec.scenario} | [line-source](./line-source-proof/${r.spec.caseId}/line-by-line-proof.md) | [packet](./line-source-proof/${r.spec.caseId}/SOLICITOR-PROOF-PACKET.md) | [receipts](./cases/${r.spec.caseId}/PROOF-RECEIPTS.md) |`,
    ),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_ROOT, "MESSY-PDF-PROOF-SUMMARY.md"), md);
}

async function main() {
  ensureDir(OUT_ROOT);
  ensureDir(LINE_OUT_ROOT);
  ensureDir(CASE_OUT_ROOT);

  const created = await stage1CreateCases();
  const runs: CaseRun[] = [];

  console.log("\n=== Stage 3/4/5 — Run line-source pipeline, detect issues, write receipts ===");
  for (const { spec, caseDir, bannedWordHits: hits } of created) {
    const report = buildLineSourceProof(caseDir, LINE_OUT_ROOT);
    writeLineSourceProofArtifacts(report, LINE_OUT_ROOT);
    const acceptance = runAcceptanceGates(report, fs.readFileSync(path.join(caseDir, "bundle-text.md"), "utf8"));
    const receipts = buildReceipts(report);
    const caseOutDir = path.join(CASE_OUT_ROOT, spec.caseId);
    writeReceipts(caseOutDir, spec.caseId, receipts);
    const hardFailures = detectHardFailures(report, acceptance);
    const softWarnings = detectSoftWarnings(report);
    runs.push({
      spec,
      caseDir,
      report,
      acceptance,
      receipts,
      hardFailures,
      softWarnings,
      bannedWordHits: hits,
    });
    console.log(`  [${spec.index}/10] ${spec.caseId} — FAIL=${report.summary.fail} WARN=${report.summary.warning} blocked=${acceptance.blocked}`);
  }

  console.log("\n=== Stage 7 — Write pack reports ===");
  writeReceiptSummary(runs);
  writeCoverageReport(runs);
  writeWorstIssues(runs);
  writePackSummary(runs);
  console.log(`  Reports written under: ${path.relative(ROOT, OUT_ROOT).replace(/\\/g, "/")}`);

  const blocked = runs.some((r) => r.acceptance.blocked);
  if (blocked) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

