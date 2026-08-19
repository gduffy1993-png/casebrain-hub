import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type Json = Record<string, unknown>;

const ROOT = process.cwd();
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase0-phase1",
);

const GENERATED_AT = new Date().toISOString();

function rel(absOrRel: string): string {
  const absolute = path.isAbsolute(absOrRel) ? absOrRel : path.join(ROOT, absOrRel);
  return path.relative(ROOT, absolute).replaceAll(path.sep, "/");
}

function runGit(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch (error) {
    return `ERROR:${error instanceof Error ? error.message : String(error)}`;
  }
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function bytes(filePath: string): number {
  return statSync(filePath).size;
}

function readJsonMaybe(relativePath: string): Json | null {
  const absolute = path.join(ROOT, relativePath);
  if (!existsSync(absolute)) return null;
  try {
    return JSON.parse(readFileSync(absolute, "utf8"));
  } catch {
    return null;
  }
}

function readTextMaybe(relativePath: string, maxChars = 10_000): string | null {
  const absolute = path.join(ROOT, relativePath);
  if (!existsSync(absolute)) return null;
  return readFileSync(absolute, "utf8").slice(0, maxChars);
}

function walk(dir: string, out: string[] = []): string[] {
  const absolute = path.join(ROOT, dir);
  if (!existsSync(absolute)) return out;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = path.join(absolute, entry.name);
    const childRel = rel(child);
    if (
      childRel.includes("/node_modules/") ||
      childRel.includes("/.next/") ||
      childRel.includes("/.git/") ||
      childRel.includes("/rematerialised-outputs/") ||
      childRel.includes("/sources/") ||
      childRel.includes("/candidates/") ||
      childRel.includes("/receipts/cases/") ||
      childRel.includes("/realistic-child-v2.1.2-blind-input/") ||
      childRel.includes("/determinism-workdirs/")
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      walk(childRel, out);
    } else if (/\.(ts|tsx|js|mjs|json|md|txt)$/i.test(entry.name)) {
      out.push(childRel);
    }
  }
  return out;
}

const trackedFiles = new Set(runGit(["ls-files"]).split(/\r?\n/).filter(Boolean).map((p) => p.replaceAll("\\", "/")));
const statusLines = runGit(["status", "--short"]).split(/\r?\n/).filter(Boolean);
const untrackedFiles = new Set(
  statusLines
    .filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3).replaceAll("\\", "/")),
);

const scannedFiles = [
  ...walk("scripts"),
  ...walk("scripts/assurance"),
  ...walk("lib/eval"),
  ...walk("lib/criminal"),
  ...walk("components/criminal"),
  ...walk("artifacts/casebrain-qa/assurance/master-auditor-v2"),
].filter((value, index, all) => all.indexOf(value) === index);

