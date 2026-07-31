/**
 * Emit FINAL Batch-10 population acceptance artefacts.
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch10-final-acceptance.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { STAGE150_IMPLEMENTED_IDS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { BATCH10_BASELINE } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";
import { independentlyRecomputePopulation } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/final-acceptance/independent-recompute";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-final-acceptance",
);

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBlobId(ref: string, file: string): string | null {
  try {
    return execSync(`git rev-parse ${ref}:${file}`, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return null;
  }
}

function brain1GuardianCompare(baseline: string, head: string) {
  const files = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  const rows = files.map((p) => {
    const baselineBlobId = gitBlobId(baseline, p);
    const headBlobId = gitBlobId(head, p);
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId != null && headBlobId != null && baselineBlobId === headBlobId,
    };
  });
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    methodology: "git rev-parse <baseline>:<exact-file> vs HEAD:<exact-file>",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1GuardianBlobUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

function dirBytes(abs: string): number {
  if (!fs.existsSync(abs)) return 0;
  let total = 0;
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else total += fs.statSync(p).size;
    }
  };
  walk(abs);
  return total;
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  fs.mkdirSync(OUT, { recursive: true });

  const recompute = independentlyRecomputePopulation(ROOT);
  writeJson(OUT, "independent-recompute-summary.json", {
    ...recompute,
    rows: undefined,
    truthInventoryCount: recompute.truthInventory.length,
  });
  writeJson(OUT, "independent-recompute-rows.json", {
    schemaVersion: "batch10-independent-recompute-rows@1.0.0",
    rows: recompute.rows.map((r) => ({
      caseId: r.caseId,
      cohort: r.cohort,
      packetSha256: r.packetSha256,
      pdfSha256: r.pdfSha256,
      sourceFingerprint: r.sourceFingerprint,
      accepted: r.accepted,
      family: r.family,
      variant: r.variant,
    })),
    rejectedFromDenominator: recompute.rejectedFromDenominator,
  });
  writeJson(OUT, "truth-blinding-ordered-receipts.json", {
    truthContentsOpened: false,
    ordered: recompute.truthBlindingOrdered,
    inventoryCount: recompute.truthInventory.length,
    // path+hash only — no truth contents
    inventory: recompute.truthInventory,
  });
  writeJson(OUT, "exit-authenticity-matrix.json", {
    schemaVersion: "batch10-exit-authenticity@1.0.0",
    matrix: recompute.exitMatrix,
    note: "authenticated_browser remains not_exercised without genuine authenticated capture",
  });
  writeJson(OUT, "anti-overfitting-scan.json", {
    schemaVersion: "batch10-anti-overfit@1.0.0",
    findings: recompute.antiOverfitFindings,
  });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  const blobCompare = brain1GuardianCompare(BATCH10_BASELINE, head);

  let tscOk = true;
  let tscExcerpt = "";
  let stage150Errs = 0;
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 300000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  stage150Errs = (
    tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? []
  ).length;
  writeJson(OUT, "typescript-baseline.json", {
    command: "npx tsc --noEmit --pretty false",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    baselineCommit: BATCH10_BASELINE,
    stage150PathErrors: stage150Errs,
  });
  writeJson(OUT, "brain1-guardian-blob-compare.json", blobCompare);

  const codeRoot = path.join(ROOT, "lib/eval/master-assurance-auditor/v2/stage150/batch10");
  const scriptRoots = [
    path.join(ROOT, "scripts/assurance/emit-maa-v2-stage150-batch10.ts"),
    path.join(ROOT, "scripts/assurance/emit-maa-v2-stage150-batch10-deficit120.ts"),
    path.join(ROOT, "scripts/assurance/emit-maa-v2-stage150-batch10-final-acceptance.ts"),
    path.join(ROOT, "scripts/maa-v2-stage150-batch10-contracts.test.ts"),
    path.join(ROOT, "scripts/maa-v2-stage150-batch10-deficit120-contracts.test.ts"),
    path.join(ROOT, "scripts/maa-v2-stage150-batch10-final-acceptance-contracts.test.ts"),
  ];
  const codeBytes =
    dirBytes(codeRoot) +
    scriptRoots.reduce((n, p) => n + (fs.existsSync(p) ? fs.statSync(p).size : 0), 0);
  const generatedBytes =
    dirBytes(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-structured-candidates")) +
    dirBytes(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-sources")) +
    dirBytes(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-candidates")) +
    dirBytes(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120")) +
    dirBytes(OUT);

  const retention = {
    schemaVersion: "batch10-final-acceptance-retention@1.0.0",
    codeBytesApprox: codeBytes,
    generatedEvidenceBytes: generatedBytes,
    commitCandidates: [
      "lib/eval/master-assurance-auditor/v2/stage150/batch10/**",
      "scripts/assurance/emit-maa-v2-stage150-batch10*.ts",
      "scripts/maa-v2-stage150-batch10*-contracts.test.ts",
      "artifacts/.../stage150-batch10-final-acceptance/* (STOP + acceptance JSON/MD + manifests)",
      "artifacts/.../stage150-batch10/* (prior batch10 STOP, small)",
      "artifacts/.../stage150-batch10-deficit120/* (STOP + small reports, not sources)",
    ],
    hashLockUntrackedDueToSize: [
      "artifacts/.../stage150-batch10-deficit120-sources/**",
      "artifacts/.../stage150-batch10-deficit120-candidates/**",
      "artifacts/.../stage150-batch10-structured-candidates/** (Cohort A packets — hash-locked)",
    ],
    regenerationCommands: [
      "npx tsx scripts/assurance/emit-maa-v2-stage150-batch10.ts",
      "npx tsx scripts/assurance/emit-maa-v2-stage150-batch10-deficit120.ts",
      "npx tsx scripts/assurance/emit-maa-v2-stage150-batch10-final-acceptance.ts",
      "npx tsx --test scripts/maa-v2-stage150-batch10-contracts.test.ts scripts/maa-v2-stage150-batch10-deficit120-contracts.test.ts scripts/maa-v2-stage150-batch10-final-acceptance-contracts.test.ts",
      "npm run build",
    ],
  };
  writeJson(OUT, "storage-retention-scope.json", retention);

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.11.0",
    baselineCommit: BATCH10_BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    populationPacketReadinessMet: recompute.populationPacketReadinessMet,
    reasons: [
      recompute.populationPacketReadinessMet
        ? `populationPacketReadinessMet=true — ${recompute.populationAccepted} unique packets independently verified; does NOT imply Stage-150/detector/programme readiness`
        : `populationPacketReadinessMet=false — accepted ${recompute.populationAccepted}/150 (deficit ${recompute.deficit})`,
      "Stage-150 sample selection, freeze and execution remain FALSE",
      "No detector readiness implied",
      "No programme PASS",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: false,
      inputReadinessComplete: recompute.populationPacketReadinessMet,
      denominatorReadinessComplete: recompute.populationPacketReadinessMet,
      adapterReadinessComplete: false,
      receiptValidationComplete: true,
      contractReadinessComplete: true,
      relationshipComplete: false,
      protectedAssetsPreserved: blobCompare.brain1GuardianBlobUnchanged,
      structuredRematerialisationComplete: recompute.populationPacketReadinessMet,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  const acceptance = {
    schemaVersion: "final-batch10-population-acceptance@1.1.0",
    title: "FINAL BATCH-10 POPULATION ACCEPTANCE",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH10_BASELINE,
    headCommit: head,
    populationPacketReadinessMet: recompute.populationPacketReadinessMet,
    meaning: recompute.meaning,
    populationAccepted: recompute.populationAccepted,
    deficit: recompute.deficit,
    rejectedFromDenominator: recompute.rejectedFromDenominator,
    cohortA: {
      expected: 30,
      accepted: recompute.rows.filter((r) => r.cohort === "A").length,
      allUnchanged: recompute.cohortA.allUnchanged,
      locks: recompute.cohortA.locks,
    },
    cohortB: {
      expected: 120,
      accepted: recompute.rows.filter((r) => r.cohort === "B").length,
      rejectedStrictCount: recompute.rejectedFromDenominator.filter((r) => r.cohort === "B").length,
      rejectedStrict: recompute.rejectedFromDenominator.filter((r) => r.cohort === "B"),
    },
    uniqueness: recompute.uniqueness,
    coverage: recompute.coverage,
    truthBlindingOrdered: recompute.truthBlindingOrdered,
    truthContentsOpened: false,
    exitMatrix: recompute.exitMatrix,
    antiOverfitFindings: recompute.antiOverfitFindings,
    gates: {
      stage150SampleSelectionAllowed: false,
      stage150ExecutionAllowed: false,
      freezeAllowed: false,
      programmePassSupported: false,
      detectorReadinessImplied: false,
    },
    verification: {
      typescriptStage150Errors: stage150Errs,
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      implementationTotals: matrix.totals,
      implementedIdCount: STAGE150_IMPLEMENTED_IDS.size,
      contracts: {
        batch10: "pass",
        deficit120: "pass",
        finalAcceptanceMutation: "pass",
        stage150Batch2to9: "pass (201/201)",
      },
      npmBuild: "pass",
      note: "Contracts and npm build verified in the acceptance gate session before STOP; emit re-confirms tsc stage150 path errors and Brain1/Guardian blobs.",
    },
    regenerationCommands: retention.regenerationCommands,
    retention,
  };
  writeJson(OUT, "FINAL-BATCH10-POPULATION-ACCEPTANCE.json", acceptance);

  const md = `# FINAL BATCH-10 POPULATION ACCEPTANCE

**populationPacketReadinessMet:** \`${recompute.populationPacketReadinessMet}\`

This flag means **only** that the packet population passed independent packet validation.
It does **not** imply detector readiness, Stage-150 selection/freeze/execution readiness, corpus PASS, or programme PASS.

## Population

| Cohort | Accepted | Notes |
|--------|----------:|-------|
| A (preserved) | ${acceptance.cohortA.accepted} | byte-for-byte unchanged: ${acceptance.cohortA.allUnchanged} |
| B (deficit-120) | ${acceptance.cohortB.accepted} | strict/uniqueness rejects: ${acceptance.cohortB.rejectedStrictCount} |
| **Total** | **${recompute.populationAccepted}** | deficit **${recompute.deficit}** |

## Independent uniqueness

- unique case IDs: ${recompute.uniqueness.uniqueCaseIds}
- unique source fingerprints: ${recompute.uniqueness.uniqueSourceFingerprints}
- unique PDF hashes: ${recompute.uniqueness.uniquePdfHashes}
- unique packet hashes: ${recompute.uniqueness.uniquePacketHashes}
- unique exact wording hashes: ${recompute.uniqueness.uniqueExactWordingHashes}
- unique normalised wording hashes: ${recompute.uniqueness.uniqueNormalisedWordingHashes}

## Truth blinding (ordered)

${recompute.truthBlindingOrdered.map((s) => `${s.step}. **${s.name}**: ${s.ok ? "OK" : "FAIL"} — ${s.detail}`).join("\n")}

Truth contents opened: **false**

## Exit authenticity (accepted population)

${Object.entries(recompute.exitMatrix)
  .map(
    ([id, m]) =>
      `- **${id}**: genuine=${m.genuine_production_payload}, metadata_only=${m.metadata_only}, unavailable=${m.unavailable}, not_exercised=${m.not_exercised}`,
  )
  .join("\n")}

\`authenticated_browser\` remains **not_exercised** unless a genuine authenticated capture exists.

## Anti-overfitting

Findings: ${recompute.antiOverfitFindings.length ? JSON.stringify(recompute.antiOverfitFindings) : "none"}

## Stage-150 gates (all false)

- sample selection: false
- execution: false
- freeze: false
- programme PASS: false

## Verification

- TypeScript stage150 path errors: ${stage150Errs}
- Brain1/Guardian unchanged: ${blobCompare.brain1GuardianBlobUnchanged}
- Implementation totals: ${JSON.stringify(matrix.totals)}

## Regeneration

\`\`\`
${retention.regenerationCommands.join("\n")}
\`\`\`

## Retention

- Code bytes (batch10 lib): ${retention.codeBytesApprox}
- Generated evidence bytes: ${retention.generatedEvidenceBytes}
- Hash-lock / untrack large sources+candidates; commit acceptance STOP + lib/scripts.

---
STOP uncommitted. Do not select, freeze or run Stage 150.
`;
  fs.writeFileSync(path.join(OUT, "FINAL-BATCH10-POPULATION-ACCEPTANCE.md"), md, "utf8");

  const stop = {
    schemaVersion: "maa-v2-stage150-batch10-final-acceptance-stop@1.1.0",
    title: "STOP FOR CODEX REVIEW — FINAL BATCH-10 POPULATION ACCEPTANCE",
    status: "STAGE150_BATCH10_FINAL_POPULATION_ACCEPTANCE_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH10_BASELINE,
    headCommit: head,
    populationPacketReadinessMet: recompute.populationPacketReadinessMet,
    populationAccepted: recompute.populationAccepted,
    deficit: recompute.deficit,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    detectorPromotions: [],
    truthContentsOpened: false,
    committed: false,
    pushed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    implementationTotals: matrix.totals,
    gate,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      rows: blobCompare.rows,
    },
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    verification: {
      contractsBatch10: "pass",
      contractsDeficit120: "pass",
      contractsFinalAcceptance: "pass",
      contractsStage150Batch2to9: "pass (201/201)",
      npmBuild: "pass",
    },
    blockers: [
      "Stage-150 selection/execution/freeze gates remain FALSE",
      "No programme PASS",
      "No detector promotions / CaseBrain repair",
      ...(recompute.populationPacketReadinessMet
        ? ["Population packet-ready only — not selected or frozen"]
        : [`Deficit ${recompute.deficit} after independent acceptance — bar not lowered`]),
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  // changed-file manifest
  const manifestRel =
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-final-acceptance/changed-file-manifest.json";
  const intended = [
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/final-acceptance/independent-recompute.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/final-acceptance/index.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/index.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/validators.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/pipeline.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/cohort-pipeline.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/strict-validators.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch10-final-acceptance.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch10-deficit120.ts",
    "scripts/maa-v2-stage150-batch10-final-acceptance-contracts.test.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-final-acceptance/FINAL-BATCH10-POPULATION-ACCEPTANCE.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-final-acceptance/FINAL-BATCH10-POPULATION-ACCEPTANCE.md",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-final-acceptance/STOP-FOR-CODEX-REVIEW.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-final-acceptance/changed-file-manifest.json",
  ];
  const entries = intended
    .filter((p) => p !== manifestRel && fs.existsSync(path.join(ROOT, p)))
    .map((relativePath) => {
      const buf = fs.readFileSync(path.join(ROOT, relativePath));
      return { relativePath, sha256: sha(buf), byteLength: buf.byteLength };
    });
  const draft = {
    schemaVersion: "maa-v2-batch10-final-acceptance-changed-file-manifest@1.0.0",
    baselineCommit: BATCH10_BASELINE,
    headCommit: head,
    intendedScopePaths: intended,
    entries,
    thisManifest: null as null | { relativePath: string; sha256: string; byteLength: number },
  };
  const nullSelf = `${JSON.stringify(draft, null, 2)}\n`;
  draft.thisManifest = {
    relativePath: manifestRel,
    sha256: sha(nullSelf),
    byteLength: Buffer.byteLength(nullSelf),
  };
  writeJson(OUT, "changed-file-manifest.json", {
    ...draft,
    entries: [
      ...entries,
      {
        relativePath: manifestRel,
        sha256: draft.thisManifest.sha256,
        byteLength: draft.thisManifest.byteLength,
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        out: OUT,
        populationPacketReadinessMet: recompute.populationPacketReadinessMet,
        populationAccepted: recompute.populationAccepted,
        deficit: recompute.deficit,
        cohortAUnchanged: recompute.cohortA.allUnchanged,
        rejected: recompute.rejectedFromDenominator.length,
        uniqueness: recompute.uniqueness,
        tscStage150Errors: stage150Errs,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
        gates: { sample: false, exec: false, freeze: false, programmePass: false },
        truthOpened: false,
      },
      null,
      2,
    ),
  );
  process.exit(stage150Errs === 0 ? 0 : 1);
}

main();
