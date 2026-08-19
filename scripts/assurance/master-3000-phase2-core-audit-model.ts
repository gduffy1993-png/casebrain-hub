import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  FAILURE_TAXONOMY,
  HISTORICAL_INVARIANTS,
  SEVERITY_LEVELS,
  assertInvariantRegistry,
  clusterFailures,
  createAuditResult,
  recommendAuditTier,
  summarizeCoverage,
} from "../../lib/eval/master3000-quality";

const ROOT = process.cwd();
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase2-core-audit-model",
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
const phase01StopPath = "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-phase0-phase1/STOP-FOR-CODEX-REVIEW.json";
const phase01Stop = existsSync(path.join(ROOT, phase01StopPath))
  ? JSON.parse(readFileSync(path.join(ROOT, phase01StopPath), "utf8"))
  : null;

const sampleResults = [
  createAuditResult({
    runId: "phase2-core-model-smoke",
    commit: head,
    caseId: "synthetic-provenance-family-negative",
    controlId: "CB-HIST-CCTV-NOT-PHONE-PROVENANCE",
    invariantId: "CB-HIST-CCTV-NOT-PHONE-PROVENANCE",
    failureClass: "provenance_family_failure",
    severity: "P0",
    evidenceFamily: "cctv",
    surface: "cps_chase",
    sourceReference: { documentId: "fixture-mg6", page: 4, limitation: "phase2 model smoke only" },
    expected: "CCTV chase may only use CCTV-family provenance.",
    actual: "Fixture demonstrates wrong-family provenance candidate shape.",
    rootCauseCluster: "wrong-family-provenance",
    disposition: "candidate_failure",
    coverageStatus: "evaluated",
  }),
  createAuditResult({
    runId: "phase2-core-model-smoke",
    commit: head,
    caseId: "synthetic-unsupported-phone-negative",
    controlId: "CB-HIST-UNSUPPORTED-PHONE-NOT-CHASE",
    invariantId: "CB-HIST-UNSUPPORTED-PHONE-NOT-CHASE",
    failureClass: "unsupported_promotion_failure",
    severity: "P1",
    evidenceFamily: "phone",
    surface: "cps_chase",
    expected: "No phone chase where source does not establish phone material.",
    actual: "Fixture demonstrates unsupported-promotion candidate shape.",
    rootCauseCluster: "heuristic-promoted-to-fact",
    disposition: "candidate_failure",
    coverageStatus: "evaluated",
  }),
  createAuditResult({
    runId: "phase2-core-model-smoke",
    commit: head,
    caseId: "synthetic-browser-unavailable",
    controlId: "BROWSER-LANE",
    invariantId: "BROWSER-LANE-AUTHENTICATED",
    failureClass: "ui_rendering_failure",
    severity: "P2",
    surface: "browser",
    expected: "Authenticated browser lane exercised only with legitimate session.",
    actual: "No authenticated browser corpus run in Phase 2.",
    disposition: "not_exercised",
    coverageStatus: "not_exercised",
  }),
];

const coverage = summarizeCoverage(sampleResults, 361);
const clusters = clusterFailures(sampleResults);
const invariantIssues = assertInvariantRegistry(HISTORICAL_INVARIANTS);
const tierRecommendations = {
  css_or_visual_copy: recommendAuditTier("css_or_visual_copy"),
  wording_template: recommendAuditTier("wording_template"),
  evidence_state_or_provenance: recommendAuditTier("evidence_state_or_provenance"),
  canonical_state_or_parser: recommendAuditTier("canonical_state_or_parser"),
  release_gate: recommendAuditTier("release_gate"),
};

const coreModel = {
  schemaVersion: "master3000-phase2-core-audit-model@1.0.0",
  generatedAt: GENERATED_AT,
  commit: head,
  phase01Dependency: phase01Stop
    ? {
        path: phase01StopPath,
        status: phase01Stop.status,
      }
    : {
        path: phase01StopPath,
        status: "missing",
      },
  modulesAdded: [
    "lib/eval/master3000-quality/taxonomy.ts",
    "lib/eval/master3000-quality/types.ts",
    "lib/eval/master3000-quality/invariants.ts",
    "lib/eval/master3000-quality/result.ts",
    "lib/eval/master3000-quality/coverage.ts",
    "lib/eval/master3000-quality/cluster.ts",
    "lib/eval/master3000-quality/tier.ts",
    "lib/eval/master3000-quality/index.ts",
  ],
  contract: "scripts/master3000-quality-core.test.ts",
  failureTaxonomyCount: FAILURE_TAXONOMY.length,
  severityLevels: SEVERITY_LEVELS,
  invariantRegistryCount: HISTORICAL_INVARIANTS.length,
  invariantRegistryIssues: invariantIssues,
  resultEnvelopeVersion: "casebrain-master3000-audit-result@1.0.0",
  sampleCoverageDashboard: coverage,
  sampleClusters: clusters,
  tierRecommendations,
  nextPhase: {
    phase: 3,
    name: "High-value invariants",
    rule: "Start with targeted fixtures and small contrasting sets; no full 3,000 until canonical/provenance infrastructure and lower tiers pass.",
  },
  nonClaims: {
    full3000Run: false,
    productBehaviourChanged: false,
    corpusPass: false,
    stage3000Completion: false,
    programmePass: false,
    solicitorApproval: false,
  },
};