const categories = [
  {
    id: "maa_v2_registry_and_stage_runs",
    title: "MAA V2 registry, controls and staged calibration artefacts",
    patterns: [/master-assurance-auditor\/v2/, /emit-maa-v2-/, /master-auditor-v2\/stage150/, /master-auditor-v2\/stage300/],
    reuse: "Reuse as control authority and historical denominator evidence. Do not replace with a fresh parallel truth system.",
    gap: "Needs a wrapper that reports exercised/not_exercised by taxonomy and severity across future corpus tiers.",
  },
  {
    id: "source_truth_and_regression_tests",
    title: "Source-truth guardians and live UI wording regressions",
    patterns: [/source-truth-guardian/, /truth-safety-hardening/, /live-ui-wording-regression/, /pilot-workflow-profile/, /chase-source-gate/, /bundle-truth-ledger/],
    reuse: "Reuse for high-value invariants: unsupported promotion, family firewall, provisional deadlines, selected-case route.",
    gap: "Needs a shared failure-result schema and severity classification so discoveries become comparable audit rows.",
  },
  {
    id: "stage3000_parallel_audit_controller",
    title: "Stage-3000 parallel audit/controller libraries",
    patterns: [/stage3000-parallel-audit/, /stage3000-parallel-controller/],
    reuse: "Reuse for sharding, blinding, receipts, hashes, checkpoints, root-cause dedupe and machine-readable audit runs.",
    gap: "Needs connection to the current product canonical-state invariants before broad 3,000 reruns.",
  },
  {
    id: "diverse_second_3000_v212",
    title: "Accepted V2.1.2 clean single-writer diverse-3000 evidence",
    patterns: [/stage3000-diverse-second/, /realistic-child-v2\.1\.2/, /v2\.1\.2/],
    reuse: "Reuse as accepted clean single-writer lineage and frozen evidence record.",
    gap: "Coverage limitation remains: 17/361 controls; browser not exercised; PDF lane not genuine output for all cases.",
  },
  {
    id: "real_pdf_live_pilot",
    title: "Real-PDF live pilot v1 and authenticated-preview QA lane",
    patterns: [/real-pdf-live-pilot/, /pilot-20/, /output-pdf-raster/, /canonical-live-surface-adapter/],
    reuse: "Reuse for real local production-builder path, 20 real PDFs, wording/raster checks, and entitlement/auth preview lessons.",
    gap: "Scale is limited: 20 matters; authenticated HTTP/browser remains not_exercised unless the user opens/authorises session.",
  },
  {
    id: "canonical_product_state_modules",
    title: "Canonical product state / criminal workflow modules",
    patterns: [/lib\/criminal\//, /components\/criminal\//, /disclosure-chase/, /court-today/, /solicitor-visible/, /bundle-material-normalizer/, /chase-source-gate/],
    reuse: "Reuse and harden as source of product truth; fixes should land here only when lineage proves product-root cause.",
    gap: "Needs explicit canonical-state audit model for evidence state, provenance family, stage, certainty ceiling and counters.",
  },
  {
    id: "corpus_and_gold_set_material",
    title: "Corpus, gold-set and historical audit materials",
    patterns: [/evidence-state-audit-local/, /solicitor-review-audit-pack/, /stage3000-existing-census/, /stage300-new-150-control-coverage/],
    reuse: "Reuse for stratification candidates and historical failure examples; do not treat generated CaseBrain output as ground truth.",
    gap: "Needs formal gold/holdout designation with independent truth provenance before claiming broad solicitor confidence.",
  },
  {
    id: "browser_and_rendered_ui",
    title: "Browser/rendered UI and screenshot-oriented tooling",
    patterns: [/tmp-browser/, /tmp-live/, /browser-workflow-report/, /ui-review/, /playwright/, /screenshot/, /raster/],
    reuse: "Reuse as provisional live/rendered evidence where sessions are available.",
    gap: "Browser lane is not a substitute for deterministic source-truth auditing and remains separate from corpus PASS.",
  },
];

function matchesCategory(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filePath));
}

const categorized = categories.map((category) => {
  const files = scannedFiles.filter((file) => matchesCategory(file, category.patterns));
  const tracked = files.filter((file) => trackedFiles.has(file));
  const untracked = files.filter((file) => untrackedFiles.has(file) || !trackedFiles.has(file));
  return {
    id: category.id,
    title: category.title,
    fileCount: files.length,
    trackedCount: tracked.length,
    untrackedOrScratchCount: untracked.length,
    representativePaths: files.slice(0, 75),
    reuseDecision: category.reuse,
    identifiedGap: category.gap,
  };
});

const baseline = {
  schemaVersion: "casebrain-master3000-phase0-baseline@1.0.0",
  generatedAt: GENERATED_AT,
  branch: runGit(["branch", "--show-current"]),
  head: runGit(["rev-parse", "HEAD"]),
  headShort: runGit(["rev-parse", "--short", "HEAD"]),
  headSubject: runGit(["log", "-1", "--pretty=%s"]),
  upstream: runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]),
  upstreamHead: runGit(["rev-parse", "@{u}"]),
  trackedDirtyCount: statusLines.filter((line) => !line.startsWith("?? ")).length,
  untrackedCount: statusLines.filter((line) => line.startsWith("?? ")).length,
  promptBaselineExpected: "c93f155f5c4c46d8375208bce93e45eb84e0ec13",
  promptBaselineMatches: runGit(["rev-parse", "HEAD"]) === "c93f155f5c4c46d8375208bce93e45eb84e0ec13",
  pr: {
    number: 66,
    branch: "programme/real-pdf-live-pilot-v1",
    latestKnownHeadAtPhaseStart: "c93f155f5c4c46d8375208bce93e45eb84e0ec13",
  },
  currentCoverageLimits: {
    acceptedV212ControlsExercised: "17/361",
    acceptedV212BrowserLane: "not_exercised",
    acceptedV212PdfLane: "24/3000 source_pdf_copy",
    freshFull3000RunAtPhaseStart: false,
    meaning: "Existing green checks are real but limited; they are not corpus/stage/programme PASS.",
  },
};

