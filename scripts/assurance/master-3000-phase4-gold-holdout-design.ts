import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  GOLD_HOLDOUT_POLICY,
  STRATIFICATION_AXES,
  validateGoldHoldoutPolicy,
} from "../../lib/eval/master3000-quality";

const ROOT = process.cwd();
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase4-gold-holdout-design",
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
const policyIssues = validateGoldHoldoutPolicy(GOLD_HOLDOUT_POLICY);

const candidateCorpusSources = [
  {
    id: "accepted_v2_1_2_clean_single_writer",
    path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.2/",
    use: "lineage/evidence candidate source only",
    limitation: "17/361 controls exercised; cannot become truth without independent source/truth review",
  },
  {
    id: "real_pdf_live_pilot_v1",
    path: "artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/",
    use: "real-PDF/live-builder pilot candidates",
    limitation: "20 matters only; authenticated browser not exercised",
  },
  {
    id: "evidence_state_audit_local",
    path: "artifacts/evidence-state-audit-local/",
    use: "local truth-key/source/output style examples",
    limitation: "must verify provenance and fictional/real status before gold use",
  },
  {
    id: "solicitor_review_audit_pack",
    path: "artifacts/solicitor-review-audit-pack/",
    use: "human-review templates and scoring guide",
    limitation: "templates only; not populated gold truth",
  },
];

const design = {
  schemaVersion: "master3000-phase4-gold-holdout-design@1.0.0",
  generatedAt: GENERATED_AT,
  commit: head,
  policy: GOLD_HOLDOUT_POLICY,
  policyIssues,
  candidateCorpusSources,
  proposedWorkflow: [
    "Build candidate inventory from existing corpus manifests and real-PDF pilot only.",
    "Exclude cases where source/truth is absent unless they are deliberately labelled unavailable/unresolved.",
    "Stratify by all axes; sample Gold 150-250 and Holdout 50-100 disjoint sets.",
    "Do not populate truth labels from current CaseBrain output.",
    "Record reviewer fields blank until qualified/human review is actually done.",
    "Run Phase 3 invariants on Gold first, then keep Holdout sealed until major shared fixes are ready.",
  ],
  nonClaims: {
    goldSelected: false,
    holdoutSelected: false,
    truthCompleted: false,
    full3000Run: false,
    corpusPass: false,
    programmePass: false,
  },
};

const stop = {
  schemaVersion: "master3000-phase4-stop@1.0.0",
  generatedAt: GENERATED_AT,
  status: "PHASE4_GOLD_HOLDOUT_DESIGN_COMPLETE__SELECTION_NOT_EXECUTED",
  commit: head,
  policyIssues,
  nextStep: "Build a candidate inventory and select disjoint Gold/Holdout sets only after confirming independent source/truth availability.",
  nonClaims: design.nonClaims,
};

const decisionCard = `# CaseBrain master 3,000 quality programme — Phase 4 Gold/Holdout design

Generated: ${GENERATED_AT}

## Result

**${stop.status}**

This phase designed the Gold/Holdout gate. It did not select matters and did not invent ground truth.

## Targets

- Gold: **${GOLD_HOLDOUT_POLICY.goldTargetMin}-${GOLD_HOLDOUT_POLICY.goldTargetMax}**
- Holdout: **${GOLD_HOLDOUT_POLICY.holdoutTargetMin}-${GOLD_HOLDOUT_POLICY.holdoutTargetMax}**

## Stratification axes

${STRATIFICATION_AXES.map((axis) => `- ${axis}`).join("\n")}

## Hard rule

Current CaseBrain output is **forbidden** as ground truth. Gold/Holdout labels must come from source PDFs/text, independent truth keys, qualified review, or explicit unresolved/unavailable labels.

## Next

Build candidate inventory, then select disjoint Gold/Holdout sets. Do not start broad 500/1000/3000 runs until the truth set is honestly formed.
`;

const written: string[] = [];
written.push(writeJson("GOLD-HOLDOUT-POLICY.json", GOLD_HOLDOUT_POLICY));
written.push(writeJson("PHASE4-GOLD-HOLDOUT-DESIGN.json", design));
written.push(writeJson("CANDIDATE-CORPUS-SOURCE-REGISTER.json", candidateCorpusSources));
written.push(writeText("DECISION-CARD.md", decisionCard));
written.push(writeJson("STOP-FOR-CODEX-REVIEW.json", stop));

const manifestFiles = [
  rel("lib/eval/master3000-quality/gold-holdout.ts"),
  rel("lib/eval/master3000-quality/index.ts"),
  rel("scripts/master3000-gold-holdout-design.test.ts"),
  rel("scripts/assurance/master-3000-phase4-gold-holdout-design.ts"),
  ...written.map((file) => rel(file)),
].sort();

const manifestPath = writeJson("CHANGED-FILE-MANIFEST.json", {
  schemaVersion: "master3000-phase4-changed-file-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  selfHashStatus: "excluded_from_files_array_self_referential",
  files: manifestFiles.map((file) => ({
    path: file,
    sha256: sha256File(path.join(ROOT, file)),
    byteLength: bytes(path.join(ROOT, file)),
    classification: file.startsWith("lib/") ? "source" : file.startsWith("scripts/") ? "contract_or_emit_script" : "phase4_artifact",
  })),
});

const digestPath = writeJson("CHANGED-FILE-MANIFEST.DIGEST.json", {
  schemaVersion: "master3000-phase4-changed-file-manifest-digest@1.0.0",
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
      policyIssues,
      goldSelected: false,
      holdoutSelected: false,
      full3000RunStarted: false,
    },
    null,
    2,
  ),
);