const stop = {
  schemaVersion: "master3000-phase2-stop@1.0.0",
  generatedAt: GENERATED_AT,
  status: "PHASE2_CORE_AUDIT_MODEL_COMPLETE__NO_CORPUS_RUN",
  commit: head,
  workPerformed: [
    "Added reusable failure taxonomy/severity exports.",
    "Added audit result envelope and validation.",
    "Added historical invariant registry for known regressions.",
    "Added 361-control coverage accounting.",
    "Added failure clustering by shared root.",
    "Added tier recommendation guardrail so small changes do not trigger full 3,000 runs.",
    "Added contracts proving taxonomy, envelope, coverage, clustering, invariant and tier behaviour.",
  ],
  invariantRegistryIssues: invariantIssues,
  full3000RunStarted: false,
  productBehaviourChanged: false,
  nextStep: "Phase 3: implement high-value invariants against targeted fixtures, then small contrasting sets.",
  nonClaims: coreModel.nonClaims,
};

const reportMd = `# CaseBrain master 3,000 quality programme — Phase 2 core audit model

Generated: ${GENERATED_AT}

## Result

**${stop.status}**

Phase 2 added reusable audit infrastructure only. It did not change product behaviour and did not run the full corpus.

## Added core model

- Failure taxonomy A–V: **${FAILURE_TAXONOMY.length}** classes
- Severity model: P0/P1/P2/P3
- Historical invariant registry: **${HISTORICAL_INVARIANTS.length}** invariants
- Audit result envelope: \`casebrain-master3000-audit-result@1.0.0\`
- Coverage summary that refuses to call 17/361 a corpus pass
- Failure clustering by shared root
- Tier recommender that blocks unnecessary 3,000 runs for CSS/cosmetic changes

## Sample dashboard

- Total controls: **${coverage.totalControls}**
- Evaluated controls in smoke sample: **${coverage.evaluatedControls}**
- Not exercised controls: **${coverage.notExercisedControls}**
- Claim: **${coverage.claim}**

## Next step

Phase 3 should add high-value invariant fixtures, beginning with:

1. provenance-family firewall;
2. unsupported-promotion firewall;
3. date-role integrity;
4. evidence-state/existence-vs-service;
5. stage routing;
6. cross-tab certainty ceilings.

Still do **not** run the full 3,000 until lower tiers prove the invariant model.
`;

const written: string[] = [];
written.push(writeJson("PHASE2-CORE-AUDIT-MODEL.json", coreModel));
written.push(writeJson("INVARIANT-REGISTRY.json", HISTORICAL_INVARIANTS));
written.push(writeJson("SAMPLE-AUDIT-RESULTS.json", sampleResults));
written.push(writeJson("SAMPLE-COVERAGE-DASHBOARD.json", coverage));
written.push(writeJson("SAMPLE-FAILURE-CLUSTERS.json", clusters));
written.push(writeText("DECISION-CARD.md", reportMd));
written.push(writeJson("STOP-FOR-CODEX-REVIEW.json", stop));

const manifestFiles = [
  rel("lib/eval/master3000-quality/taxonomy.ts"),
  rel("lib/eval/master3000-quality/types.ts"),
  rel("lib/eval/master3000-quality/invariants.ts"),
  rel("lib/eval/master3000-quality/result.ts"),
  rel("lib/eval/master3000-quality/coverage.ts"),
  rel("lib/eval/master3000-quality/cluster.ts"),
  rel("lib/eval/master3000-quality/tier.ts"),
  rel("lib/eval/master3000-quality/index.ts"),
  rel("scripts/master3000-quality-core.test.ts"),
  rel("scripts/assurance/master-3000-phase2-core-audit-model.ts"),
  ...written.map((file) => rel(file)),
].sort();

const manifestPath = writeJson("CHANGED-FILE-MANIFEST.json", {
  schemaVersion: "master3000-phase2-changed-file-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  selfHashStatus: "excluded_from_files_array_self_referential",
  files: manifestFiles.map((file) => ({
    path: file,
    sha256: sha256File(path.join(ROOT, file)),
    byteLength: bytes(path.join(ROOT, file)),
    classification: file.startsWith("lib/") ? "source" : file.startsWith("scripts/") ? "contract_or_emit_script" : "phase2_artifact",
  })),
});

const digestPath = writeJson("CHANGED-FILE-MANIFEST.DIGEST.json", {
  schemaVersion: "master3000-phase2-changed-file-manifest-digest@1.0.0",
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
      invariantRegistryIssues: invariantIssues,
      sampleCoverageClaim: coverage.claim,
      full3000RunStarted: false,
      productBehaviourChanged: false,
    },
    null,
    2,
  ),
);