const v212Stop = readJsonMaybe(
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.2/STOP-FOR-CODEX-REVIEW.json",
);
const realPdfStop = readJsonMaybe(
  "artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/STOP-FOR-CODEX-REVIEW.json",
);
const realPdfControls = readJsonMaybe(
  "artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/control-exercise-audit-24.json",
);
const truthSafetyStop = readJsonMaybe(
  "artifacts/casebrain-qa/assurance/master-auditor-v2/truth-safety-hardening-v1/STOP-FOR-CODEX-REVIEW.json",
);

const failureTaxonomy = [
  ["A", "extraction_failure", "source contains information but CaseBrain fails to extract it"],
  ["B", "semantic_role_failure", "text extracted but assigned wrong role"],
  ["C", "evidence_state_failure", "material found but service/completeness state wrong"],
  ["D", "provenance_family_failure", "claim receives evidence from wrong family"],
  ["E", "unsupported_promotion_failure", "heuristic/practice expectation becomes case fact"],
  ["F", "cross_panel_consistency_failure", "one canonical item receives contradictory states"],
  ["G", "workflow_stage_failure", "case routed through wrong procedural stage"],
  ["H", "entity_attribution_failure", "facts cross defendant/witness/count/exhibit boundaries"],
  ["I", "dedupe_alias_failure", "same issue duplicated or distinct issues merged"],
  ["J", "counter_denominator_failure", "visible counters have incompatible unexplained scopes"],
  ["K", "certainty_escalation_failure", "downstream copy exceeds source certainty"],
  ["L", "solicitor_visible_internal_language_failure", "internal/test/taxonomy wording leaks"],
  ["M", "ui_rendering_failure", "rendering hides/damages trust-critical information"],
  ["N", "stale_derived_state_failure", "one surface uses stale fallback/cache"],
  ["O", "source_conflict_failure", "conflicting documents silently collapsed"],
  ["P", "document_identity_failure", "wrapper/filename overdetermines doc type/completeness"],
  ["Q", "partial_processing_failure", "partial bundle presented as complete analysis"],
  ["R", "cross_case_leakage", "case A output contains case B data"],
  ["S", "repeatability_nondeterminism_failure", "unchanged case yields materially different truth"],
  ["T", "numerical_fidelity_failure", "date/time/page/count/quantity altered incorrectly"],
  ["U", "quote_fidelity_failure", "quote/paraphrase mismatch"],
  ["V", "prompt_injection_content_control_failure", "uploaded-paper instructions alter system behaviour"],
].map(([code, id, description]) => ({ code, id, description }));

const severity = [
  { level: "P0", description: "Potentially unsafe/confidentiality/fundamental truth failure; must block release until resolved or explicitly quarantined." },
  { level: "P1", description: "Serious trust/legal-meaning failure; requires root-cause review and invariant before broad claim." },
  { level: "P2", description: "Workflow/product clarity problem; fix/log without derailing P0/P1 truth work." },
  { level: "P3", description: "Cosmetic polish; route to visual redesign unless it damages meaning/trust." },
];

const historicalRegressionMap = [
  ["A", "charge_present_but_charge_not_on_papers", ["extraction_failure", "charge_integrity"], "P0/P1"],
  ["B", "offence_date_used_as_hearing_date", ["semantic_role_failure", "date_role_integrity"], "P0/P1"],
  ["C", "interview_unknown_treated_missing", ["evidence_state_failure", "existence_vs_service"], "P1"],
  ["D", "outstanding_transcript_became_served", ["evidence_state_failure", "service_status"], "P0/P1"],
  ["E", "unsupported_phone_download_outstanding", ["unsupported_promotion_failure", "heuristic_firewall"], "P1"],
  ["F", "unsupported_codefendant_unknown_male", ["unsupported_promotion_failure", "entity_isolation"], "P1"],
  ["G", "cctv_inherited_phone_provenance", ["provenance_family_failure", "evidence_family_firewall"], "P0/P1"],
  ["H", "first_appearance_rendered_ptph", ["workflow_stage_failure", "stage_routing"], "P1"],
  ["I", "unsupported_medical_bwv_999_retraction", ["unsupported_promotion_failure", "heuristic_firewall"], "P1"],
  ["J", "remains_outstanding_duplicate", ["dedupe_alias_failure", "wording_template"], "P2"],
  ["K", "internal_telemetry_visible", ["solicitor_visible_internal_language_failure"], "P2/P1 if meaning damaged"],
  ["L", "internal_taxonomy_visible", ["solicitor_visible_internal_language_failure"], "P2/P1 if meaning damaged"],
  ["M", "old_empty_hearings_shell_selected_case", ["ui_rendering_failure", "stale_derived_state_failure"], "P1"],
  ["N", "confirmed_hearing_date_implied_without_source", ["deadline_integrity", "certainty_escalation_failure"], "P1"],
].map(([code, id, invariantFamilies, severityBand]) => ({ code, id, invariantFamilies, severityBand }));

