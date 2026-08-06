/**
 * Base-vs-branch Brain 1 / Guardian / classification immutability audit.
 *
 * Methodology (corrected): compare Git blob IDs via `git rev-parse <ref>:<path>`
 * for origin/master vs HEAD. Never compare working-tree bytes (line-ending false positives).
 *
 * Run: npx tsx scripts/integrity-programme/brain1-guardian-classification-immutability-audit.ts
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const BASE = "origin/master";
const HEAD = "HEAD";
const OUT_ARG = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length);
const OUT = path.resolve(
  ROOT,
  OUT_ARG ||
    "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-v4/brain1-guardian-classification-immutability-audit.json",
);

const BRAIN1_FILES = [
  "lib/criminal/strategy-fight-engine.ts",
  "lib/criminal/strategy-fight-engine-generators.ts",
  "lib/criminal/get-aggressive-defense.ts",
  "lib/criminal/strategy-battleboard.ts",
  "lib/criminal/strategy-routes.ts",
  "lib/criminal/bundle-truth-ledger.ts",
  "lib/criminal/bundle-material-normalizer.ts",
] as const;

const GUARDIAN_FILES = [
  "lib/criminal/source-truth-guardian/fingerprint.ts",
  "lib/criminal/source-truth-guardian/guardian.ts",
  "lib/criminal/source-truth-guardian/index.ts",
  "lib/criminal/source-truth-guardian/types.ts",
] as const;

const CLASSIFICATION_FILES = [
  "lib/criminal/offence-family-concept-registry/classify.ts",
  "lib/criminal/offence-family-concept-registry/index.ts",
  "lib/criminal/offence-family-concept-registry/schema.ts",
  "lib/criminal/solicitor-offence-family.ts",
] as const;

const BRAIN1_GUARDIAN_SOURCE_TRUTH_IMPORT_RES = [
  /@\/lib\/criminal\/strategy-fight-engine/,
  /@\/lib\/criminal\/strategy-fight-engine-generators/,
  /@\/lib\/criminal\/get-aggressive-defense/,
  /@\/lib\/criminal\/strategy-battleboard/,
  /@\/lib\/criminal\/strategy-routes/,
  /@\/lib\/criminal\/bundle-truth-ledger/,
  /@\/lib\/criminal\/bundle-material-normalizer/,
  /@\/lib\/criminal\/source-truth-guardian/,
  /from ["'].*strategy-fight-engine/,
  /from ["'].*get-aggressive-defense/,
  /from ["'].*strategy-battleboard/,
  /from ["'].*bundle-truth-ledger/,
  /from ["'].*source-truth-guardian/,
];

const WRITE_PATH_RES = [
  /\bfs\.(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\b/,
  /\bwriteFileSync\b/,
  /\bappendFileSync\b/,
];

function sh(cmd: string): string {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
}

/** Git blob object ID for ref:path, or null if path absent on ref. */
function gitBlobId(ref: string, file: string): string | null {
  try {
    return sh(`git rev-parse ${ref}:${file}`);
  } catch {
    return null;
  }
}

type BlobRow = {
  file: string;
  baseBlobId: string | null;
  headBlobId: string | null;
  status: "identical" | "DIFFERS" | "added_on_branch" | "deleted_on_branch" | "absent_both";
};

function compareBlobSets(
  files: readonly string[],
  opts?: { treatAbsentOnBaseAsAdded?: boolean },
): {
  files: number;
  identical: number;
  different: number;
  addedOnBranch: number;
  rows: BlobRow[];
} {
  const rows: BlobRow[] = [];
  let identical = 0;
  let different = 0;
  let addedOnBranch = 0;
  for (const file of files) {
    const baseBlobId = gitBlobId(BASE, file);
    const headBlobId = gitBlobId(HEAD, file);
    let status: BlobRow["status"];
    if (baseBlobId && headBlobId && baseBlobId === headBlobId) {
      status = "identical";
      identical += 1;
    } else if (baseBlobId && headBlobId && baseBlobId !== headBlobId) {
      status = "DIFFERS";
      different += 1;
    } else if (!baseBlobId && headBlobId) {
      status = "added_on_branch";
      addedOnBranch += 1;
    } else if (baseBlobId && !headBlobId) {
      status = "deleted_on_branch";
      different += 1;
    } else {
      status = "absent_both";
      different += 1;
    }
    if (opts?.treatAbsentOnBaseAsAdded && status === "added_on_branch") {
      /* counted above */
    }
    rows.push({ file, baseBlobId, headBlobId, status });
  }
  return { files: files.length, identical, different, addedOnBranch, rows };
}

