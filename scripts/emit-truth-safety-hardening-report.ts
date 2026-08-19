#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const V212_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/realistic-child-v2.1.2";
const OUT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/truth-safety-hardening-v1";

function readJson<T = any>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function sha256File(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function lineCount(file: string): number {
  if (!fs.existsSync(file)) return 0;
  const text = fs.readFileSync(file, "utf8");
  if (!text.trim()) return 0;
  return text.split(/\r?\n/).filter(Boolean).length;
}

function readJsonl<T = any>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function maybeScratchSummary(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null;
  const data = readJson<any>(file);
  const count = (value: unknown): number => {
    if (Array.isArray(value)) return value.length;
    if (typeof value === "number") return value;
    return 0;
  };
  return {
    file,
    sha256: sha256File(file),
    sweptCases: data.sweptCases ?? count(data.cases),
    sweptPages: data.sweptPages ?? count(data.pages),
    discoveredUniqueCases: data.discoveredUniqueCases ?? null,
    pagesWithBadHits: count(data.pagesWithBadHits),
    badHitDetails: count(data.badHitDetails),
    horizontalOverflowPages: count(data.horizontalOverflowPages),
    tinyPages: count(data.tinyPages),
    unresolvedLoadingPages: count(data.unresolvedLoadingPages),
    signInPages: count(data.signInPages),
  };
}

fs.mkdirSync(OUT_ROOT, { recursive: true });

const membershipPath = path.join(V212_ROOT, "ordered-child-membership.json");
const stopPath = path.join(V212_ROOT, "STOP.json");
const decisionPath = path.join(V212_ROOT, "DECISION-CARD.json");
const controlReceiptsPath = path.join(V212_ROOT, "control-exercise-receipts.jsonl");
const outputHashesPath = path.join(V212_ROOT, "output-hashes.jsonl");
const sourcePacketHashesPath = path.join(V212_ROOT, "source-packet-hashes.jsonl");
const pdfRegisterPath = path.join(V212_ROOT, "pdf-subset-register.jsonl");
const candidateLedgerPath = path.join(V212_ROOT, "candidate-findings.jsonl");

const membership = readJson<any>(membershipPath);
const accepted = Array.isArray(membership.accepted) ? membership.accepted : [];
const stop = readJson<any>(stopPath);
const decision = readJson<any>(decisionPath);
const controlReceipts = readJsonl<any>(controlReceiptsPath);
const outputRows = readJsonl<any>(outputHashesPath);
const sourceRows = readJsonl<any>(sourcePacketHashesPath);
const pdfRows = readJsonl<any>(pdfRegisterPath);

const outputHashValues = new Set(outputRows.map((r) => r.outputSha256).filter(Boolean));
const sourceHashValues = new Set(sourceRows.map((r) => r.documentPackSha256).filter(Boolean));
const pdfRenderedRows = outputRows.filter((r) => r.pdf?.rendered);
const pdfOriginCounts = countBy(pdfRenderedRows, (r) => String(r.pdf?.byteOrigin ?? "unknown"));
const uniqueCaseControlPairs = new Set(controlReceipts.map((r) => `${r.caseId}::${r.controlId}`));
const uniqueControls = new Set(controlReceipts.map((r) => r.controlId));
const hitCount = controlReceipts.reduce((sum, row) => sum + (Number(row.hitCount) || 0), 0);

const scratch = [
  maybeScratchSummary("artifacts/tmp-live-final-six-tab-verification.json"),
  maybeScratchSummary("artifacts/tmp-live-final-shared-root-sweep-local.json"),
  maybeScratchSummary("artifacts/tmp-live-final-multicase-sweep-a.json"),
].filter(Boolean);

const report = {
  schemaVersion: "truth-safety-hardening-v1@1.0.0",
  generatedAt: new Date().toISOString(),
  baseline: {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    trackedDirty: git(["status", "--short", "--untracked-files=no"]) || "",
  },
  scope: {
    noMergeDeployPassClaim: true,
    corpusRerunPerformed: false,
    purpose:
      "Shared-root legal safety/UI consistency hardening over accepted evidence; not a new Stage-3000 completion claim.",
  },
  acceptedV212Evidence: {
    membershipPath,
    membershipSha256: sha256File(membershipPath),
    acceptedCount: accepted.length,
    semanticMembershipSha256: membership.semanticMembershipSha256,
    stopClassification: stop.schemaVersion,
    candidateLedgerBytes: fs.statSync(candidateLedgerPath).size,
    candidateLedgerLines: lineCount(candidateLedgerPath),
    genuineCandidateCountClaimed: decision.genuineCandidateCount,
    controlsEvaluatedOnAtLeastOneCase: decision.controlsEvaluatedOnAtLeastOneCase,
    registryDenominator: decision.controlReceiptAccounting?.registryDenominator,
    browser: stop.browser,
  },
  structuralReconciliation: {
    outputRows: outputRows.length,
    uniqueOutputHashes: outputHashValues.size,
    sourceRows: sourceRows.length,
    uniqueSourceHashes: sourceHashValues.size,
    sourceHashReuseIsReportedNotHidden: sourceHashValues.size !== sourceRows.length,
    pdfRegisterRows: pdfRows.length,
    pdfRenderedFromOutputRows: pdfRenderedRows.length,
    pdfOrigins: pdfOriginCounts,
  },
  controlReceiptReconciliation: {
    rows: controlReceipts.length,
    uniqueCaseControlPairs: uniqueCaseControlPairs.size,
    uniqueControls: uniqueControls.size,
    statusCounts: countBy(controlReceipts, (r) => String(r.status ?? "unknown")),
    namedControlExerciseStatusCounts: countBy(controlReceipts, (r) =>
      String(r.namedControlExerciseStatus ?? "unknown"),
    ),
    totalHitCount: hitCount,
  },
  newSharedRootFixes: [
    {
      root: "provisional_hearing_deadline_note_dropped_from_item_rows",
      classification: "evidence-safety",
      fix: "Disclosure chase items now carry hearingDeadlineNote when deadlineLabel is provisional.",
      invariant: "truth-safety-hardening-regression: no reliable hearing date => every chase item carries provisional note.",
    },
  ],
  preservedInvariants: [
    "unsupported phone/medical/BWV/999/retraction prompts cannot become Patel-style asserted chases",
    "CCTV chase cannot inherit phone/source-export provenance",
    "interview recording/transcript outstanding cannot be called served",
    "First Appearance source does not render PTPH workflow wording",
    "selected-case route must avoid old empty-hearings shell",
    "historic solicitor-visible internal wording classes remain banned in shared source files",
  ],
  liveSweepEvidence: scratch,
  stillOpenHonestLimitations: [
    "This pass did not rerun the full 3,000 materialisation.",
    "Authenticated browser remains not exercised in accepted V2.1.2 evidence.",
    "PDF denominator in accepted V2.1.2 remains 24/3000 and byteOrigin is source_pdf_copy, not genuine app-rendered PDF.",
    "Only 17/361 controls were exercised in accepted V2.1.2 evidence.",
    "Cursor UI mockup/redesign is intentionally separate and not assessed by this report.",
  ],
};

const jsonPath = path.join(OUT_ROOT, "DECISION-CARD.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

const md = [
  "# Truth/safety hardening v1",
  "",
  `Generated: ${report.generatedAt}`,
  `Branch: ${report.baseline.branch}`,
  `HEAD: ${report.baseline.head}`,
  "",
  "## Verdict",
  "",
  "Shared-root hardening was applied for provisional hearing deadline limitations. This is not a corpus PASS, Stage-3000 completion, programme PASS, merge, or deploy claim.",
  "",
  "## Accepted evidence checked",
  "",
  `- V2.1.2 accepted matters: ${report.acceptedV212Evidence.acceptedCount}`,
  `- Candidate ledger: ${report.acceptedV212Evidence.candidateLedgerLines} lines / ${report.acceptedV212Evidence.candidateLedgerBytes} bytes`,
  `- Controls exercised: ${report.acceptedV212Evidence.controlsEvaluatedOnAtLeastOneCase}/${report.acceptedV212Evidence.registryDenominator}`,
  `- Browser: ${report.acceptedV212Evidence.browser}`,
  `- PDF: ${report.structuralReconciliation.pdfRenderedFromOutputRows}/3000 rendered rows; origins ${JSON.stringify(report.structuralReconciliation.pdfOrigins)}`,
  "",
  "## Fixes",
  "",
  ...report.newSharedRootFixes.map(
    (f) => `- **${f.root}** (${f.classification}) — ${f.fix}`,
  ),
  "",
  "## Still open",
  "",
  ...report.stillOpenHonestLimitations.map((x) => `- ${x}`),
  "",
].join("\n");
fs.writeFileSync(path.join(OUT_ROOT, "DECISION-CARD.md"), `${md}\n`);

const manifest = {
  schemaVersion: "truth-safety-hardening-v1-manifest@1.0.0",
  generatedAt: report.generatedAt,
  files: ["DECISION-CARD.json", "DECISION-CARD.md"].map((name) => {
    const file = path.join(OUT_ROOT, name);
    const stat = fs.statSync(file);
    return {
      path: file.replace(/\\/g, "/"),
      sha256: sha256File(file),
      byteLength: stat.size,
      classification: "compact_review_artifact",
    };
  }),
};
fs.writeFileSync(path.join(OUT_ROOT, "CHANGED-FILE-MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote ${OUT_ROOT}`);