const gaps = [
  {
    id: "coverage_reporting_gap",
    severity: "P1",
    currentFact: "Accepted V2.1.2 evidence reports 17/361 controls exercised.",
    needed: "One canonical coverage registry that reports exercised/not_exercised/unavailable by taxonomy category and run tier.",
    phase: "Phase 2",
  },
  {
    id: "machine_result_schema_gap",
    severity: "P1",
    currentFact: "Existing reports use several compatible but separate STOP/receipt formats.",
    needed: "Shared audit result envelope: runId, commit, caseId, invariantId, taxonomy, severity, surface, sourceRef, expected, actual, rootCluster.",
    phase: "Phase 2",
  },
  {
    id: "canonical_state_comparator_gap",
    severity: "P1",
    currentFact: "Cross-tab bugs are caught by specific regressions and live sweeps, not yet by a general canonical-state comparator.",
    needed: "Programmatic comparator for Overview/Court/Papers/Client/CPS Chase/File against one canonical evidence-state model.",
    phase: "Phase 3",
  },
  {
    id: "gold_holdout_formalisation_gap",
    severity: "P1",
    currentFact: "There are many corpus/gold artefacts, but the next programme needs formal gold/holdout designation without using CaseBrain output as truth.",
    needed: "Stratified Gold 150-250 and Holdout 50-100 plan with independent truth provenance and unresolved labels.",
    phase: "Phase 4",
  },
  {
    id: "browser_pdf_lane_gap",
    severity: "P2/P1",
    currentFact: "Browser lane remains not_exercised in accepted V2.1.2; real-PDF pilot covers 20 real PDFs and local builders.",
    needed: "Rendered UI/browser representative subset after core invariants; PDF output proof separated from source PDF copies.",
    phase: "Phase 9",
  },
  {
    id: "security_tenant_lane_gap",
    severity: "P0 planned",
    currentFact: "Security/tenant checks exist in scattered app tests, not yet as a master-auditor lane.",
    needed: "Separate security auditor plan for auth, tenant isolation, signed URLs, case ID enumeration, route protection.",
    phase: "Phase 2/9 separate lane",
  },
];

const architectureMap = {
  schemaVersion: "casebrain-master3000-phase1-architecture-map@1.0.0",
  generatedAt: GENERATED_AT,
  baseline,
  evidenceRead: {
    v212Stop: v212Stop ? "present" : "missing",
    realPdfStop: realPdfStop ? "present" : "missing",
    realPdfControlAudit: realPdfControls ? "present" : "missing",
    truthSafetyStop: truthSafetyStop ? "present" : "missing",
  },
  existingSystems: categorized,
  failureTaxonomy,
  severity,
  historicalRegressionMap,
  machineReadableResultFormat: {
    requiredFields: [
      "runId",
      "commit",
      "caseId",
      "sourceFingerprint",
      "testOrInvariantId",
      "failureClass",
      "severity",
      "evidenceFamily",
      "surface",
      "sourceReference",
      "expected",
      "actual",
      "rootCauseCluster",
      "disposition",
      "coverageStatus",
    ],
    allowedCoverageStatuses: ["evaluated", "not_exercised", "unavailable", "unresolved", "projection_only"],
    note: "This is Phase 1 design output, not yet a full corpus run.",
  },
  gaps,
  phase2EntryCriteria: [
    "Do not run all 3,000 PDFs yet.",
    "Create a shared audit result model, invariant registry and severity/taxonomy enums.",
    "Wire existing source-truth and MAA receipts into the shared envelope.",
    "Use a small development sample only until result model and coverage accounting are proven.",
  ],
  nonClaims: {
    full3000Run: false,
    corpusPass: false,
    stage3000Completion: false,
    programmePass: false,
    solicitorApproval: false,
    browserLaneExercised: false,
    globalZeroDefects: false,
  },
};

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

function mdList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

const implementationMapMd = `# CaseBrain master 3,000 quality programme — Phase 0/1 implementation map

Generated: ${GENERATED_AT}

## Baseline

- Branch: \`${baseline.branch}\`
- HEAD: \`${baseline.head}\`
- Subject: \`${baseline.headSubject}\`
- Prompt baseline match: **${baseline.promptBaselineMatches}**
- Tracked dirty files: **${baseline.trackedDirtyCount}**
- Untracked scratch files: **${baseline.untrackedCount}** (left untouched)

## What this phase did

This checkpoint deliberately performed **Phase 0 and Phase 1 only**.

It did **not** run the 3,000-case corpus, did **not** alter product behaviour, and did **not** claim CaseBrain is globally correct.

The output is the reusable map needed before Phase 2 builds the shared audit model.

## Existing systems to reuse

${categorized
  .map(
    (entry) => `### ${entry.title}