function scanClassificationNoBrain1WritePath(): {
  ok: boolean;
  filesScanned: string[];
  brain1GuardianImportHits: Array<{ file: string; match: string }>;
  writePathHits: Array<{ file: string; match: string }>;
} {
  const brain1GuardianImportHits: Array<{ file: string; match: string }> = [];
  const writePathHits: Array<{ file: string; match: string }> = [];
  for (const file of CLASSIFICATION_FILES) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    for (const re of BRAIN1_GUARDIAN_SOURCE_TRUTH_IMPORT_RES) {
      const m = text.match(re);
      if (m) brain1GuardianImportHits.push({ file, match: m[0]! });
    }
    for (const re of WRITE_PATH_RES) {
      const m = text.match(re);
      if (m) writePathHits.push({ file, match: m[0]! });
    }
  }
  return {
    ok: brain1GuardianImportHits.length === 0 && writePathHits.length === 0,
    filesScanned: [...CLASSIFICATION_FILES],
    brain1GuardianImportHits,
    writePathHits,
  };
}

const nameStatusBrain1 = sh(`git diff --name-status ${BASE} ${HEAD} -- ${BRAIN1_FILES.join(" ")}`);
const nameStatusGuardian = sh(
  `git diff --name-status ${BASE} ${HEAD} -- lib/criminal/source-truth-guardian`,
);
const nameStatusClassification = sh(
  `git diff --name-status ${BASE} ${HEAD} -- lib/criminal/offence-family-concept-registry lib/criminal/solicitor-offence-family.ts`,
);

const brain1 = compareBlobSets(BRAIN1_FILES);
const guardian = compareBlobSets(GUARDIAN_FILES);
const classification = compareBlobSets(CLASSIFICATION_FILES, { treatAbsentOnBaseAsAdded: true });
const classificationIsolation = scanClassificationNoBrain1WritePath();

const dirtyCoreVsHead = sh(
  [
    "git diff --name-only HEAD --",
    ...BRAIN1_FILES,
    ...GUARDIAN_FILES,
    ...CLASSIFICATION_FILES,
  ].join(" "),
);

const expectations = {
  brain1: { identical: 7, different: 0 },
  guardian: { identical: 4, different: 0 },
  classification: {
    addedOnBranch: 4,
    different: 0,
    note: "Downstream additions on the programme branch — not Brain 1 mutations.",
  },
};

const expectationsMet =
  brain1.identical === 7 &&
  brain1.different === 0 &&
  guardian.identical === 4 &&
  guardian.different === 0 &&
  classification.addedOnBranch === 4 &&
  classification.different === 0 &&
  classificationIsolation.ok &&
  !dirtyCoreVsHead;

const report = {
  audit: "brain1-guardian-classification-immutability",
  methodology:
    "Git blob ID comparison via git rev-parse <ref>:<path> for origin/master vs HEAD. Working-tree bytes are not used (avoids CRLF/LF false positives).",
  base: BASE,
  head: HEAD,
  headBranch: sh("git rev-parse --abbrev-ref HEAD"),
  headSha: sh("git rev-parse HEAD"),
  baseSha: sh(`git rev-parse ${BASE}`),
  expectations,
  brain1: {
    ...brain1,
    gitDiffNameStatus: nameStatusBrain1 || "(empty — no Brain 1 path changes)",
    verdict: brain1.identical === 7 && brain1.different === 0 ? "IMMUTABLE" : "MUTATED",
  },
  guardian: {
    ...guardian,
    gitDiffNameStatus: nameStatusGuardian || "(empty — no Guardian path changes)",
    verdict: guardian.identical === 4 && guardian.different === 0 ? "IMMUTABLE" : "MUTATED",
  },
  classification: {
    ...classification,
    gitDiffNameStatus: nameStatusClassification || "(empty)",
    disposition: "downstream_branch_additions_not_brain1_mutations",
    verdict:
      classification.addedOnBranch === 4 && classification.different === 0
        ? "ADDED_ON_BRANCH_OK"
        : "UNEXPECTED",
  },
  classificationIsolationFromBrain1Guardian: classificationIsolation,
  preCommitGate: {
    dirtyCoreFilesVsHead: dirtyCoreVsHead ? dirtyCoreVsHead.split(/\n/).filter(Boolean) : [],
    thisUncommittedWorkMutatedCore: Boolean(dirtyCoreVsHead),
    result: dirtyCoreVsHead ? "FAIL" : "PASS_NO_CORE_DIRTY_VS_HEAD",
  },
  expectationsMet,
  programmePassSupported: false,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify(report, null, 2));

if (!expectationsMet) {
  process.exitCode = 1;
}
