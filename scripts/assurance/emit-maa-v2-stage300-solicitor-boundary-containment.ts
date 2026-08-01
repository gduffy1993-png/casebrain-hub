/**
 * Emit Stage-300 solicitor-boundary containment (same frozen 300).
 *
 * Usage:
 *   npx tsx scripts/assurance/emit-maa-v2-stage300-solicitor-boundary-containment.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import {
  ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT,
  runSolicitorBoundaryContainmentPipeline,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/calibration-v2/pipeline-solicitor-boundary-containment";

const ROOT = process.cwd();

function sha256File(abs: string): { path: string; sha256: string; byteLength: number } {
  const buf = fs.readFileSync(abs);
  return {
    path: path.relative(ROOT, abs).replace(/\\/g, "/"),
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    byteLength: buf.length,
  };
}

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listFilesRecursive(abs));
    else out.push(abs);
  }
  return out;
}

function writeChangedFileManifest(): void {
  const sourceFiles = [
    "lib/criminal/solicitor-visible-matter-reference.ts",
    "lib/criminal/supervisor-raw-source-containment.ts",
    "lib/criminal/export-pack/build-export-pack.ts",
    "lib/criminal/build-from-document-units.ts",
    "lib/criminal/solicitor-visible-sanitization.ts",
    "lib/criminal/canonical-live-surface-adapter.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/new150/audience-packs-from-surfaces.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/essential/constants.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/essential/solicitor-visible-inventory.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/essential/inputs/load-essential-inputs.ts",
    "lib/eval/master-assurance-auditor/v2/stage300/calibration-v2/pipeline-solicitor-boundary-containment.ts",
    "scripts/assurance/rematerialise-maa-v2-stage300-shared-root-fix.ts",
    "scripts/maa-v2-solicitor-boundary-containment-contracts.test.ts",
    "scripts/assurance/emit-maa-v2-stage300-solicitor-boundary-containment.ts",
  ];
  const files = [
    ...sourceFiles.filter((f) => fs.existsSync(path.join(ROOT, f))).map((f) => sha256File(path.join(ROOT, f))),
    ...listFilesRecursive(path.join(ROOT, ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT))
      .filter((abs) => !abs.replace(/\\/g, "/").includes("/rematerialised-outputs/"))
      .map((abs) => sha256File(abs)),
  ];
  const rematerialisedRoot = path.join(ROOT, ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT, "rematerialised-outputs");
  const rematerialisedCaseCount = fs.existsSync(rematerialisedRoot)
    ? fs.readdirSync(rematerialisedRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).length
    : 0;
  const manifest = {
    schemaVersion: "stage300-v2-solicitor-boundary-containment-changed-file-manifest@1.0.0",
    generatedAt: new Date().toISOString(),
    rematerialisedCaseCount,
    fileCount: files.length,
    files,
  };
  fs.mkdirSync(path.join(ROOT, ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT, "CHANGED-FILE-MANIFEST.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  console.log(JSON.stringify({ phase: "solicitor_boundary_contracts" }));
  execSync("npx tsx scripts/maa-v2-solicitor-boundary-containment-contracts.test.ts", {
    cwd: ROOT,
    stdio: "inherit",
  });

  console.log(JSON.stringify({ phase: "charge_completeness_contracts" }));
  execSync("npx tsx scripts/maa-v2-charge-allegation-completeness-contracts.test.ts", {
    cwd: ROOT,
    stdio: "inherit",
  });

  console.log(JSON.stringify({ phase: "rematerialise_SOLICITOR_BOUNDARY_CONTAINMENT" }));
  execSync("npx tsx scripts/assurance/rematerialise-maa-v2-stage300-shared-root-fix.ts", {
    cwd: ROOT,
    stdio: "inherit",
  });

  const result = runSolicitorBoundaryContainmentPipeline({ repoRoot: ROOT });
  console.log(JSON.stringify({ phase: "solicitor_boundary_pipeline", ...result }, null, 2));

  try {
    const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    fs.writeFileSync(
      path.join(ROOT, ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT, "worktree-head.json"),
      JSON.stringify({ head, detached: true, committed: false }, null, 2) + "\n",
      "utf8",
    );
  } catch {
    /* ignore */
  }

  writeChangedFileManifest();
  console.log(JSON.stringify({ phase: "done", out: ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
