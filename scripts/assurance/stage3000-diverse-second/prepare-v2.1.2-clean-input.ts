import fs from "node:fs";
import path from "node:path";
import { atomicWriteJson, canonicalJson, sha256 } from "./v2.1.2-run-authority";

const ROOT = process.cwd();
const AR = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution",
);
const THIN = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution-thin-skeleton-historical",
);
const V2 = path.join(AR, "realistic-child-v2-pre-shared-root-remediation");
const V211 = path.join(AR, "realistic-child-v2.1.1");
const BLIND = path.join(AR, "realistic-child-v2.1.2-blind-input");
const CHILD = path.join(AR, "realistic-child-v2.1.2");

function linkFile(source: string, target: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) return;
  fs.linkSync(source, target);
}

function walk(dir: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

if (fs.existsSync(CHILD)) throw new Error(`REFUSE_EXISTING_V212_ROOT:${CHILD}`);
if (fs.existsSync(BLIND)) throw new Error(`REFUSE_EXISTING_BLIND_INPUT:${BLIND}`);

const membershipPath = path.join(THIN, "ordered-3000-membership.json");
const membership = JSON.parse(fs.readFileSync(membershipPath, "utf8"));
if (membership.accepted?.length !== 3000) {
  throw new Error(`EXPECTED_3000_MEMBERSHIP:${membership.accepted?.length}`);
}
linkFile(membershipPath, path.join(BLIND, "ordered-3000-membership.json"));

for (const row of membership.accepted as Array<{ caseId: string }>) {
  const caseId = row.caseId;
  linkFile(
    path.join(V2, "cases", caseId, "document-pack.json"),
    path.join(BLIND, "cases", caseId, "document-pack.json"),
  );
  const pdf = path.join(V2, "cases", caseId, "bundle-fictional-test.pdf");
  if (fs.existsSync(pdf)) {
    linkFile(pdf, path.join(BLIND, "cases", caseId, "bundle-fictional-test.pdf"));
  }
  for (const name of ["source-text.txt", "matter-skeleton.json"]) {
    linkFile(
      path.join(THIN, "controller-run", "source", caseId, name),
      path.join(BLIND, "controller-run", "source", caseId, name),
    );
  }
}
if (fs.existsSync(path.join(BLIND, "truth"))) {
  throw new Error("BLIND_INPUT_MUST_NOT_CONTAIN_TRUTH");
}

const v211Files = walk(V211)
  .map((absolute) => {
    const body = fs.readFileSync(absolute);
    return {
      path: path.relative(V211, absolute).replace(/\\/g, "/"),
      sha256: sha256(body),
      byteLength: body.length,
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));
const v211TreeSha256 = sha256(canonicalJson(v211Files));

atomicWriteJson(path.join(AR, "V2.1.1-RACE-TAINTED-HISTORICAL.json"), {
  schemaVersion: "stage3000-v2.1.1-race-tainted-historical@1.0.0",
  classification: "REALISTIC_CHILD_V2_1_1__RACE_TAINTED_NON_AUTHORITATIVE_HISTORICAL",
  path: "realistic-child-v2.1.1",
  preservedByteForByte: true,
  doNotRewriteOrDelete: true,
  fileCount: v211Files.length,
  treeSha256: v211TreeSha256,
});

atomicWriteJson(path.join(AR, "CHILD-ACCEPTANCE-CONTRACT-V2.1.2.json"), {
  schemaVersion: "CHILD-ACCEPTANCE-CONTRACT-diverse-second-v2.1.2@1.0.0",
  lockedParentContract: "LOCKED-ACCEPTANCE-CONTRACT.json",
  lockedParentContractMustRemainByteIdenticalToHead: true,
  childRoot: "realistic-child-v2.1.2",
  blindInputRoot: "realistic-child-v2.1.2-blind-input",
  sourcePackRoot: "realistic-child-v2-pre-shared-root-remediation",
  sourceCaseCount: 3000,
  truthPhysicallyPresentInBlindInput: false,
  oneOrchestrator: true,
  oneWriter: true,
  notAcceptedAs: [
    "corpus_PASS",
    "stage3000_completion",
    "programme_PASS",
    "solicitor_approval",
    "global_zero_defects",
  ],
});

atomicWriteJson(path.join(AR, "V2.1.2-PRODUCTION-VS-HARNESS-HONESTY.json"), {
  schemaVersion: "v2.1.2-production-vs-harness-honesty@1.0.0",
  inheritedFrom: "V2.1.1-PRODUCTION-VS-HARNESS-HONESTY.json",
  rules: [
    "Evidence-state bag normalization is corpus materialiser/harness behavior.",
    "EVS/WRD/BND changes are audit detector behavior.",
    "Freeze, lock, denominator, and manifest corrections are report/harness authority behavior.",
    "No harness-only change is promoted to a live CaseBrain product repair.",
  ],
  openProductGap: {
    id: "PG-EVS-LIVE-PAYLOAD",
    status: "open",
    summary:
      "Authenticated live CaseBrain matter payload builders remain outside this corpus-only proof.",
  },
});

console.log(
  JSON.stringify({
    blindInputCases: membership.accepted.length,
    truthPresent: fs.existsSync(path.join(BLIND, "truth")),
    v211TreeSha256,
    v211FileCount: v211Files.length,
  }),
);
