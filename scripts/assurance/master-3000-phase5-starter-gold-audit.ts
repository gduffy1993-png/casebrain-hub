import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  clusterFailures,
  createAuditResult,
  validateControlCoverageMap,
  validateHoldoutManifest,
  validateStarterGoldManifest,
  type AuditResultEnvelope,
  type ControlCoverageMap,
  type ControlCoverageMapRow,
  type StarterGoldMatter,
} from "../../lib/eval/master3000-quality";

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase5-starter-gold-audit",
);
const CASE_ROOT = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");
const REAL_PDF_MEMBERSHIP = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "real-pdf-live-pilot-v1",
  "ordered-membership-20.json",
);
const CONTROL_MAP_PATH = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "real-pdf-live-pilot-v1",
  "priority-control-map-361.json",
);

type TruthKey = {
  caseId: string;
  title?: string;
  offenceFamily?: string;
  profile?: string;
  bundleStatus?: string;
  evidenceItems?: {
    evidence_item?: string;
    correct_evidence_state?: string;
    chase_needed?: boolean;
    safe_to_rely_on?: boolean;
  }[];
  expectedChaseItems?: string[];
  expectedSendability?: string;
  blockingFailPatterns?: string[];
};

type CasebrainOutput = {
  caseId?: string;
  evidenceStates?: { label?: string; baseStatus?: string; inferredSourceState?: string; evidenceAnchor?: string | null }[];
  fiveAnswersEvidenceRows?: { label?: string; existence?: string; reliability?: string; note?: string }[];
  warningsAndGaps?: {
    doNotOverstate?: string[];
    hardRules?: string[];
    chaseItems?: { label?: string; copySuggestion?: string; sendabilityLabel?: string }[];
  };
  courtNote?: { text?: string; sendabilityLabel?: string; canCopy?: boolean };
  truthKeyComparison?: { truthItem?: string; truthState?: string; casebrainLabel?: string | null; casebrainState?: string }[];
};

