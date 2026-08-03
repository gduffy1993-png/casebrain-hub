/**
 * Remediates shared roots only on diverse-3000 materialiser, preserves pre-fix,
 * rematerialises, re-runs MAA with --post-remediation.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const PROG = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);

function writeJson(name: string, data: unknown): void {
  fs.writeFileSync(path.join(PROG, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main(): void {
  const pre = JSON.parse(
    fs.readFileSync(path.join(PROG, "maa-pre-remediation-receipt.json"), "utf8"),
  ) as { dispositionCounts: Record<string, number>; candidateCount: number; orderedMembershipSha256: string };

  // Preserve pre-fix snapshot pointer
  const hist = path.join(PROG, "pre-remediation-historical");
  fs.mkdirSync(hist, { recursive: true });
  for (const f of [
    "maa-pre-remediation-receipt.json",
    "candidate-freeze-receipt.json",
    "technical-disposition-ledger.json",
  ]) {
    const src = path.join(PROG, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(hist, f));
  }

  // Shared-root map from pre dispositions
  writeJson("shared-root-cause-graph.json", {
    schemaVersion: "diverse3000-shared-root-cause-graph@1.0.0",
    preRemediationDispositionCounts: pre.dispositionCounts,
    roots: [
      {
        rootId: "packet_compose_wording_quality",
        ownership: "materialisation_lane_shared_compose",
        repair: "tighten preserveProtectedAcronyms usage and absolute-proof bans in materialise-diverse-3000.ts",
      },
    ],
    caseIdPatchesForbidden: true,
    truthLeakageForbidden: true,
  });

  // Rematerialise + post MAA
  execSync("npx tsx scripts/assurance/stage3000-diverse-second/materialise-diverse-3000.ts", {
    cwd: ROOT,
    stdio: "inherit",
  });
  // move previous surfaces
  const surfDir = path.join(
    ROOT,
    "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation",
  );
  const run1 = path.join(surfDir, "run-v1");
  const histSurf = path.join(surfDir, "run-v1-pre-remediation-historical");
  if (fs.existsSync(run1) && !fs.existsSync(histSurf)) {
    fs.renameSync(run1, histSurf);
    fs.mkdirSync(run1, { recursive: true });
    // rematerialise into run-v1 again
    execSync("npx tsx scripts/assurance/stage3000-diverse-second/materialise-diverse-3000.ts", {
      cwd: ROOT,
      stdio: "inherit",
    });
  }

  execSync("npx tsx scripts/assurance/stage3000-diverse-second/run-maa-diverse-3000.ts --post-remediation", {
    cwd: ROOT,
    stdio: "inherit",
  });

  const post = JSON.parse(fs.readFileSync(path.join(PROG, "STOP-FOR-CODEX-REVIEW.json"), "utf8")) as {
    dispositionCounts: Record<string, number>;
    candidateCount: number;
    orderedMembershipSha256: string;
  };

  writeJson("before-after-remediation-map.json", {
    schemaVersion: "diverse3000-before-after@1.0.0",
    membershipUnchanged: pre.orderedMembershipSha256 === post.orderedMembershipSha256,
    orderedMembershipSha256: post.orderedMembershipSha256,
    before: { candidateCount: pre.candidateCount, dispositionCounts: pre.dispositionCounts },
    after: { candidateCount: post.candidateCount, dispositionCounts: post.dispositionCounts },
  });
}

main();
