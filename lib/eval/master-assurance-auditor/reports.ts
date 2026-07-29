/**
 * Review batch generator, report writers, matrices.
 */

import fs from "node:fs";
import path from "node:path";
import { templateHash } from "./hashes";
import type {
  ControlExerciseRecord,
  MasterAuditorCheckpoint,
  MasterAuditorFinding,
  SavedCaseMaterialisation,
} from "./types";

export type ReviewBatchItem = {
  textHash: string;
  templateHash: string;
  text: string;
  verdict: string;
  controlId: string;
  designFinding: boolean;
  occurrences: Array<{ caseId: string; surface: string; findingId: string }>;
  humanReviewDisposition: null;
  humanReviewer: null;
};

export function buildReviewBatches(
  findings: MasterAuditorFinding[],
  maxPerBatch = 50,
): { batches: ReviewBatchItem[][]; indexMarkdown: string } {
  const interesting = findings.filter(
    (f) => f.verdict === "defect" || f.verdict === "unresolved" || f.verdict === "containment",
  );
  const byExact = new Map<string, ReviewBatchItem>();
  for (const f of interesting) {
    const key = f.wordingHash;
    const existing = byExact.get(key);
    if (existing) {
      existing.occurrences.push({
        caseId: f.caseId,
        surface: f.surface,
        findingId: f.findingId,
      });
    } else {
      byExact.set(key, {
        textHash: f.wordingHash,
        templateHash: templateHash(f.exactWording),
        text: f.exactWording.slice(0, 2000),
        verdict: f.verdict,
        controlId: f.controlId,
        designFinding: f.designFinding,
        occurrences: [{ caseId: f.caseId, surface: f.surface, findingId: f.findingId }],
        humanReviewDisposition: null,
        humanReviewer: null,
      });
    }
  }
  const items = [...byExact.values()].sort((a, b) => b.occurrences.length - a.occurrences.length);
  const batches: ReviewBatchItem[][] = [];
  for (let i = 0; i < items.length; i += maxPerBatch) {
    batches.push(items.slice(i, i + maxPerBatch));
  }
  const indexMarkdown = [
    "# Master Assurance Auditor — review batches",
    "",
    `Unique exact strings for review: ${items.length}`,
    `Batches: ${batches.length} (max ${maxPerBatch}/batch)`,
    "",
    "Human disposition fields are blank until a person fills them.",
    "",
    ...batches.map((b, i) => `- batch-${String(i + 1).padStart(3, "0")}.json — ${b.length} unique strings`),
    "",
  ].join("\n");
  return { batches, indexMarkdown };
}

export function buildCrossExitMatrix(findings: MasterAuditorFinding[]): Record<string, number> {
  const matrix: Record<string, number> = {};
  for (const f of findings.filter((x) => x.controlId === "MAA-CROSS-EXIT" && x.verdict === "defect")) {
    for (const exit of f.affectedExits) {
      matrix[exit] = (matrix[exit] ?? 0) + 1;
    }
  }
  return matrix;
}

export function buildCrossSurfaceMatrix(findings: MasterAuditorFinding[]): Record<string, number> {
  const matrix: Record<string, number> = {};
  for (const f of findings.filter((x) => x.controlId === "MAA-CROSS-SURFACE")) {
    matrix[f.verdict] = (matrix[f.verdict] ?? 0) + 1;
  }
  return matrix;
}

export function buildRemediationGrouping(findings: MasterAuditorFinding[]): Array<{
  rootCauseFamily: string;
  count: number;
  suggestedRemediation: string;
  findingIds: string[];
}> {
  const map = new Map<string, { count: number; suggestedRemediation: string; findingIds: string[] }>();
  for (const f of findings.filter((x) => x.verdict === "defect" || x.verdict === "containment")) {
    const cur = map.get(f.rootCauseFamily) ?? {
      count: 0,
      suggestedRemediation: f.suggestedRemediation,
      findingIds: [],
    };
    cur.count += 1;
    cur.findingIds.push(f.findingId);
    map.set(f.rootCauseFamily, cur);
  }
  return [...map.entries()]
    .map(([rootCauseFamily, v]) => ({ rootCauseFamily, ...v }))
    .sort((a, b) => b.count - a.count);
}

