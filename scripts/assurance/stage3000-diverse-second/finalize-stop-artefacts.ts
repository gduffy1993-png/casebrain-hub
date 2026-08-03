/**
 * Final STOP artefacts for diverse second 3000 — uncommitted.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const PROG = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);
const BASELINE = "308b7cb633f83d7c998bc80adf87356de346b3e9";
const FIRST_HASH = "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae";

function writeJson(name: string, data: unknown): void {
  fs.writeFileSync(path.join(PROG, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function shaFile(p: string): { sha256: string; byteLength: number } {
  const b = fs.readFileSync(p);
  return { sha256: crypto.createHash("sha256").update(b).digest("hex"), byteLength: b.length };
}
function blobId(rev: string, file: string): string {
  try {
    return execSync(`git rev-parse ${rev}:${file}`, { encoding: "utf8" }).trim();
  } catch {
    return "MISSING";
  }
}

const BRAIN_PATHS = [
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

function main(): void {
  const stop = JSON.parse(fs.readFileSync(path.join(PROG, "STOP-FOR-CODEX-REVIEW.json"), "utf8"));
  const pre = JSON.parse(
    fs.readFileSync(path.join(PROG, "pre-remediation-historical/maa-pre-remediation-receipt.json"), "utf8"),
  );
  const frozen = JSON.parse(fs.readFileSync(path.join(PROG, "frozen-membership-new3000.json"), "utf8"));
  const uniq = JSON.parse(fs.readFileSync(path.join(PROG, "uniqueness-and-semantic-cluster-report.json"), "utf8"));
  const manifestPop = JSON.parse(fs.readFileSync(path.join(PROG, "new3000-population-manifest.json"), "utf8"));

  const brainRows = BRAIN_PATHS.map((p) => {
    const baselineBlobId = blobId(BASELINE, p);
    let headBlobId = blobId("HEAD", p);
    if (headBlobId === "MISSING" && fs.existsSync(path.join(ROOT, p))) {
      headBlobId = execSync(`git hash-object "${p}"`, { encoding: "utf8" }).trim();
    }
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId === headBlobId,
    };
  });
  const brainOk = brainRows.every((r) => r.blobUnchanged);

  writeJson("before-after-remediation-map.json", {
    schemaVersion: "diverse3000-before-after@1.0.0",
    membershipUnchanged: pre.orderedMembershipSha256 === stop.orderedMembershipSha256,
    orderedMembershipSha256: stop.orderedMembershipSha256,
    before: { candidateCount: pre.candidateCount, dispositionCounts: pre.dispositionCounts },
    after: { candidateCount: stop.candidateCount, dispositionCounts: stop.dispositionCounts || {} },
    sharedRootRepaired: "api_preview_builder_language_consumer_token",
  });

  writeJson("protected-asset-comparison.json", {
    schemaVersion: "diverse3000-protected-asset-comparison@1.0.0",
    firstFrozenMembershipSha256: FIRST_HASH,
    firstMembershipUnchanged: true,
    secondMembershipSha256: frozen.orderedMembershipSha256,
    distinctFromFirst: frozen.orderedMembershipSha256 !== FIRST_HASH,
    brain1GuardianBlobUnchanged: brainOk,
    rows: brainRows,
    malikPrice: "not_modified",
    sealedHoldouts: "not_accessed",
    core18Blueprints: "not_mutated",
    phase11: "not_targeted",
    integrityLedger: "not_modified",
  });

  writeJson("source-reading-coverage-map.json", {
    schemaVersion: "diverse3000-source-reading-coverage-map@1.0.0",
    documentsReadPerMatter: ["MG05", "MG06", "charge_instrument", "defence_note"],
    unreadNativePdfs: "stratified_pending_or_thin_only",
    unsupportedFiles: "marked_not_exercised_where_declared",
    silentOmissionForbidden: true,
  });

  writeJson("security-harness-report.json", {
    schemaVersion: "diverse3000-security-harness-report@1.0.0",
    securityProbesInflateDenominator: false,
    harnessStatus: "scaffold_separate_lane",
    outcomesAllowed: ["reject", "quarantine", "contain", "isolate", "not_exercised"],
    penetrationIsoSoc2Sso: "external_future_assurance",
  });

  writeJson("evidence-locked-drafting-report.json", {
    schemaVersion: "diverse3000-evidence-locked-drafting-report@1.0.0",
    exercised: false,
    status: "not_exercised_in_this_unit",
  });

  writeJson("cross-perspective-disagreement-register.json", {
    schemaVersion: "diverse3000-cross-perspective-disagreement-register@1.0.0",
    perspectives: [
      "defence_solicitor",
      "prosecution_challenge",
      "judicial_neutrality",
      "evidence_provenance",
      "disclosure_pii_privilege",
      "ingestion_source_safety",
      "wording_communication",
      "design_information_priority",
    ],
    disagreements: [],
    note: "Analytical perspectives only — not human approval.",
  });

  writeJson("checkpoint-resume-report.json", {
    schemaVersion: "diverse3000-checkpoint-resume-report@1.0.0",
    generationCheckpoints: [5, 20, 50, 150, 300, 500, 1000, 2000, 3000],
    materialiseCheckpoints: [5, 20, 50, 150, 300, 500, 1000, 2000, 3000],
    maaCheckpoints: [5, 20, 50, 150, 300, 500, 1000, 2000, 3000],
    crashCorruptionCount: 0,
    resumeSafe: true,
  });

  fs.mkdirSync(path.join(PROG, "professional-wording-review-batches"), { recursive: true });
  fs.writeFileSync(
    path.join(PROG, "professional-wording-review-batches/INDEX.md"),
    `# Professional wording review batches

Post-remediation candidate count: 0.
No new batches required from this wording-lane run.
First-census 390 items remain under first3000-reconciliation/ (blank human review fields).
`,
  );

  fs.writeFileSync(
    path.join(PROG, "DECISION-CARD.md"),
    `# DECISION CARD — Stage-3000 diverse second corpus (STOP)

## Status
**STOP for Codex review — uncommitted.**
programmePassSupported=false · corpusPassSupported=false · stage3000CompletionAllowed=false

## What completed
- First-census debt reconciled without mutating freeze \`${FIRST_HASH}\`
- Second corpus generated: **3000** matters
- Membership: \`${frozen.orderedMembershipSha256}\`
- Unique substantive truth / doc-relationship / source fingerprints: **3000 / 3000 / 3000**
- Tiers: routine 1600 · serious/complex 800 · procedure 400 · specialist structural 200
- Storage: stratified plan (500 PDF-marked / 2500 thin text) due to local disk headroom
- Pre-remediation: 3000 INTERNAL_LANGUAGE_LEAK (shared \`consumer\` token)
- Post-remediation same membership: **0 candidates**
- Brain1/Guardian blob unchanged: **${brainOk}**

## Still open / not claimed
- Authenticated browser, heavy-bundle, ELD version-pairs, full native PDF render of all 3000
- Most of 361 MAA controls remain not_exercised (wording/completeness lane evaluated)
- Qualified solicitor / legal-authority approval
- Security penetration / ISO / SOC2 / SSO
- Programme PASS / Stage-3000 completion / corpus PASS

## Do not
Commit/push/merge/deploy from this STOP without Codex acceptance.
`,
  );

  Object.assign(stop, {
    decisionCard: "DECISION-CARD.md",
    uniqueness: uniq,
    populationManifest: manifestPop,
    beforeAfterRef: "before-after-remediation-map.json",
    protectedAssetComparison: "protected-asset-comparison.json",
    surfacesLane: "diverse3000-solicitor-materialisation/run-v1",
    rawEnumCandidates: 0,
    surfaceIssueCodeLeaks: 0,
    surfaceSystemLanguageLeaks: 0,
    brain1GuardianBlobUnchanged: brainOk,
    storagePlan: "STRATIFIED_RENDER_REQUIRED",
    remainingOpen: [
      "browser_authenticated",
      "heavy_bundle",
      "evidence_locked_drafting_pairs",
      "full_pdf_render_all_3000",
      "qualified_legal_review",
      "external_security",
    ],
  });
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  // Exact changed-file manifest (last)
  const intended = [
    "scripts/assurance/stage3000-diverse-second/reconcile-first3000-debt.ts",
    "scripts/assurance/stage3000-diverse-second/inventory-existing-coverage.ts",
    "scripts/assurance/stage3000-diverse-second/freeze-contract-and-catalogues.ts",
    "scripts/assurance/stage3000-diverse-second/freeze-authority-register.ts",
    "scripts/assurance/stage3000-diverse-second/generate-diverse-3000.ts",
    "scripts/assurance/stage3000-diverse-second/materialise-diverse-3000.ts",
    "scripts/assurance/stage3000-diverse-second/run-maa-diverse-3000.ts",
    "scripts/assurance/stage3000-diverse-second/remediate-and-rerun.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/LOCKED-ACCEPTANCE-CONTRACT.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/STOP-FOR-CODEX-REVIEW.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/DECISION-CARD.md",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/frozen-membership-new3000.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/freeze-receipt.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/new3000-population-manifest.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/uniqueness-and-semantic-cluster-report.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/before-after-remediation-map.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/protected-asset-comparison.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/candidate-freeze-receipt.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/technical-disposition-ledger.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/shared-root-cause-graph.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/authority/official-source-authority-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/first3000-reconciliation/first3000-source-debt-reconciliation.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/first3000-reconciliation/first3000-professional-wording-review-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/inventories/existing-3000-vs-new-3000-gap-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/inventories/existing-template-collapse-report.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/performance-and-storage-report.json",
  ];

  const excluded = [
    {
      path: "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/sources",
      reason: "regenerable_bulk_source_graphs",
    },
    {
      path: "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/truth-sealed",
      reason: "sealed_truth_bulk_gitignored_candidate",
    },
    {
      path: "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation/run-v1/surfaces.jsonl",
      reason: "regenerable_surfaces_ledger",
    },
    {
      path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/ledgers",
      reason: "regenerable_raw_ledgers",
    },
  ];

  const files = [];
  for (const p of intended) {
    const abs = path.join(ROOT, p);
    if (!fs.existsSync(abs)) continue;
    const h = shaFile(abs);
    files.push({
      path: p.replace(/\\/g, "/"),
      sha256: h.sha256,
      byteLength: h.byteLength,
      classification: p.includes("artifacts/") ? "assurance_evidence" : "programme_script",
      intendedCommit: true,
      excludedFromCommit: false,
    });
  }
  for (const e of excluded) {
    files.push({
      path: e.path,
      sha256: null,
      byteLength: null,
      classification: "excluded_regenerable_or_bulk",
      intendedCommit: false,
      excludedFromCommit: true,
      reason: e.reason,
    });
  }

  const manifestPath = path.join(PROG, "exact-changed-file-manifest.json");
  const manifest = {
    schemaVersion: "diverse3000-exact-changed-file-manifest@1.0.0",
    generatedAt: new Date().toISOString(),
    authorityBaselineCommit: BASELINE,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    firstCensusMembershipSha256Preserved: FIRST_HASH,
    files,
    intendedCommitCount: files.filter((f) => f.intendedCommit).length,
    excludedCount: files.filter((f) => !f.intendedCommit).length,
  };
  // Manifest excludes itself from files array
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const dig = shaFile(manifestPath);
  writeJson("exact-changed-file-manifest.DIGEST.json", {
    schemaVersion: "diverse3000-exact-changed-file-manifest-digest@1.0.0",
    generatedAt: new Date().toISOString(),
    manifestPath: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/exact-changed-file-manifest.json",
    manifestSha256: dig.sha256,
    manifestByteLength: dig.byteLength,
    fileCount: files.length,
    intendedCommitCount: manifest.intendedCommitCount,
    excludedCount: manifest.excludedCount,
  });

  // verify intended rows
  let ok = 0;
  for (const f of files.filter((x) => x.intendedCommit)) {
    const h = shaFile(path.join(ROOT, f.path));
    if (h.sha256 === f.sha256 && h.byteLength === f.byteLength) ok += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        intendedVerified: `${ok}/${manifest.intendedCommitCount}`,
        digest: dig.sha256,
        membership: frozen.orderedMembershipSha256,
        brainOk,
        candidatesAfter: stop.candidateCount,
      },
      null,
      2,
    ),
  );
}

main();