function rel(absOrRel: string): string {
  const absolute = path.isAbsolute(absOrRel) ? absOrRel : path.join(ROOT, absOrRel);
  return path.relative(ROOT, absolute).replaceAll(path.sep, "/");
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

function sha256Buffer(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function sha256File(filePath: string): string {
  return sha256Buffer(readFileSync(filePath));
}

function bytes(filePath: string): number {
  return statSync(filePath).size;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJson(name: string, value: unknown): string {
  mkdirSync(OUT_ROOT, { recursive: true });
  const filePath = path.join(OUT_ROOT, name);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function writeText(name: string, value: string): string {
  mkdirSync(OUT_ROOT, { recursive: true });
  const filePath = path.join(OUT_ROOT, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

function norm(value: string | undefined | null): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looseIncludes(a: string, b: string): boolean {
  const left = norm(a);
  const right = norm(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function familyFromLabel(label: string): string {
  const n = norm(label);
  if (/\bcctv\b/.test(n)) return "cctv";
  if (/\binterview|transcript\b/.test(n)) return "interview";
  if (/\bcustody|pace\b/.test(n)) return "custody";
  if (/\bmessage|screenshot\b/.test(n)) return "message";
  if (/\bmedical|injury|hospital|expert|examiner|collision report|document examiner\b/.test(n)) return "medical_expert";
  if (/\blab|analysis|forensic\b/.test(n)) return "lab";
  if (/\bsearch\b/.test(n)) return "search";
  if (/\bparticipant|timeline\b/.test(n)) return "timeline";
  if (/\bid procedure|identification\b/.test(n)) return "identification";
  if (/\bprovenance|continuity\b/.test(n)) return "provenance_continuity";
  if (/\border\b/.test(n)) return "order";
  if (/\bfull\b/.test(n) && /\bwindow|master|record|transcript|download|export\b/.test(n)) return "completeness";
  if (/\bmg6|unused|schedule\b/.test(n)) return "mg6";
  if (/\bmg5|case summary\b/.test(n)) return "mg5";
  if (/\bmg11|witness statement\b/.test(n)) return "mg11";
  if (/\bcharge|offence\b/.test(n)) return "charge";
  if (/\bphone|download|device|subscriber|metadata\b/.test(n)) return "phone";
  if (/\bbwv|body worn\b/.test(n)) return "bwv";
  if (/\bmedical|injury|hospital\b/.test(n)) return "medical";
  if (/\b999|cad\b/.test(n)) return "999";
  if (/\bretraction|further statement\b/.test(n)) return "retraction";
  return n.split(" ")[0] || "unknown";
}

function isGenericMg6Clarification(label: string): boolean {
  return /\bMG6\s*\/\s*unused schedule clarification\b/i.test(label);
}

function expectedChaseFound(expected: string, chaseLabels: string[]): boolean {
  const expectedFamily = familyFromLabel(expected);
  return chaseLabels.some((label) => {
    if (looseIncludes(label, expected)) return true;
    const labelFamily = familyFromLabel(label);
    if (expectedFamily === "bwv" && labelFamily === "bwv") return true;
    if (expectedFamily === "custody" && labelFamily === "custody") return true;
    if (expectedFamily === "cctv" && labelFamily === "cctv") return true;
    if (expectedFamily === "interview" && labelFamily === "interview") return true;
    if (expectedFamily === "phone" && labelFamily === "phone") return true;
    if (expectedFamily === "medical_expert" && labelFamily === "medical_expert") return true;
    if (expectedFamily === "provenance_continuity" && labelFamily === "provenance_continuity") return true;
    return false;
  });
}

function strataForTruth(truth: TruthKey, bundleText: string): string[] {
  const items = truth.evidenceItems ?? [];
  const expected = truth.expectedChaseItems ?? [];
  const text = norm(bundleText);
  const itemFamilies = [...new Set(items.map((item) => familyFromLabel(item.evidence_item ?? "")))].filter(Boolean);
  const states = [...new Set(items.map((item) => item.correct_evidence_state ?? "unknown"))].filter(Boolean);
  const strata = [
    `family:${truth.offenceFamily || "unknown"}`,
    `profile:${truth.profile || "unknown"}`,
    `bundle:${truth.bundleStatus || "unknown"}`,
    `items:${items.length}`,
    `expectedChases:${expected.length}`,
    ...itemFamilies.map((family) => `evidence:${family}`),
    ...states.map((state) => `state:${state}`),
  ];
  if (/\bhearing date\b|\bptph\b|\bfirst appearance\b|\bsingle justice\b/.test(text)) strata.push("timeline:hearing");
  if (/\bcctv\b/.test(text)) strata.push("modality:cctv");
  if (/\binterview\b|\btranscript\b/.test(text)) strata.push("modality:interview");
  if (/\bphone|download|metadata\b/.test(text)) strata.push("modality:phone");
  if (/\bbwv|body worn\b/.test(text)) strata.push("modality:bwv");
  return [...new Set(strata)].sort();
}

function buildMatter(caseDir: string): StarterGoldMatter | null {
  const truthPath = path.join(caseDir, "truth-key.json");
  const sourcePath = path.join(caseDir, "bundle-text.md");
  const outputPath = path.join(caseDir, "casebrain-output.json");
  if (!existsSync(truthPath) || !existsSync(sourcePath) || !existsSync(outputPath)) return null;
  const truth = readJson<TruthKey>(truthPath);
  const sourceText = readFileSync(sourcePath, "utf8");
  return {
    caseId: truth.caseId || path.basename(caseDir),
    title: truth.title || truth.caseId || path.basename(caseDir),
    offenceFamily: truth.offenceFamily || "unknown",
    profile: truth.profile || "unknown",
    sourcePath: rel(sourcePath),
    truthKeyPath: rel(truthPath),
    outputPath: rel(outputPath),
    sourceSha256: sha256File(sourcePath),
    truthKeySha256: sha256File(truthPath),
    outputSha256: sha256File(outputPath),
    truthSourceType: "independent_truth_key",
    independentlyGrounded: true,
    strata: strataForTruth(truth, sourceText),
    evidenceItemCount: truth.evidenceItems?.length ?? 0,
    expectedChaseCount: truth.expectedChaseItems?.length ?? 0,
  };
}

function selectStratified(candidates: StarterGoldMatter[], target: number, exclude = new Set<string>()): StarterGoldMatter[] {
  const selected: StarterGoldMatter[] = [];
  const used = new Set<string>(exclude);
  const byFamily = new Map<string, StarterGoldMatter[]>();
  for (const matter of candidates) {
    if (used.has(matter.caseId)) continue;
    const family = matter.offenceFamily || "unknown";
    byFamily.set(family, [...(byFamily.get(family) ?? []), matter]);
  }
  for (const family of [...byFamily.keys()].sort()) {
    if (selected.length >= target) break;
    const next = byFamily.get(family)?.[0];
    if (next && !used.has(next.caseId)) {
      selected.push(next);
      used.add(next.caseId);
    }
  }
  const score = (matter: StarterGoldMatter): number =>
    matter.strata.length * 10 + matter.evidenceItemCount * 3 + matter.expectedChaseCount * 7 + matter.sourceSha256.charCodeAt(0);
  for (const matter of [...candidates].sort((a, b) => score(b) - score(a) || a.caseId.localeCompare(b.caseId))) {
    if (selected.length >= target) break;
    if (used.has(matter.caseId)) continue;
    selected.push(matter);
    used.add(matter.caseId);
  }
  return selected.sort((a, b) => a.caseId.localeCompare(b.caseId));
}

function visibleOutput(output: CasebrainOutput): string {
  return [
    ...(output.evidenceStates ?? []).flatMap((row) => [row.label, row.baseStatus, row.inferredSourceState, row.evidenceAnchor ?? ""]),
    ...(output.fiveAnswersEvidenceRows ?? []).flatMap((row) => [row.label, row.existence, row.reliability, row.note]),
    ...(output.warningsAndGaps?.doNotOverstate ?? []),
    ...(output.warningsAndGaps?.hardRules ?? []),
    ...(output.warningsAndGaps?.chaseItems ?? []).flatMap((item) => [
      item.label,
      item.copySuggestion,
      item.sendabilityLabel,
    ]),
    output.courtNote?.text,
    output.courtNote?.sendabilityLabel,
  ]
    .filter(Boolean)
    .join("\n");
}

function ordinaryAssertionOutput(output: CasebrainOutput): string {
  const lines = [
    ...(output.warningsAndGaps?.chaseItems ?? []).flatMap((item) => [
      item.label,
      item.copySuggestion,
      item.sendabilityLabel,
    ]),
    output.courtNote?.text,
    output.courtNote?.sendabilityLabel,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(?:do not|must not say|not safely confirmed|solicitor review|required|confirm before)/i.test(line))
    .filter((line) => !/\bDo not state\b|\bMust not say\b|\bshould not be treated as\b/i.test(line));
  return lines.join("\n");
}

function evaluateMatter(matter: StarterGoldMatter, runId: string, commit: string): AuditResultEnvelope[] {
  const truth = readJson<TruthKey>(path.join(ROOT, matter.truthKeyPath));
  const output = readJson<CasebrainOutput>(path.join(ROOT, matter.outputPath));
  const source = readFileSync(path.join(ROOT, matter.sourcePath), "utf8");
  const results: AuditResultEnvelope[] = [];
  const chaseLabels = output.warningsAndGaps?.chaseItems?.map((item) => item.label ?? "") ?? [];
  const chaseText = output.warningsAndGaps?.chaseItems?.map((item) => `${item.label ?? ""}\n${item.copySuggestion ?? ""}`).join("\n") ?? "";
  const visible = visibleOutput(output);
  const ordinaryAssertions = ordinaryAssertionOutput(output);
  const expectedChases = truth.expectedChaseItems ?? [];
  const truthItems = truth.evidenceItems ?? [];

  for (const expected of expectedChases) {
    const found = expectedChaseFound(expected, chaseLabels);
    results.push(
      createAuditResult({
        runId,
        commit,
        caseId: matter.caseId,
        controlId: "MAA-CHASE-QUALITY",
        invariantId: "CB-GOLD-EXPECTED-CHASE-PRESENT",
        failureClass: "extraction_failure",
        severity: "P1",
        evidenceFamily: familyFromLabel(expected),
        surface: "cps_chase",
        sourceReference: { path: matter.truthKeyPath, field: "expectedChaseItems" },
        expected: `Expected chase item should be visible: ${expected}`,
        actual: found ? "Expected chase found." : `Expected chase missing from output labels: ${chaseLabels.join("; ")}`,
        rootCauseCluster: found ? "expected_chase_present" : "missing_expected_chase",
        disposition: found ? "pass" : "candidate_failure",
        coverageStatus: "evaluated",
      }),
    );
  }

  for (const item of truthItems) {
    if (!item.evidence_item) continue;
    const family = familyFromLabel(item.evidence_item);
    const state = norm(item.correct_evidence_state);
    const chased = chaseLabels.some((label) => {
      if (family === "mg6" && isGenericMg6Clarification(label)) return false;
      return looseIncludes(label, item.evidence_item ?? "") || familyFromLabel(label) === family;
    });
    const shouldNotChase = item.chase_needed === false && item.safe_to_rely_on === true && /served/.test(state);
    if (shouldNotChase) {
      results.push(
        createAuditResult({
          runId,
          commit,
          caseId: matter.caseId,
          controlId: "MAA-EVIDENCE-STATE",
          invariantId: "CB-GOLD-SERVED-ITEM-NOT-CHASED",
          failureClass: "evidence_state_failure",
          severity: "P1",
          evidenceFamily: family,
          surface: "canonical_state",
          sourceReference: { path: matter.truthKeyPath, field: `evidenceItems.${item.evidence_item}` },
          expected: `${item.evidence_item} is served/safe and should not become an active chase.`,
          actual: chased ? `${item.evidence_item} family appears in chase labels: ${chaseLabels.join("; ")}` : "No active chase for served item.",
          rootCauseCluster: chased ? `served_${family}_became_chase` : "served_item_not_chased",
          disposition: chased ? "candidate_failure" : "pass",
          coverageStatus: "evaluated",
        }),
      );
    }
  }

  const unsupportedFamilies = ["phone", "bwv", "medical_expert", "999", "retraction"];
  for (const family of unsupportedFamilies) {
    const sourcePattern =
      family === "999"
        ? "\\b(999|cad)\\b"
        : family === "medical_expert"
          ? "\\b(medical|injury|hospital|expert|examiner|collision report|document examiner)\\b"
          : `\\b${family}\\b`;
    const sourceSupports = new RegExp(sourcePattern, "i").test(source);
    const expectedSupports = expectedChases.some((item) => familyFromLabel(item) === family);
    const visibleChase = chaseLabels.some((label) => familyFromLabel(label) === family);
    if (!sourceSupports && !expectedSupports) {
      results.push(
        createAuditResult({
          runId,
          commit,
          caseId: matter.caseId,
          controlId: "MAA-HALLUCINATION",
          invariantId: "CB-HIST-UNSUPPORTED-SPECIALTY-MATERIAL-NOT-GAP",
          failureClass: "unsupported_promotion_failure",
          severity: "P1",
          evidenceFamily: family,
          surface: "cps_chase",
          sourceReference: { path: matter.sourcePath, limitation: `No source support for ${family} in starter Gold source text.` },
          expected: `Unsupported ${family} material must not become an asserted missing/outstanding chase.`,
          actual: visibleChase ? `${family} appeared in chase labels: ${chaseLabels.join("; ")}` : "Unsupported family did not become a chase.",
          rootCauseCluster: visibleChase ? `unsupported_${family}_promoted` : "unsupported_family_blocked",
          disposition: visibleChase ? "candidate_failure" : "pass",
          coverageStatus: "evaluated",
        }),
      );
    }
  }

  const blockingPattern = truth.blockingFailPatterns?.find((pattern) => new RegExp(pattern, "i").test(ordinaryAssertions));
  results.push(
    createAuditResult({
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-AUDIENCE-WORDING",
      invariantId: "CB-GOLD-BLOCKING-FAIL-PATTERNS-ABSENT",
      failureClass: "certainty_escalation_failure",
      severity: "P0",
      evidenceFamily: "global",
      surface: "client_summary",
      sourceReference: { path: matter.truthKeyPath, field: "blockingFailPatterns" },
      expected: "Blocking certainty phrases must be absent from solicitor/client visible output.",
      actual: blockingPattern ? `Blocking phrase visible as an assertion: ${blockingPattern}` : "No blocking phrase visible as an assertion.",
      rootCauseCluster: blockingPattern ? "unsafe_certainty_phrase_visible" : "blocking_phrases_absent",
      disposition: blockingPattern ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    }),
  );

  const duplicateOutstanding = /remains outstanding\W+remains outstanding|outstanding\W+outstanding/i.test(visible);
  results.push(
    createAuditResult({
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-OUTPUT-DESIGN",
      invariantId: "CB-HIST-NO-DUPLICATE-OUTSTANDING-WORDING",
      failureClass: "dedupe_alias_failure",
      severity: "P2",
      evidenceFamily: "wording",
      surface: "cps_chase",
      expected: "Disclosure wording should not duplicate the same outstanding phrase.",
      actual: duplicateOutstanding ? "Duplicate outstanding wording detected." : "No duplicate outstanding wording detected.",
      rootCauseCluster: duplicateOutstanding ? "duplicate_outstanding_wording" : "wording_dedupe_ok",
      disposition: duplicateOutstanding ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    }),
  );

  const internalLeak = /\b(?:[0-9]+k chars|source_badges|inferredSourceState|casebrain-output|taxonomy|requestId=|exp-[a-z0-9_-]+)\b/i.test(visible);
  results.push(
    createAuditResult({
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-SECURITY-PRIVACY",
      invariantId: "CB-HIST-NO-INTERNAL-TELEMETRY-VISIBLE",
      failureClass: "solicitor_visible_internal_language_failure",
      severity: "P1",
      evidenceFamily: "visible_language",
      surface: "overview",
      expected: "Solicitor-visible output must not expose internal telemetry, schema names or fixture IDs.",
      actual: internalLeak ? "Internal language pattern detected in visible output." : "No internal language pattern detected.",
      rootCauseCluster: internalLeak ? "internal_language_visible" : "internal_language_blocked",
      disposition: internalLeak ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    }),
  );

  const acronymLeak = /\b(?:cCTV|mG6|mG5|bWV|cAD)\b/.test(chaseText);
  results.push(
    createAuditResult({
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-ACTION-QUALITY",
      invariantId: "CB-GOLD-PROTECTED-ACRONYM-CASING",
      failureClass: "solicitor_visible_internal_language_failure",
      severity: "P2",
      evidenceFamily: "visible_language",
      surface: "cps_chase",
      expected: "Protected legal/document acronyms should preserve professional casing.",
      actual: acronymLeak ? "Malformed protected acronym casing detected in chase copy." : "Protected acronym casing clean.",
      rootCauseCluster: acronymLeak ? "protected_acronym_casing" : "protected_acronym_casing_clean",
      disposition: acronymLeak ? "candidate_failure" : "pass",
      coverageStatus: "evaluated",
    }),
  );

  const chargePresent = /statement of offence|particulars of offence|charge/i.test(source);
  const outputChargeAbsent = /charge(?:\s+sheet)?[^.\n]{0,80}(?:not on papers|not established|absent)/i.test(visible);
  if (chargePresent) {
    results.push(
      createAuditResult({
        runId,
        commit,
        caseId: matter.caseId,
        controlId: "MAA-CHARGE-MODEL",
        invariantId: "CB-HIST-CHARGE-PRESENT-NOT-ABSENT",
        failureClass: "extraction_failure",
        severity: "P0",
        evidenceFamily: "charge",
        surface: "canonical_state",
        sourceReference: { path: matter.sourcePath, field: "charge/source text" },
        expected: "Formal charge present in source must not render as absent.",
        actual: outputChargeAbsent ? "Output suggests charge absent/not established despite source charge." : "No charge-absent contradiction detected.",
        rootCauseCluster: outputChargeAbsent ? "charge_present_rendered_absent" : "charge_present_ok",
        disposition: outputChargeAbsent ? "candidate_failure" : "pass",
        coverageStatus: "evaluated",
      }),
    );
  }

  const sendability = norm(output.courtNote?.sendabilityLabel || output.warningsAndGaps?.chaseItems?.[0]?.sendabilityLabel);
  results.push(
    createAuditResult({
      runId,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-HUMAN-SUPERVISION",
      invariantId: "CB-GOLD-SENDABILITY-REMAINS-REVIEWED",
      failureClass: "certainty_escalation_failure",
      severity: "P1",
      evidenceFamily: "sendability",
      surface: "copy",
      sourceReference: { path: matter.truthKeyPath, field: "expectedSendability" },
      expected: `Expected sendability remains provisional/reviewed: ${truth.expectedSendability ?? "unspecified"}`,
      actual: /review|required|provisional|check/.test(sendability) ? "Review/provisional sendability retained." : `Sendability too firm: ${sendability || "blank"}`,
      rootCauseCluster: /review|required|provisional|check/.test(sendability) ? "sendability_guard_ok" : "sendability_too_firm",
      disposition: /review|required|provisional|check/.test(sendability) ? "pass" : "candidate_failure",
      coverageStatus: "evaluated",
    }),
  );

  return results;
}

function buildCoverageMap(commit: string, results: AuditResultEnvelope[]): ControlCoverageMap {
  const registry = readJson<{ controls: Record<string, unknown>[] }>(CONTROL_MAP_PATH).controls;
  const byControl = new Map<string, AuditResultEnvelope[]>();
  for (const result of results) byControl.set(result.controlId, [...(byControl.get(result.controlId) ?? []), result]);
  const rows = registry.map((entry) => {
    const control = entry as {
      controlId: string;
      family?: string;
      familyCode?: string;
      subfamily?: string;
      implementationStatus?: string;
      currentlyRunnable?: boolean;
    };
    const controlResults = byControl.get(control.controlId) ?? [];
    const row: ControlCoverageMapRow = {
      controlId: control.controlId,
      family: control.family,
      familyCode: control.familyCode,
      subfamily: control.subfamily,
      registryImplementationStatus: control.implementationStatus,
      registryCurrentlyRunnable: control.currentlyRunnable,
      starterGoldStatus: controlResults.length ? "evaluated" : "not_exercised",
      starterGoldCasesEvaluated: new Set(controlResults.map((result) => result.caseId)).size,
      starterGoldCandidateFailures: controlResults.filter((result) => result.disposition === "candidate_failure").length,
      starterGoldConfirmedFailures: controlResults.filter((result) => result.disposition === "confirmed_failure").length,
      limitation: controlResults.length
        ? "Starter Gold truth-key audit exercised this control family on stored output snapshots; live product re-run remains separate."
        : "Not exercised by starter Gold checkpoint; retained in 361 denominator.",
    };
    return row;
  });
  const summary = rows.reduce(
    (acc, row) => {
      if (row.starterGoldStatus === "evaluated") acc.evaluated += 1;
      else if (row.starterGoldStatus === "unresolved") acc.unresolved += 1;
      else if (row.starterGoldStatus === "unavailable") acc.unavailable += 1;
      else if (row.starterGoldStatus === "not_in_registry") acc.notInRegistry += 1;
      else acc.notExercised += 1;
      return acc;
    },
    { evaluated: 0, unresolved: 0, unavailable: 0, notExercised: 0, notInRegistry: 0 },
  );
  return {
    schemaVersion: "casebrain-master3000-361-control-coverage-map@1.0.0",
    generatedAt: GENERATED_AT,
    commit,
    totalControls: 361,
    rows,
    summary,
    nonClaims: {
      all361Exercised: false,
      starterGoldIsCorpusPass: false,
    },
  };
}

const commit = git(["rev-parse", "HEAD"]);
const caseDirs = readdirSync(CASE_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(CASE_ROOT, entry.name));
const candidates = caseDirs.map(buildMatter).filter((matter): matter is StarterGoldMatter => Boolean(matter));
const starterGold = selectStratified(candidates, 40);
const holdout = selectStratified(candidates, 80, new Set(starterGold.map((matter) => matter.caseId)));
const runId = `starter-gold-${GENERATED_AT.replace(/[:.]/g, "-")}`;
const results = starterGold.flatMap((matter) => evaluateMatter(matter, runId, commit));
const clusters = clusterFailures(results);
const p0p1Clusters = clusters.filter((cluster) => cluster.severity === "P0" || cluster.severity === "P1");

const realPdfRegister = existsSync(REAL_PDF_MEMBERSHIP)
  ? {
      schemaVersion: "casebrain-master3000-real-pdf-candidate-register@1.0.0",
      generatedAt: GENERATED_AT,
      source: rel(REAL_PDF_MEMBERSHIP),
      candidates: readJson<unknown[]>(REAL_PDF_MEMBERSHIP),
      goldStatus: "candidate_only_pending_independent_truth_labels",
      reason: "Real source PDFs are hash-stable, but this checkpoint does not treat CaseBrain output or pilot receipts as independent truth labels.",
    }
  : {
      schemaVersion: "casebrain-master3000-real-pdf-candidate-register@1.0.0",
      generatedAt: GENERATED_AT,
      source: rel(REAL_PDF_MEMBERSHIP),
      candidates: [],
      goldStatus: "unavailable",
      reason: "Real-PDF membership file not present.",
    };

const goldManifest = {
  schemaVersion: "casebrain-master3000-starter-gold-manifest@1.0.0" as const,
  generatedAt: GENERATED_AT,
  commit,
  targetRange: { min: 25 as const, max: 50 as const },
  sourceInventory: {
    corpusRoot: rel(CASE_ROOT),
    candidatesAvailable: candidates.length,
    selectionMethod:
      "One-per-offence-family first, then highest multi-axis score; current CaseBrain output forbidden as truth.",
  },
  matters: starterGold,
  nonClaims: {
    fullGoldComplete: false as const,
    holdoutAudited: false as const,
    casebrainOutputUsedAsTruth: false as const,
    full3000Run: false as const,
  },
};

const holdoutManifest = {
  schemaVersion: "casebrain-master3000-holdout-candidate-manifest@1.0.0" as const,
  generatedAt: GENERATED_AT,
  commit,
  sourceInventory: {
    corpusRoot: rel(CASE_ROOT),
    candidatesAvailable: candidates.length,
    selectionMethod: "Disjoint stratified holdout candidate set; not audited or tuned against in this checkpoint.",
  },
  matters: holdout,
  nonClaims: {
    audited: false as const,
    tunedAgainst: false as const,
    full3000Run: false as const,
  },
};

const coverageMap = buildCoverageMap(commit, results);
const starterIssues = validateStarterGoldManifest(goldManifest);
const holdoutIssues = validateHoldoutManifest(goldManifest, holdoutManifest);
const coverageIssues = validateControlCoverageMap(coverageMap);

const failuresBySeverity = results
  .filter((result) => result.disposition === "candidate_failure" || result.disposition === "confirmed_failure")
  .reduce<Record<string, number>>((acc, result) => {
    acc[result.severity] = (acc[result.severity] ?? 0) + 1;
    return acc;
  }, {});

const p0p1Investigation = p0p1Clusters.map((cluster) => ({
  ...cluster,
  representativeSourceInspection: cluster.representativeCaseIds.slice(0, 3).map((caseId) => {
    const matter = starterGold.find((entry) => entry.caseId === caseId);
    return matter
      ? {
          caseId,
          sourcePath: matter.sourcePath,
          truthKeyPath: matter.truthKeyPath,
          finding: "Representative source/truth path recorded for next shared-root investigation; no case-specific patch applied in this checkpoint.",
        }
      : { caseId, finding: "Representative case not found in starter manifest." };
  }),
  sharedFixDecision:
    "No automatic patch applied at this checkpoint. These are stored-output-vs-truth candidate clusters and must be checked against the current live shared builders before product mutation.",
}));

const auditorCorrectionsApplied = [
  {
    id: "AUDITOR-GUARDRAIL-TEXT-NOT-ASSERTION",
    class: "certainty_escalation_false_positive",
    summary:
      "Starter auditor now scans ordinary assertion surfaces for blocking phrases and does not treat 'Do not' / 'Must not say' guardrails as unsafe admissions.",
  },
  {
    id: "AUDITOR-MG6-CLARIFICATION-NOT-SERVED-MG6-CHASE",
    class: "evidence_state_false_positive",
    summary:
      "Generic MG6 / unused schedule clarification is no longer treated as an active chase for a served MG6 document.",
  },
  {
    id: "AUDITOR-EXPERT-REPORT-FAMILY-SYNONYMS",
    class: "unsupported_promotion_false_positive",
    summary:
      "Medical/expert report labels now match collision expert and document examiner source/truth wording before unsupported-promotion findings are emitted.",
  },
];

const rootCauseRegister = {
  schemaVersion: "casebrain-master3000-starter-root-cause-register@1.0.0",
  generatedAt: GENERATED_AT,
  commit,
  candidateClusters: clusters.length,
  p0p1Clusters: p0p1Clusters.length,
  clusters,
  p0p1Investigation,
  auditorCorrectionsApplied,
  sharedFixesApplied: [],
  nonClaims: {
    productRootConfirmed: false,
    caseSpecificPatchesApplied: false,
    full3000Run: false,
  },
};

const stop = {
  schemaVersion: "master3000-phase5-starter-gold-stop@1.0.0",
  generatedAt: GENERATED_AT,
  status: "STARTER_GOLD_AUDIT_COMPLETE__FULL_3000_NOT_STARTED",
  commit,
  prStateAtStart: "PR #66 open; head/deploy confirmed before emit in operator log",
  starterGoldCount: starterGold.length,
  holdoutCandidateCount: holdout.length,
  auditedResultRows: results.length,
  candidateFailures: results.filter((result) => result.disposition === "candidate_failure").length,
  confirmedFailures: results.filter((result) => result.disposition === "confirmed_failure").length,
  failuresBySeverity,
  candidateClusters: {
    total: clusters.length,
    p0p1: p0p1Clusters.length,
  },
  p0p1SharedFixesApplied: auditorCorrectionsApplied,
  validationIssues: {
    starterGold: starterIssues,
    holdout: holdoutIssues,
    coverage: coverageIssues,
  },
  full3000RunStarted: false,
  stress500or1000Started: false,
  nextStep:
    "Review P0/P1 stored-output candidate clusters against current live shared builders; only patch confirmed live shared roots, then rerun starter Gold before any 500/1000/3000 stress.",
  nonClaims: {
    corpusPass: false,
    stage3000Completion: false,
    programmePass: false,
    solicitorApproval: false,
    all361ControlsExercised: false,
  },
};

const decisionCard = `# CaseBrain master 3,000 quality programme — Starter Gold checkpoint

Generated: ${GENERATED_AT}

## Verdict

**${stop.status}**

This checkpoint selected a real starter Gold batch from locally available independent truth keys, kept Holdout disjoint, produced the 361-control map, and audited only the starter Gold batch. It did **not** run the 500/1000/3000 stress set.

## Denominators

- Starter Gold: **${starterGold.length}** matters
- Holdout candidates: **${holdout.length}** matters, not audited
- Real-PDF candidates: **${Array.isArray((realPdfRegister as { candidates?: unknown[] }).candidates) ? (realPdfRegister as { candidates: unknown[] }).candidates.length : 0}**, candidate-only pending independent truth labels
- 361-control map: **${coverageMap.summary.evaluated} evaluated / ${coverageMap.summary.notExercised} not exercised**

## Starter audit result

- Audit rows: **${results.length}**
- Candidate failures: **${stop.candidateFailures}**
- Confirmed failures: **${stop.confirmedFailures}**
- Failure clusters: **${clusters.length}** total; **${p0p1Clusters.length}** P0/P1

## Root-cause discipline

No individual case patching was done. Auditor false-positive roots were corrected first; remaining P1 clusters are stored-output-vs-truth candidates until checked against the current live shared builders.

## Next

${stop.nextStep}
`;

const written: string[] = [];
written.push(writeJson("STARTER-GOLD-MANIFEST.json", goldManifest));
written.push(writeJson("HOLDOUT-CANDIDATE-MANIFEST.json", holdoutManifest));
written.push(writeJson("REAL-PDF-CANDIDATE-REGISTER.json", realPdfRegister));
written.push(writeJson("361-CONTROL-COVERAGE-MAP.json", coverageMap));
written.push(writeJson("STARTER-GOLD-AUDIT-RESULTS.json", results));
written.push(writeJson("FAILURE-CLUSTERS.json", clusters));
written.push(writeJson("ROOT-CAUSE-REGISTER.json", rootCauseRegister));
written.push(writeJson("VALIDATION-ISSUES.json", { starterGold: starterIssues, holdout: holdoutIssues, coverage: coverageIssues }));
written.push(writeText("DECISION-CARD.md", decisionCard));
written.push(writeJson("STOP-FOR-CODEX-REVIEW.json", stop));

const manifestFiles = [
  rel("lib/eval/master3000-quality/starter-gold.ts"),
  rel("lib/eval/master3000-quality/index.ts"),
  rel("scripts/master3000-starter-gold-audit.test.ts"),
  rel("scripts/assurance/master-3000-phase5-starter-gold-audit.ts"),
  ...written.map((file) => rel(file)),
].sort();

const manifestPath = writeJson("CHANGED-FILE-MANIFEST.json", {
  schemaVersion: "master3000-phase5-changed-file-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  selfHashStatus: "excluded_from_files_array_self_referential",
  files: manifestFiles.map((file) => ({
    path: file,
    sha256: sha256File(path.join(ROOT, file)),
    byteLength: bytes(path.join(ROOT, file)),
    classification: file.startsWith("lib/")
      ? "source"
      : file.startsWith("scripts/")
        ? "contract_or_emit_script"
        : "phase5_artifact",
  })),
});

const digestPath = writeJson("CHANGED-FILE-MANIFEST.DIGEST.json", {
  schemaVersion: "master3000-phase5-changed-file-manifest-digest@1.0.0",
  generatedAt: GENERATED_AT,
  manifestPath: rel(manifestPath),
  manifestSha256: sha256File(manifestPath),
  manifestByteLength: bytes(manifestPath),
});

console.log(
  JSON.stringify(
    {
      status: stop.status,
      outputRoot: rel(OUT_ROOT),
      starterGoldCount: starterGold.length,
      holdoutCandidateCount: holdout.length,
      auditedResultRows: results.length,
      candidateFailures: stop.candidateFailures,
      confirmedFailures: stop.confirmedFailures,
      clusters: stop.candidateClusters,
      validationIssues: stop.validationIssues,
      filesWritten: [...written.map((file) => rel(file)), rel(manifestPath), rel(digestPath)],
      full3000RunStarted: false,
    },
    null,
    2,
  ),
);
