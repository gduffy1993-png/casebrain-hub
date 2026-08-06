/**
 * Additive V2.1.2 Codex acceptance correction + commit-scope manifest.
 * Does not mutate V2.1.2 ledgers, membership, freeze, truth, STOP, decision, or prior exact-manifest.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const AR = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution",
);
const CHILD = path.join(AR, "realistic-child-v2.1.2");
const REL_AR =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution";
const REL_CHILD = `${REL_AR}/realistic-child-v2.1.2`;

function sha256(body: Buffer | string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function writeJsonAtomic(abs: string, data: unknown): void {
  const body = `${JSON.stringify(data, null, 2)}\n`;
  const tmp = `${abs}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, abs);
}

function writeTextAtomic(abs: string, body: string): void {
  const tmp = `${abs}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body, "utf8");
  fs.renameSync(tmp, abs);
}

function isTrackedClean(rel: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch -- "${rel}"`, {
      cwd: ROOT,
      stdio: "pipe",
    });
  } catch {
    return false;
  }
  const diff = execSync(`git diff --name-only HEAD -- "${rel}"`, {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  return diff.length === 0;
}

type FileEntry = {
  path: string;
  sha256: string;
  byteLength: number;
  classification: string;
  intendedCommit: boolean;
};

function entry(rel: string, classification: string, intendedCommit: boolean): FileEntry {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`MISSING:${rel}`);
  const body = fs.readFileSync(abs);
  return {
    path: rel.replace(/\\/g, "/"),
    sha256: sha256(body),
    byteLength: body.length,
    classification,
    intendedCommit,
  };
}

function validateEntries(
  files: Array<{ path: string; sha256: string; byteLength: number }>,
): { missing: string[]; mismatches: string[]; ok: boolean } {
  const missing: string[] = [];
  const mismatches: string[] = [];
  for (const f of files) {
    const abs = path.join(ROOT, f.path);
    if (!fs.existsSync(abs)) {
      missing.push(f.path);
      continue;
    }
    const body = fs.readFileSync(abs);
    const actual = sha256(body);
    if (actual !== f.sha256 || body.length !== f.byteLength) {
      mismatches.push(
        `${f.path}: claimed=${f.sha256}/${f.byteLength} actual=${actual}/${body.length}`,
      );
    }
  }
  return { missing, mismatches, ok: missing.length === 0 && mismatches.length === 0 };
}

const priorManifest = JSON.parse(
  fs.readFileSync(path.join(CHILD, "exact-manifest.json"), "utf8"),
) as {
  files: Array<{
    path: string;
    sha256: string;
    byteLength: number;
    classification: string;
  }>;
};
const priorValidation = validateEntries(priorManifest.files);
if (!priorValidation.ok) {
  throw new Error(`PRIOR_MANIFEST_INVALID:${JSON.stringify(priorValidation)}`);
}

const controlAccounting = JSON.parse(
  fs.readFileSync(path.join(CHILD, "control-receipt-accounting.json"), "utf8"),
);
const auditAccounting = JSON.parse(fs.readFileSync(path.join(CHILD, "audit-accounting.json"), "utf8"));
const pdfAccounting = JSON.parse(fs.readFileSync(path.join(CHILD, "pdf-accounting.json"), "utf8"));
const membershipHash = JSON.parse(
  fs.readFileSync(path.join(CHILD, "ordered-child-membership-hash.json"), "utf8"),
);
const gap = JSON.parse(fs.readFileSync(path.join(CHILD, "control-gap-register-361.json"), "utf8"));
const honesty = JSON.parse(fs.readFileSync(path.join(AR, "V2.1.2-PRODUCTION-VS-HARNESS-HONESTY.json"), "utf8"));

const exercised = Number(controlAccounting.uniqueControlIds);
const registry = Number(controlAccounting.registryDenominator);
const openControls = Number(gap.gapRowCount);
if (exercised !== 17 || registry !== 361 || openControls !== 344) {
  throw new Error(`CONTROL_COUNTS_UNEXPECTED:${exercised}/${registry}/${openControls}`);
}
if (Number(controlAccounting.totalRows) !== 51000) {
  throw new Error(`CONTROL_ROWS_UNEXPECTED:${controlAccounting.totalRows}`);
}
if (Number(auditAccounting.wordingQualityFindings) !== 1709736) {
  throw new Error(`WORDING_COUNT_UNEXPECTED:${auditAccounting.wordingQualityFindings}`);
}
if (Number(auditAccounting.notExercised) !== 1032000) {
  throw new Error(`NOT_EXERCISED_UNEXPECTED:${auditAccounting.notExercised}`);
}
if (
  Number(pdfAccounting.registerRows) !== 24 ||
  Number(pdfAccounting.sourcePdfCopies) !== 24 ||
  Number(pdfAccounting.genuineOutputPdfBytes) !== 0
) {
  throw new Error(`PDF_ACCOUNTING_UNEXPECTED:${JSON.stringify(pdfAccounting)}`);
}
if (
  Number(membershipHash.acceptedCount) !== 3000 ||
  Number(membershipHash.uniqueSourceHashes) !== 2583 ||
  Number(membershipHash.uniqueOutputHashes) !== 3000 ||
  membershipHash.semanticMembershipSha256 !==
    "46e823af53ab0e479263c0378d29e7cd6ab463c23ecbc832be388bbd3c2925fa" ||
  membershipHash.exactMembershipFileSha256 !==
    "0ef862e2eacf117407024300351edfc368019b93c16053e3156f21f1c05761f2"
) {
  throw new Error(`MEMBERSHIP_UNEXPECTED:${JSON.stringify(membershipHash)}`);
}
if (fs.existsSync(path.join(CHILD, "run.lock"))) {
  throw new Error("RUN_LOCK_STILL_PRESENT");
}

const correctionRel = `${REL_CHILD}/CODEX-V2.1.2-ACCEPTANCE-CORRECTION.json`;
const correctionMdRel = `${REL_CHILD}/CODEX-V2.1.2-ACCEPTANCE-CORRECTION.md`;

const correction = {
  schemaVersion: "stage3000-v2.1.2-codex-acceptance-correction@1.0.0",
  classification:
    "REALISTIC_CHILD_V2_1_2__CLEAN_SINGLE_WRITER_EXECUTION_ACCEPTED_SUBJECT_TO_ADDITIVE_REPORTING_CORRECTION",
  mutatesExistingV212Evidence: false,
  cleanSingleWriterExecutionEvidenceAccepted: true,
  fullProductOrProgrammePassAccepted: false,
  controlExercise: {
    exercisedControls: 17,
    registryDenominator: 361,
    exercisedOverRegistry: "17/361",
    allNamedControlReceiptsPartiallyExercised: true,
    namedControlReceiptRows: 51000,
    fullyExercisedControls: 0,
    openControlsRemaining: 344,
    uniqueControlIds: controlAccounting.uniqueControlIdList,
  },
  candidateZeroScope:
    "Zero genuine candidates applies only to the 17 exercised detector controls. It is not a global zero-defect claim across the full 361-control registry.",
  wordingQualityOccurrences: {
    count: 1709736,
    status: "unreviewed",
    classifiedAsConfirmedDefects: false,
  },
  notExercisedOccurrences: 1032000,
  pdf: {
    registerRows: 24,
    uniqueSourcePdfCopies: 24,
    sourceCopiesOnly: true,
    genuineOutputPdfBytes: 0,
    genuineOutputPdf: "not_exercised",
    browser: "not_exercised",
  },
  openProductGap: {
    id: "PG-EVS-LIVE-PAYLOAD",
    status: "open",
    source: "V2.1.2-PRODUCTION-VS-HARNESS-HONESTY.json",
    summary: honesty.openProductGap?.summary || null,
  },
  membershipHonesty: {
    caseCount: 3000,
    uniqueSourcePackHashes: 2583,
    uniqueOutputHashes: 3000,
    conflicts: 0,
    postFreezeDeduplication: false,
    semanticMembershipSha256: membershipHash.semanticMembershipSha256,
    exactMembershipFileSha256: membershipHash.exactMembershipFileSha256,
  },
  notAcceptedAs: [
    "corpus_PASS",
    "stage3000_completion",
    "programme_PASS",
    "solicitor_approval",
    "global_zero_defects",
    "merge",
    "deploy",
  ],
  recordedAt: "2026-08-06T20:05:00.000Z",
};

writeJsonAtomic(path.join(ROOT, correctionRel), correction);

const correctionMd = `# Codex V2.1.2 Acceptance Correction

## Verdict

Clean single-writer V2.1.2 execution evidence is **accepted**.

This is **not** accepted as a full product or programme PASS.

## Control exercise

- Exercised controls: **17 / 361**
- All **51,000** named-control receipts are \`partially_exercised\`
- Fully exercised controls: **0**
- Controls remaining open: **344**
- \`17 + 344 = 361\` with zero overlap

## Candidate ledger scope

Zero genuine candidates applies **only** to the **17 exercised detector controls**.
It is not a global zero-defect claim across the full registry.

## Occurrence honesty

- Wording-quality occurrences: **1,709,736**
- Wording-quality occurrences remain **unreviewed** and are **not confirmed defects**
- \`not_exercised\` occurrences: **1,032,000**

## PDF / browser

- PDF evidence: **24** unique source-PDF copies only
- Genuine output PDF: \`not_exercised\`
- Authenticated browser: \`not_exercised\`

## Open product gap

- \`PG-EVS-LIVE-PAYLOAD\` remains **open**

## Membership honesty

- 3,000 matters
- 2,583 unique source-pack hashes
- 3,000 unique outputs

## Explicit non-claims

No corpus PASS, Stage-3000 completion, programme PASS, solicitor approval, or global zero-defect claim is made by this correction.
`;

writeTextAtomic(path.join(ROOT, correctionMdRel), correctionMd);

const files: FileEntry[] = [];
const seen = new Set<string>();
const add = (rel: string, classification: string, intendedCommit: boolean) => {
  const normalized = rel.replace(/\\/g, "/");
  if (seen.has(normalized)) return;
  seen.add(normalized);
  files.push(entry(normalized, classification, intendedCommit));
};

for (const f of priorManifest.files) {
  // Already-clean HEAD files stay in the identity set but are not re-committed.
  const intendedCommit = !isTrackedClean(f.path);
  add(f.path, f.classification || "reviewed_prior", intendedCommit);
}

const additive: Array<[string, string]> = [
  [`${REL_CHILD}/programme-start.json`, "programme_start"],
  [`${REL_CHILD}/single-process-preflight.json`, "single_process_preflight"],
  [`${REL_CHILD}/checkpoint-20.json`, "checkpoint"],
  [`${REL_CHILD}/checkpoint-50.json`, "checkpoint"],
  [`${REL_CHILD}/checkpoint-150.json`, "checkpoint"],
  [`${REL_CHILD}/checkpoint-300.json`, "checkpoint"],
  [`${REL_CHILD}/checkpoint-1000.json`, "checkpoint"],
  [`${REL_CHILD}/checkpoint-3000.json`, "checkpoint"],
  [`${REL_CHILD}/checkpoint-receipts.jsonl`, "checkpoint_receipts"],
  [`${REL_CHILD}/control-gap-register-361.json`, "control_gap"],
  [`${REL_AR}/V2.1.1-RACE-TAINTED-HISTORICAL.json`, "v211_race_tainted_historical"],
  [correctionRel, "codex_acceptance_correction"],
  [correctionMdRel, "codex_acceptance_correction_md"],
  [`${REL_CHILD}/exact-manifest.json`, "prior_exact_manifest"],
  [`${REL_CHILD}/exact-manifest-digest.json`, "prior_exact_manifest_digest"],
];

for (const [rel, cls] of additive) {
  const intendedCommit = !isTrackedClean(rel);
  add(rel, cls, intendedCommit);
}

const validation = validateEntries(files);
if (!validation.ok) {
  throw new Error(`ACCEPTANCE_MANIFEST_VALIDATION_FAILED:${JSON.stringify(validation)}`);
}

const wildcardPaths = files.filter((f) => /[*?[\]{}]/.test(f.path));
if (wildcardPaths.length > 0) {
  throw new Error(`WILDCARD_PATHS_FORBIDDEN:${wildcardPaths.map((f) => f.path).join(",")}`);
}

const acceptanceManifestRel = `${REL_CHILD}/CODEX-V2.1.2-ACCEPTANCE-COMMIT-SCOPE-MANIFEST.json`;
const acceptanceDigestRel = `${REL_CHILD}/CODEX-V2.1.2-ACCEPTANCE-COMMIT-SCOPE-MANIFEST-DIGEST.json`;

const acceptanceManifest = {
  schemaVersion: "stage3000-v2.1.2-codex-acceptance-commit-scope-manifest@1.0.0",
  childRoot: "realistic-child-v2.1.2",
  generatedAt: "2026-08-06T20:05:00.000Z",
  selfExcludedFromFiles: true,
  digestExcludedFromFiles: true,
  rules: [
    "literal paths only — no wildcards",
    "does not mutate V2.1.2 ledgers/membership/freeze/truth/STOP/decision/prior exact-manifest",
    "includes reviewed prior 41 paths plus acceptance additives",
    "includes existing exact-manifest.json and exact-manifest-digest.json",
    "includes V2.1.1-RACE-TAINTED-HISTORICAL.json",
    "includes both CODEX acceptance-correction files",
    "manifest and digest excluded from files[]",
    "detached digest hashes final manifest bytes",
    "intendedCommit marks commit scope; false means already clean at HEAD",
  ],
  priorExactManifestPath: `${REL_CHILD}/exact-manifest.json`,
  priorExactManifestFileCount: priorManifest.files.length,
  files,
  validation: {
    missing: validation.missing.length,
    extra: 0,
    mismatches: validation.mismatches.length,
    missingPaths: validation.missing,
    mismatchDetails: validation.mismatches,
    wildcardPaths: 0,
    ok: validation.ok,
  },
  intendedCommitCount: files.filter((f) => f.intendedCommit).length,
  referenceOnlyCount: files.filter((f) => !f.intendedCommit).length,
};

writeJsonAtomic(path.join(ROOT, acceptanceManifestRel), acceptanceManifest);
const manifestBody = fs.readFileSync(path.join(ROOT, acceptanceManifestRel));
const revalidation = validateEntries(files);
if (!revalidation.ok) {
  throw new Error(`ACCEPTANCE_MANIFEST_REVALIDATION_FAILED:${JSON.stringify(revalidation)}`);
}

const digest = {
  schemaVersion: "stage3000-v2.1.2-codex-acceptance-commit-scope-manifest-digest@1.0.0",
  manifestPath: acceptanceManifestRel,
  manifestSha256: sha256(manifestBody),
  manifestByteLength: manifestBody.length,
  fileCount: files.length,
  intendedCommitCount: files.filter((f) => f.intendedCommit).length,
  validation: {
    missing: 0,
    extra: 0,
    mismatches: 0,
    wildcardPaths: 0,
    ok: true,
  },
  evidenceModifiedAfterDigest: false,
  note: "Digest hashes CODEX-V2.1.2-ACCEPTANCE-COMMIT-SCOPE-MANIFEST.json bytes after write. Manifest files[] excludes itself and this digest.",
};
writeJsonAtomic(path.join(ROOT, acceptanceDigestRel), digest);

console.log(
  JSON.stringify(
    {
      correctionPath: correctionRel,
      correctionMdPath: correctionMdRel,
      acceptanceManifestPath: acceptanceManifestRel,
      acceptanceDigestPath: acceptanceDigestRel,
      fileCount: files.length,
      priorFileCount: priorManifest.files.length,
      intendedCommitCount: files.filter((f) => f.intendedCommit).length,
      referenceOnlyCount: files.filter((f) => !f.intendedCommit).length,
      validationOk: true,
      manifestSha256: digest.manifestSha256,
    },
    null,
    2,
  ),
);
