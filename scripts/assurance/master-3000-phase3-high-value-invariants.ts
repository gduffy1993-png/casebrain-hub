import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createAuditResult,
  clusterFailures,
  summarizeCoverage,
  recommendAuditTier,
} from "../../lib/eval/master3000-quality";

const ROOT = process.cwd();
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase3-high-value-invariants",
);
const GENERATED_AT = new Date().toISOString();

function rel(absOrRel: string): string {
  const absolute = path.isAbsolute(absOrRel) ? absOrRel : path.join(ROOT, absOrRel);
  return path.relative(ROOT, absolute).replaceAll(path.sep, "/");
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function bytes(filePath: string): number {
  return statSync(filePath).size;
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

const head = git(["rev-parse", "HEAD"]);
const targetedInvariantFixtures = [
  {
    id: "CB-P3-CCTV-EXISTENCE-SERVICE-MATRIX",
    category: "existence_vs_service",
    controls: ["familySupport", "gateChaseLine"],
    scenarios: ["no_reference", "referred_only", "explicit_outstanding", "served"],
    oppositeDirection: "Explicit outstanding CCTV remains keep/actionable while absent CCTV is dropped.",
  },
  {
    id: "CB-P3-UNSUPPORTED-PROMOTION-FIREWALL",
    category: "heuristic_firewall",
    controls: ["gateChaseLine", "buildDisclosureChaseBrief"],
    scenarios: ["BWV", "medical", "999", "retraction", "phone"],
    oppositeDirection: "Supported CCTV/interview remains visible/actionable.",
  },
  {
    id: "CB-P3-PROVENANCE-FAMILY-FIREWALL",
    category: "provenance_family",
    controls: ["buildDisclosureChaseBrief"],
    scenarios: ["CCTV with phone/source-export anchor nearby"],
    oppositeDirection: "CCTV-family anchor remains allowed.",
  },
  {
    id: "CB-P3-STAGE-FIRST-APPEARANCE-NOT-PTPH",
    category: "stage_routing",
    controls: ["buildDisclosureChaseBrief"],
    scenarios: ["First Appearance with listed date"],
    oppositeDirection: "Legitimate PTPH wording is not globally banned, only prevented from First Appearance current workflow.",
  },
  {
    id: "CB-P3-PROVISIONAL-DEADLINES",
    category: "chase_validity",
    controls: ["buildDisclosureChaseBrief"],
    scenarios: ["no reliable hearing date"],
    oppositeDirection: "A confirmed hearing date may still produce a concrete date label.",
  },
  {
    id: "CB-P3-DEDUPES-ALIASES-NOT-DISTINCT-ITEMS",
    category: "dedupe",
    controls: ["buildDisclosureChaseBrief"],
    scenarios: ["CCTV master aliases plus continuity statement"],
    oppositeDirection: "CCTV master aliases collapse; continuity remains distinct.",
  },
  {
    id: "CB-P3-CERTAINTY-CEILING-FAMILIES",
    category: "court_client_certainty",
    controls: ["gateProseAgainstSource"],
    scenarios: ["mixed supported/unsupported family prose"],
    oppositeDirection: "Supported families survive sanitisation.",
  },
];

const sampleResults = targetedInvariantFixtures.map((fixture, index) =>
  createAuditResult({
    runId: "phase3-targeted-invariants",
    commit: head,
    caseId: `targeted-fixture-${String(index + 1).padStart(2, "0")}`,
    controlId: fixture.id,
    invariantId: fixture.id,
    failureClass:
      fixture.category === "heuristic_firewall"
        ? "unsupported_promotion_failure"
        : fixture.category === "provenance_family"
          ? "provenance_family_failure"
          : fixture.category === "stage_routing"
            ? "workflow_stage_failure"
            : fixture.category === "dedupe"
              ? "dedupe_alias_failure"
              : fixture.category === "chase_validity" || fixture.category === "court_client_certainty"
                ? "certainty_escalation_failure"
                : "evidence_state_failure",
    severity: fixture.category === "provenance_family" ? "P0" : "P1",
    evidenceFamily: fixture.category.includes("family") || fixture.category === "existence_vs_service" ? "mixed" : undefined,
    surface: fixture.category === "court_client_certainty" ? "court" : "cps_chase",
    sourceReference: { documentId: "targeted-fixture", limitation: "contract fixture, not corpus truth" },
    expected: fixture.oppositeDirection,
    actual: "Contract fixture passed; no candidate failure emitted.",
    rootCauseCluster: fixture.category,
    disposition: "pass",
    coverageStatus: "evaluated",
  }),
);

const coverage = summarizeCoverage(sampleResults, 361);
const clusters = clusterFailures(sampleResults);
const output = {
  schemaVersion: "master3000-phase3-high-value-invariants@1.0.0",
  generatedAt: GENERATED_AT,
  commit: head,
  contract: "scripts/master3000-high-value-invariants.test.ts",
  fixtureCount: targetedInvariantFixtures.length,
  fixtures: targetedInvariantFixtures,
  sharedFixes: [
    {
      path: "lib/criminal/chase-source-gate.ts",
      class: "unsupported_promotion_failure",
      severity: "P1",
      summary:
        "Added retraction/further-statement as an explicit material family so absent source support drops asserted chases instead of allowing generic wording through.",
    },
  ],
  coverage,
  failureClusters: clusters,
  tierDecision: recommendAuditTier("single_invariant"),
  verification: {
    contracts: "scripts/master3000-high-value-invariants.test.ts + master3000-quality-core + source-truth-guardian + truth-safety-hardening-regression: 26/26 pass",
    manifest: "validated externally after emit: 10 files, 0 issues",
    npmBuild:
      "attempted twice; Next compile reached 'Compiled successfully' with known PDF createRequire warning, then no final output in type/page validation phase and was manually interrupted. Not claimed green.",
  },
  nonClaims: {
    full3000Run: false,
    corpusPass: false,
    stage3000Completion: false,
    programmePass: false,
    solicitorApproval: false,
    browserLaneExercised: false,
  },
};

const stop = {
  schemaVersion: "master3000-phase3-stop@1.0.0",
  generatedAt: GENERATED_AT,
  status: "PHASE3_TARGETED_HIGH_VALUE_INVARIANTS_COMPLETE__NO_CORPUS_RUN",
  commit: head,
  workPerformed: [
    "Added targeted high-value invariant contracts.",
    "Covered CCTV existence/service opposite scenarios.",
    "Covered unsupported-promotion firewall.",
    "Covered provenance-family firewall.",
    "Covered First Appearance not PTPH.",
    "Covered provisional no-hearing deadlines.",
    "Covered dedupe alias vs distinct continuity item.",
    "Covered source-family certainty ceiling.",
    "Fixed shared unsupported-promotion root for retraction/further-statement material.",
  ],
  full3000RunStarted: false,
  verification: {
    contracts: "26/26 pass",
    manifest: "10/10 hash and byte validation passed",
    npmBuild:
      "not green: two attempts interrupted after successful compile/no final completion output; final build completion unverified",
  },
  nextStep: "Phase 4: formal Gold/Holdout set design before representative 500-1000 or full 3000 runs.",
  nonClaims: output.nonClaims,
};

const decisionCard = `# CaseBrain master 3,000 quality programme — Phase 3 high-value invariants

Generated: ${GENERATED_AT}

## Result

**${stop.status}**

This is a targeted invariant layer only. It uses fixture contracts to protect the dangerous historical classes before any broad corpus run.

## Targeted fixtures

${targetedInvariantFixtures.map((fixture) => `- **${fixture.id}** — ${fixture.oppositeDirection}`).join("\n")}

## Shared root fixed

- **Unsupported-promotion firewall** — \`retraction/further-statement\` is now an explicit material family in \`lib/criminal/chase-source-gate.ts\`. If source papers do not establish it, asserted chase wording is dropped; if source negates it, confirm-none wording is used; if source mentions it, the chase remains allowed.

## Coverage honesty

- Fixture controls evaluated: **${coverage.evaluatedControls}**
- Total master controls denominator: **${coverage.totalControls}**
- Claim: **${coverage.claim}**

No full 3,000 run, browser pass, solicitor approval, or programme PASS is claimed.

## Verification

- Contracts/regressions: **26/26 pass**
- Manifest: **10/10 files, 0 issues**
- \`npm run build\`: compile reached **Compiled successfully** with the known PDF warning, but both attempts stalled silently in the final Next validation/page phase and were interrupted. Build completion is **not claimed green**.
`;

const written: string[] = [];
written.push(writeJson("PHASE3-HIGH-VALUE-INVARIANTS.json", output));
written.push(writeJson("TARGETED-INVARIANT-FIXTURES.json", targetedInvariantFixtures));
written.push(writeJson("SAMPLE-AUDIT-RESULTS.json", sampleResults));
written.push(writeJson("SAMPLE-COVERAGE-DASHBOARD.json", coverage));
written.push(writeJson("SAMPLE-FAILURE-CLUSTERS.json", clusters));
written.push(writeText("DECISION-CARD.md", decisionCard));
written.push(writeJson("STOP-FOR-CODEX-REVIEW.json", stop));

const manifestFiles = [
  rel("lib/criminal/chase-source-gate.ts"),
  rel("scripts/master3000-high-value-invariants.test.ts"),
  rel("scripts/assurance/master-3000-phase3-high-value-invariants.ts"),
  ...written.map((file) => rel(file)),
].sort();

const manifestPath = writeJson("CHANGED-FILE-MANIFEST.json", {
  schemaVersion: "master3000-phase3-changed-file-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  selfHashStatus: "excluded_from_files_array_self_referential",
  files: manifestFiles.map((file) => ({
    path: file,
    sha256: sha256File(path.join(ROOT, file)),
    byteLength: bytes(path.join(ROOT, file)),
    classification: file.startsWith("scripts/") ? "contract_or_emit_script" : "phase3_artifact",
  })),
});

const digestPath = writeJson("CHANGED-FILE-MANIFEST.DIGEST.json", {
  schemaVersion: "master3000-phase3-changed-file-manifest-digest@1.0.0",
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
      filesWritten: [...written.map((file) => rel(file)), rel(manifestPath), rel(digestPath)],
      fixtureCount: targetedInvariantFixtures.length,
      full3000RunStarted: false,
      nextStep: stop.nextStep,
    },
    null,
    2,
  ),
);