- Files found: **${entry.fileCount}** (${entry.trackedCount} tracked, ${entry.untrackedOrScratchCount} scratch/untracked-or-untracked-by-map)
- Reuse: ${entry.reuseDecision}
- Gap: ${entry.identifiedGap}
- Representative files:
${mdList(entry.representativePaths.slice(0, 12))}
`,
  )
  .join("\n")}

## Main gaps before broad corpus work

${gaps
  .map((gap) => `- **${gap.id}** (${gap.severity}, ${gap.phase}) — ${gap.needed}`)
  .join("\n")}

## Phase 2 next step

Build the core reusable audit model:

1. failure taxonomy and severity enums;
2. machine-readable audit result envelope;
3. invariant registry;
4. coverage tracker for 361 controls;
5. tiered runner interface;
6. failure clustering and sibling search hooks.

Only use a small development sample until the model proves deterministic.

## Non-claims

- No full 3,000 run.
- No corpus PASS.
- No Stage-3000 completion.
- No programme PASS.
- No solicitor approval.
- No browser-lane PASS.
`;

const stop = {
  schemaVersion: "master3000-phase0-phase1-stop@1.0.0",
  generatedAt: GENERATED_AT,
  status: "PHASE0_PHASE1_COMPLETE__ARCHITECTURE_MAPPED__READY_FOR_PHASE2_CORE_AUDIT_MODEL",
  workPerformed: [
    "Recorded current baseline and PR context.",
    "Mapped existing auditor/test/corpus/product-state infrastructure.",
    "Classified reuse decisions and gaps.",
    "Recorded failure taxonomy, severity model and historical regression map.",
    "Defined Phase 2 entry criteria for reusable audit model.",
  ],
  baseline,
  trackedDirtyCountAtEmit: baseline.trackedDirtyCount,
  untrackedScratchPreserved: baseline.untrackedCount,
  full3000RunStarted: false,
  productBehaviourChanged: false,
  nextStep: "Phase 2: implement shared audit result model + invariant registry + 361-control coverage tracker, using a small sample only.",
  nonClaims: architectureMap.nonClaims,
};

const written: string[] = [];
written.push(writeJson("PHASE0-BASELINE.json", baseline));
written.push(writeJson("PHASE1-AUDITOR-ARCHITECTURE-MAP.json", architectureMap));
written.push(writeJson("PHASE1-GAP-REGISTER.json", gaps));
written.push(writeJson("FAILURE-TAXONOMY-AND-SEVERITY.json", { failureTaxonomy, severity, historicalRegressionMap }));
written.push(writeText("PHASE0-1-IMPLEMENTATION-MAP.md", implementationMapMd));
written.push(writeJson("STOP-FOR-CODEX-REVIEW.json", stop));

const manifestPayloadFiles = [
  rel(__filename),
  ...written.map((file) => rel(file)),
].sort();

const manifest = {
  schemaVersion: "master3000-phase0-phase1-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  selfHashStatus: "excluded_from_files_array_self_referential",
  files: manifestPayloadFiles.map((file) => {
    const absolute = path.join(ROOT, file);
    return {
      path: file,
      sha256: sha256File(absolute),
      byteLength: bytes(absolute),
      classification: file.startsWith("scripts/") ? "source" : "phase0_phase1_artifact",
    };
  }),
};
const manifestPath = writeJson("CHANGED-FILE-MANIFEST.json", manifest);
const digest = {
  schemaVersion: "master3000-phase0-phase1-manifest-digest@1.0.0",
  generatedAt: GENERATED_AT,
  manifestPath: rel(manifestPath),
  manifestSha256: sha256File(manifestPath),
  manifestByteLength: bytes(manifestPath),
};
const digestPath = writeJson("CHANGED-FILE-MANIFEST.DIGEST.json", digest);

console.log(
  JSON.stringify(
    {
      status: stop.status,
      outputRoot: rel(OUT_ROOT),
      filesWritten: [...written.map((file) => rel(file)), rel(manifestPath), rel(digestPath)],
      baselineHead: baseline.head,
      promptBaselineMatches: baseline.promptBaselineMatches,
      full3000RunStarted: false,
      productBehaviourChanged: false,
      nextStep: stop.nextStep,
    },
    null,
    2,
  ),
);