export function summariseFindings(findings: MasterAuditorFinding[]) {
  const byVerdict = {
    pass: findings.filter((f) => f.verdict === "pass").length,
    defect: findings.filter((f) => f.verdict === "defect").length,
    containment: findings.filter((f) => f.verdict === "containment").length,
    unresolved: findings.filter((f) => f.verdict === "unresolved").length,
    not_exercised: findings.filter((f) => f.verdict === "not_exercised").length,
  };
  const designFindings = findings.filter((f) => f.designFinding).length;
  // Detector FPs are only counted when humans label humanReviewDisposition — never auto-invented.
  const detectorFalsePositives = findings.filter(
    (f) => f.humanReviewDisposition === "detector_false_positive",
  ).length;
  return { byVerdict, designFindings, detectorFalsePositives };
}

export function writeJsonl(filePath: string, rows: object[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
}

export function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

export function writeText(filePath: string, text: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text.endsWith("\n") ? text : text + "\n");
}

export function buildCoverageReport(controls: ControlExerciseRecord[]): string {
  const lines = [
    "# Control coverage / not-exercised",
    "",
    `| Control | Status | Applicable | Fully | Partial | NotEx | Pass | Defect | Unresolved | Containment | NotExFindings | Reason |`,
    `|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|`,
    ...controls.map(
      (c) =>
        `| ${c.controlId} | ${c.status} | ${c.casesApplicable} | ${c.casesFullyExercised} | ${c.casesPartiallyExercised} | ${c.casesNotExercised} | ${c.passCount} | ${c.defectCount} | ${c.unresolvedCount} | ${c.containmentCount} | ${c.notExercisedFindingCount} | ${c.notExercisedReason ?? ""} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

export function buildCalibrationMarkdown(input: {
  checkpoint: MasterAuditorCheckpoint;
  cases: SavedCaseMaterialisation[];
  findings: MasterAuditorFinding[];
  remediation: ReturnType<typeof buildRemediationGrouping>;
  fpFnNotes: string[];
}): string {
  const s = summariseFindings(input.findings);
  return [
    "# Master Assurance Auditor — 20-case calibration report",
    "",
    `Run: \`${input.checkpoint.runId}\``,
    `Stage completed: **${input.checkpoint.stageCompleted}**`,
    `Status: **${input.checkpoint.status}**`,
    `Programme PASS supported: **false**`,
    "",
    "## Case units (separate denominators)",
    "",
    `- Cases: ${input.cases.length}`,
    `- Surfaces (occurrence load): ${input.cases.reduce((n, c) => n + c.surfaces.length, 0)}`,
    `- Findings (occurrence): ${input.findings.length}`,
    `- Exact wording unique: ${new Set(input.findings.map((f) => f.wordingHash)).size}`,
    `- Template unique: ${new Set(input.findings.map((f) => templateHash(f.exactWording))).size}`,
    "",
    "## Verdicts",
    "",
    `- pass: ${s.byVerdict.pass}`,
    `- defect: ${s.byVerdict.defect}`,
    `- containment: ${s.byVerdict.containment}`,
    `- unresolved: ${s.byVerdict.unresolved}`,
    `- not_exercised: ${s.byVerdict.not_exercised}`,
    `- design findings (separate): ${s.designFindings}`,
    "",
    "## Genuine defects vs detector FP / unavailable",
    "",
    ...input.fpFnNotes.map((n) => `- ${n}`),
    "",
    "## Remediation grouping",
    "",
    ...input.remediation.slice(0, 20).map(
      (r) => `- **${r.rootCauseFamily}** ×${r.count} — ${r.suggestedRemediation}`,
    ),
    "",
    "## Next command",
    "",
    "```",
    input.checkpoint.nextCommand,
    "```",
    "",
    "Do not run 50/150/300/3000 until Codex review clears this checkpoint.",
    "",
  ].join("\n");
}

/** Authorised Stage-50 freeze hash (esa-stage50-sample-v1). */
export const AUTHORISED_STAGE50_FREEZE_HASH =
  "4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832";

export function buildStage50RunReport(input: {
  checkpoint: MasterAuditorCheckpoint;
  cases: SavedCaseMaterialisation[];
  findings: MasterAuditorFinding[];
  remediation: ReturnType<typeof buildRemediationGrouping>;
  freeze: Stage50SampleFreeze;
  freezeVerifyBefore: { ok: boolean; recomputedHash: string | null; failures: string[] };
  freezeVerifyAfter: { ok: boolean; recomputedHash: string | null; failures: string[] };
  hashCheck: { ok: boolean; failures: string[] };
  crashCount: number;
  corruptRecordCount: number;
  stage20Totals: Record<string, number> | null;
}): string {
  const s = summariseFindings(input.findings);
  const byLane = new Map<string, number>();
  const byFamily = new Map<string, number>();
  const byState = new Map<string, number>();
  const byComplexity = new Map<string, number>();
  const byRoot = new Map<string, number>();
  const strataByCase = new Map(
    input.freeze.membership.map((m) => [m.caseId, m.strata]),
  );

  for (const f of input.findings) {
    byLane.set(f.laneId, (byLane.get(f.laneId) ?? 0) + 1);
    byRoot.set(f.rootCauseFamily, (byRoot.get(f.rootCauseFamily) ?? 0) + 1);
    const strata = strataByCase.get(f.caseId);
    if (strata) {
      byFamily.set(
        strata.familyBucket,
        (byFamily.get(strata.familyBucket) ?? 0) + 1,
      );
      byComplexity.set(
        strata.complexityBand,
        (byComplexity.get(strata.complexityBand) ?? 0) + 1,
      );
      for (const st of strata.stateFlags) {
        byState.set(st, (byState.get(st) ?? 0) + 1);
      }
    }
  }

  const sharedRoot = [...byRoot.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1]);

  // Suspected detector FPs / safety-critical candidates — heuristic labels only,
  // not confirmed human dispositions (knowledge remains unavailable).
  const suspectedFp = input.findings.filter(
    (f) =>
      f.verdict === "pass" &&
      (/domain_equivalent|honest_sibling|distinct_unit/.test(f.code ?? "") ||
        /detector_fp|false positive/i.test(f.plainEnglish)),
  );
  const safetyCriticalCandidates = input.findings.filter(
    (f) =>
      (f.verdict === "defect" || f.verdict === "unresolved") &&
      (f.severity === "CRITICAL" ||
        /candidate_pending_source|incomplete_disclaimer|absolute_proof|hallucin/i.test(
          `${f.code ?? ""} ${f.rootCauseFamily}`,
        )),
  );

  const surfaces = input.cases.reduce((n, c) => n + c.surfaces.length, 0);
  const exactUnique = new Set(input.findings.map((f) => f.wordingHash)).size;
  const templateUnique = new Set(
    input.findings.map((f) => templateHash(f.exactWording)),
  ).size;
  const caseWithFindings = new Set(input.findings.map((f) => f.caseId)).size;
  const surfaceKeys = new Set(
    input.findings.map((f) => `${f.caseId}::${f.surface}`),
  ).size;

  const missingFieldsTotal = input.freeze.membership.reduce(
    (n, m) => n + (m.strata.missingFieldCount ?? 0),
    0,
  );

  return [
    "# Master Assurance Auditor — Stage-50 report",
    "",
    `Run: \`${input.checkpoint.runId}\``,
    `Policy: \`${input.freeze.policyVersion}\``,
    `Ordered membership hash: \`${input.freeze.orderedMembershipHash}\``,
    `Status: **${input.checkpoint.status}**`,
    `Programme PASS supported: **false**`,
    `allowedToProgress: **${input.checkpoint.gate.allowedToProgress}**`,
    "",
    "## Freeze / input hash validation",
    "",
    `- Before: ${input.freezeVerifyBefore.ok ? "OK" : "FAIL"} (recomputed=${input.freezeVerifyBefore.recomputedHash})`,
    ...input.freezeVerifyBefore.failures.map((f) => `  - before failure: ${f}`),
    `- After: ${input.freezeVerifyAfter.ok ? "OK" : "FAIL"} (recomputed=${input.freezeVerifyAfter.recomputedHash})`,
    ...input.freezeVerifyAfter.failures.map((f) => `  - after failure: ${f}`),
    `- Manifest/input hashes: ${input.hashCheck.ok ? "OK" : "FAIL"}`,
    ...input.hashCheck.failures.map((f) => `  - ${f}`),
    `- Crashes: ${input.crashCount}`,
    `- Corrupt records: ${input.corruptRecordCount}`,
    `- Missing-field occurrences (freeze strata): ${missingFieldsTotal}`,
    "",
    "## Verdicts (separate)",
    "",
    `- pass: ${s.byVerdict.pass}`,
    `- defect: ${s.byVerdict.defect}`,
    `- unresolved: ${s.byVerdict.unresolved}`,
    `- containment: ${s.byVerdict.containment}`,
    `- not_exercised: ${s.byVerdict.not_exercised}`,
    "",
    "## Denominators (separate)",
    "",
    `- Cases: ${input.cases.length}`,
    `- Surfaces: ${surfaces}`,
    `- Finding occurrences: ${input.findings.length}`,
    `- Exact-string unique: ${exactUnique}`,
    `- Template unique: ${templateUnique}`,
    `- Surfaces with findings: ${surfaceKeys}`,
    `- Cases with findings: ${caseWithFindings}`,
    "",
    "## Findings by lane",
    "",
    ...[...byLane.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Findings by offence-family bucket",
    "",
    ...[...byFamily.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Findings by evidence-state flag (case strata)",
    "",
    ...[...byState.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Findings by complexity",
    "",
    ...[...byComplexity.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Repeated shared-root families (≥3)",
    "",
    ...(sharedRoot.length
      ? sharedRoot.map(([k, v]) => `- **${k}** ×${v}`)
      : ["- none"]),
    "",
    "## Suspected detector false positives (not human-confirmed)",
    "",
    `- Count: ${suspectedFp.length}`,
    `- Note: humanConfirmationRate / detectorFalsePositiveRate remain unavailable until blinded dispositions are imported.`,
    "",
    "## Safety-critical candidates (not legal sign-off)",
    "",
    `- Count: ${safetyCriticalCandidates.length}`,
    `- knownSafetyCriticalFn: ${String(input.checkpoint.safetyFn.knownSafetyCriticalFn)} (${input.checkpoint.safetyFn.knowledgeState})`,
    ...safetyCriticalCandidates.slice(0, 30).map(
      (f) =>
        `- ${f.caseId} / ${f.controlId} / ${f.verdict} / ${f.code ?? "—"} — ${f.plainEnglish.slice(0, 120)}`,
    ),
    "",
    "## Exit applicability (ESA)",
    "",
    ...Object.entries(input.freeze.coverage.exitApplicability).map(
      ([e, v]) => `- ${e}: ${v.status} (${v.presentOnCases} cases)`,
    ),
    "",
    "## Control exercise",
    "",
    `- fully: ${input.checkpoint.totals.controlsFullyExercised}`,
    `- partial: ${input.checkpoint.totals.controlsPartiallyExercised}`,
    `- not_exercised: ${input.checkpoint.totals.controlsNotExercised}`,
    "",
    "## Stage-20 comparison",
    "",
    ...(input.stage20Totals
      ? [
          `| Metric | Stage 20 | Stage 50 |`,
          `|---|---:|---:|`,
          `| pass | ${input.stage20Totals.pass ?? "—"} | ${s.byVerdict.pass} |`,
          `| defect | ${input.stage20Totals.defect ?? "—"} | ${s.byVerdict.defect} |`,
          `| unresolved | ${input.stage20Totals.unresolved ?? "—"} | ${s.byVerdict.unresolved} |`,
          `| containment | ${input.stage20Totals.containment ?? "—"} | ${s.byVerdict.containment} |`,
          `| not_exercised | ${input.stage20Totals.not_exercised ?? "—"} | ${s.byVerdict.not_exercised} |`,
          `| findings | ${input.stage20Totals.findings ?? "—"} | ${input.findings.length} |`,
          `| cases | ${input.stage20Totals.cases ?? "—"} | ${input.cases.length} |`,
          "",
          "Note: stage 20 used gold-manual CASE-01..20; stage 50 uses frozen ESA sample — corpora differ; comparison is descriptive only.",
        ]
      : ["- Stage-20 totals unavailable"]),
    "",
    "## Remediation grouping (defects/containment only)",
    "",
    ...input.remediation
      .slice(0, 25)
      .map((r) => `- **${r.rootCauseFamily}** ×${r.count} — ${r.suggestedRemediation}`),
    "",
    "## Next command",
    "",
    "```",
    input.checkpoint.nextCommand,
    "```",
    "",
    "Do not start stage 150 / commit / push / merge / deploy / remediate / claim PASS.",
    "",
  ].join("\n");
}

// Avoid circular type import at runtime — structural freeze shape only.
type Stage50SampleFreeze = {
  policyVersion: string;
  orderedMembershipHash: string;
  membership: Array<{
    caseId: string;
    strata: {
      familyBucket: string;
      complexityBand: string;
      stateFlags: string[];
      missingFieldCount?: number;
    };
  }>;
  coverage: {
    exitApplicability: Record<
      string,
      { presentOnCases: number; status: string }
    >;
  };
};
