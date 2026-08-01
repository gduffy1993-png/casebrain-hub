/**
 * Exact reviewed commit-scope manifest — single batched git diff for status.
 */
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASELINE = "a831a631f3050e096b89633176f023bee2fd6a5f";
const OUT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-boundary-containment";

type Classification =
  | "production"
  | "auditor_evaluator"
  | "focused_contract"
  | "compact_receipt"
  | "emit_script"
  | "rematerialise_script";

type Entry = {
  path: string;
  sha256: string;
  byteLength: number;
  classification: Classification;
  status: "new" | "modified" | "unchanged";
};

function sha256Buf(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function directImports(rel: string): string[] {
  if (!exists(rel) || !/\.tsx?$/.test(rel)) return [];
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const out: string[] = [];
  const re = /from\s+["'](@\/[^"']+|\.\.?\/[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const spec = m[1]!;
    const next = spec.startsWith("@/")
      ? spec.slice(2)
      : path.posix.normalize(path.posix.join(path.posix.dirname(rel.replace(/\\/g, "/")), spec));
    for (const c of [next, `${next}.ts`, `${next}.tsx`, `${next}/index.ts`]) {
      if (exists(c) && /\.tsx?$/.test(c)) {
        out.push(c.replace(/\\/g, "/"));
        break;
      }
    }
  }
  return out;
}

const declared: Array<{ path: string; classification: Classification }> = [
  { path: "lib/criminal/solicitor-visible-matter-reference.ts", classification: "production" },
  { path: "lib/criminal/supervisor-raw-source-containment.ts", classification: "production" },
  { path: "lib/criminal/export-pack/build-export-pack.ts", classification: "production" },
  { path: "lib/criminal/build-from-document-units.ts", classification: "production" },
  { path: "lib/criminal/solicitor-visible-sanitization.ts", classification: "production" },
  { path: "lib/criminal/evidence-state-canonical.ts", classification: "production" },
  { path: "lib/criminal/five-answers/build-evidence-trace.ts", classification: "production" },
  { path: "lib/criminal/canonical-live-surface-adapter.ts", classification: "production" },
  { path: "lib/criminal/charge-allegation-completeness.ts", classification: "production" },
  { path: "lib/criminal/structured-solicitor-output/compose.ts", classification: "production" },
  { path: "lib/criminal/five-answers/build-five-answers-view.ts", classification: "production" },
  { path: "lib/criminal/five-answers/types.ts", classification: "production" },
  { path: "components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts", classification: "production" },
  {
    path: "lib/eval/master-assurance-auditor/v2/stage300/new150/audience-packs-from-surfaces.ts",
    classification: "auditor_evaluator",
  },
  {
    path: "lib/eval/master-assurance-auditor/v2/stage300/essential/constants.ts",
    classification: "auditor_evaluator",
  },
  {
    path: "lib/eval/master-assurance-auditor/v2/stage300/essential/solicitor-visible-inventory.ts",
    classification: "auditor_evaluator",
  },
  {
    path: "lib/eval/master-assurance-auditor/v2/stage300/essential/inputs/load-essential-inputs.ts",
    classification: "auditor_evaluator",
  },
  {
    path: "lib/eval/master-assurance-auditor/v2/stage300/calibration-v2/pipeline-solicitor-boundary-containment.ts",
    classification: "auditor_evaluator",
  },
  { path: "scripts/maa-v2-solicitor-boundary-containment-contracts.test.ts", classification: "focused_contract" },
  {
    path: "scripts/assurance/emit-maa-v2-stage300-solicitor-boundary-containment.ts",
    classification: "emit_script",
  },
  {
    path: "scripts/assurance/rematerialise-maa-v2-stage300-shared-root-fix.ts",
    classification: "rematerialise_script",
  },
  { path: "scripts/assurance/_write-boundary-containment-gates.ts", classification: "emit_script" },
  { path: "scripts/assurance/_scan-structural-boundary.ts", classification: "emit_script" },
  { path: "scripts/assurance/_write-exact-commit-scope-manifest.ts", classification: "emit_script" },
];

const compactNames = [
  "STOP-FOR-CODEX-REVIEW.json",
  "DECISION-CARD.md",
  "CHANGED-FILE-MANIFEST.json",
  // Manifest + detached digest + validation are outside files[] (self-reference / post-finalisation).
  "structural-boundary-scan.json",
  "reporting-honesty-split.json",
  "freeze-hash-verification.json",
  "brain1-guardian-blob-compare.json",
  "tsc-baseline-delta.json",
  "npm-build-receipt.txt",
  "before-after-wording-delta.json",
  "affected-case-list.json",
  "remaining-review-honesty-split.json",
  "all-exit-charge-visibility-matrix.json",
  "rematerialise-summary.json",
  "worktree-head.json",
  "finding-unit-summary.json",
];

const classify = (p: string): Classification => {
  const d = declared.find((x) => x.path === p);
  if (d) return d.classification;
  if (p.startsWith("lib/eval/")) return "auditor_evaluator";
  if (p.includes(".test.ts")) return "focused_contract";
  if (p.startsWith("scripts/")) return "emit_script";
  return "production";
};

// Gather candidate paths = declared + their direct imports.
const candidates = new Set<string>();
for (const d of declared) {
  if (!exists(d.path)) continue;
  candidates.add(d.path);
  for (const dep of directImports(d.path)) {
    if (exists(dep) && !dep.startsWith("artifacts/")) candidates.add(dep);
  }
}

const candidateList = [...candidates].sort();
console.error(`candidates=${candidateList.length}; batched baseline presence…`);

// Batch: which candidates exist in baseline?
const inBaseline = new Set<string>();
const lsTree = execSync(`git ls-tree -r --name-only ${BASELINE}`, {
  encoding: "utf8",
  cwd: ROOT,
  maxBuffer: 32 * 1024 * 1024,
})
  .split(/\r?\n/)
  .map((s) => s.trim().replace(/\\/g, "/"))
  .filter(Boolean);
const baselineSet = new Set(lsTree);
for (const p of candidateList) {
  if (baselineSet.has(p)) inBaseline.add(p);
}

console.error(`batched diff for ${candidateList.length} files…`);
// Write path list to temp file for git diff --from pathspec file
const listFile = path.join(ROOT, OUT, "_commit-scope-pathslist.txt");
fs.mkdirSync(path.dirname(listFile), { recursive: true });
fs.writeFileSync(listFile, candidateList.join("\n") + "\n", "utf8");

let modified = new Set<string>();
try {
  // Use xargs-style: git diff with explicit paths (chunked).
  const chunkSize = 40;
  for (let i = 0; i < candidateList.length; i += chunkSize) {
    const chunk = candidateList.slice(i, i + chunkSize);
    const out = execSync(
      `git -c core.longpaths=true diff --name-only ${BASELINE} -- ${chunk.map((p) => `"${p}"`).join(" ")}`,
      { encoding: "utf8", cwd: ROOT, maxBuffer: 8 * 1024 * 1024 },
    );
    for (const line of out.split(/\r?\n/)) {
      const p = line.trim().replace(/\\/g, "/");
      if (p) modified.add(p);
    }
  }
} catch (e) {
  console.error("diff chunk failed", e);
}

const include = new Map<string, Classification>();
for (const d of declared) {
  if (exists(d.path)) include.set(d.path, d.classification);
}
for (const p of candidateList) {
  const isNew = !inBaseline.has(p);
  const isMod = modified.has(p);
  if (isNew || isMod) include.set(p, classify(p));
}

const entries: Entry[] = [];
for (const [rel, classification] of [...include.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const status: Entry["status"] = !inBaseline.has(rel) ? "new" : modified.has(rel) ? "modified" : "unchanged";
  entries.push({
    path: rel,
    sha256: sha256Buf(buf),
    byteLength: buf.length,
    classification,
    status,
  });
}

for (const name of compactNames) {
  const rel = `${OUT}/${name}`;
  if (!exists(rel)) continue;
  const buf = fs.readFileSync(path.join(ROOT, rel));
  entries.push({
    path: rel,
    sha256: sha256Buf(buf),
    byteLength: buf.length,
    classification: "compact_receipt",
    status: "new",
  });
}

const included = new Set(entries.map((e) => e.path));
const dependsOnExcluded: Array<{ file: string; missingDep: string }> = [];
for (const e of entries) {
  if (e.classification === "compact_receipt") continue;
  for (const dep of directImports(e.path)) {
    if (!exists(dep) || dep.startsWith("artifacts/")) continue;
    const needed = !inBaseline.has(dep) || modified.has(dep);
    if (needed && !included.has(dep)) dependsOnExcluded.push({ file: e.path, missingDep: dep });
  }
}

// Absorb changed direct deps iteratively (closure) until stable.
for (let round = 0; round < 8; round++) {
  const pending: string[] = [];
  for (const e of entries) {
    if (e.classification === "compact_receipt") continue;
    for (const dep of directImports(e.path)) {
      if (!exists(dep) || dep.startsWith("artifacts/") || included.has(dep)) continue;
      const needed = !inBaseline.has(dep) || modified.has(dep);
      // Also pull new files not in baselineSet even if not in modified (untracked).
      if (needed || !baselineSet.has(dep)) pending.push(dep);
    }
  }
  if (pending.length === 0) break;
  for (const dep of pending) {
    if (included.has(dep) || !exists(dep)) continue;
    // Refresh modified flag for newly discovered paths via single-file diff when in baseline.
    if (baselineSet.has(dep) && !modified.has(dep)) {
      try {
        const out = execSync(`git -c core.longpaths=true diff --name-only ${BASELINE} -- "${dep}"`, {
          encoding: "utf8",
          cwd: ROOT,
        }).trim();
        if (out) modified.add(dep);
      } catch {
        /* ignore */
      }
    }
    const needed = !baselineSet.has(dep) || modified.has(dep);
    if (!needed) continue;
    const buf = fs.readFileSync(path.join(ROOT, dep));
    entries.push({
      path: dep,
      sha256: sha256Buf(buf),
      byteLength: buf.length,
      classification: classify(dep),
      status: !baselineSet.has(dep) ? "new" : "modified",
    });
    included.add(dep);
  }
}

const dependsFinal: Array<{ file: string; missingDep: string }> = [];
for (const e of entries) {
  if (e.classification === "compact_receipt") continue;
  for (const dep of directImports(e.path)) {
    if (!exists(dep) || dep.startsWith("artifacts/")) continue;
    const needed = !baselineSet.has(dep) || modified.has(dep);
    if (needed && !included.has(dep)) dependsFinal.push({ file: e.path, missingDep: dep });
  }
}

const missingDeclared = declared.filter((d) => !exists(d.path)).map((d) => d.path);
const selfPath = `${OUT}/COMMIT-SCOPE-MANIFEST-EXACT.json`;

// Exclude the manifest itself from files[] — self-hash is not claimed here.
const payloadEntries = entries
  .filter((e) => e.path !== selfPath)
  .sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  schemaVersion: "stage300-v2-solicitor-boundary-containment-commit-scope-exact@1.1.0",
  baselineCommit: BASELINE,
  generatedAt: new Date().toISOString(),
  committed: false,
  excludeRematerialisedOutputs: true,
  hashedPayloadFileCount: payloadEntries.length,
  files: payloadEntries,
  manifestSelfReference: {
    path: selfPath,
    selfHashStatus: "excluded_from_files_array_self_referential" as const,
    note: "This manifest file is not listed in files[] and claims no SHA-256 of itself. See COMMIT-SCOPE-MANIFEST-EXACT.DIGEST.json written after finalisation.",
  },
  reconciliation: {
    missingDeclared,
    dependsOnExcluded: dependsFinal,
    candidateCount: candidateList.length,
    modifiedCount: modified.size,
    claimedDigestMismatches: [] as Array<{ path: string; claimed: string; actual: string }>,
    byteLengthMismatches: [] as Array<{ path: string; claimed: number; actual: number }>,
    fullyReconciled: false,
    method: "git ls-tree baseline set + chunked git diff --name-only + direct-import closure",
  },
  note: "Large regenerable rematerialised-outputs omitted; retain compact hash indexes/summary evidence only.",
};

// Independent recheck of every claimed digest/byte length before fullyReconciled.
const digestMismatches: Array<{ path: string; claimed: string; actual: string }> = [];
const byteMismatches: Array<{ path: string; claimed: number; actual: number }> = [];
for (const e of payloadEntries) {
  if (!exists(e.path)) {
    digestMismatches.push({ path: e.path, claimed: e.sha256, actual: "MISSING" });
    continue;
  }
  const buf = fs.readFileSync(path.join(ROOT, e.path));
  const actualSha = sha256Buf(buf);
  if (actualSha !== e.sha256) {
    digestMismatches.push({ path: e.path, claimed: e.sha256, actual: actualSha });
  }
  if (buf.length !== e.byteLength) {
    byteMismatches.push({ path: e.path, claimed: e.byteLength, actual: buf.length });
  }
}
manifest.reconciliation.claimedDigestMismatches = digestMismatches;
manifest.reconciliation.byteLengthMismatches = byteMismatches;
manifest.reconciliation.fullyReconciled =
  missingDeclared.length === 0 &&
  dependsFinal.length === 0 &&
  digestMismatches.length === 0 &&
  byteMismatches.length === 0;

const outAbs = path.join(ROOT, OUT, "COMMIT-SCOPE-MANIFEST-EXACT.json");
fs.writeFileSync(outAbs, `${JSON.stringify(manifest, null, 2)}\n`);

// Detached digest AFTER finalising the manifest (honest, non-recursive).
const finalManifestBuf = fs.readFileSync(outAbs);
const digest = {
  schemaVersion: "stage300-v2-commit-scope-manifest-detached-digest@1.0.0",
  manifestPath: selfPath,
  sha256: sha256Buf(finalManifestBuf),
  byteLength: finalManifestBuf.length,
  hashedPayloadFileCount: payloadEntries.length,
  generatedAt: new Date().toISOString(),
  note: "Detached digest of COMMIT-SCOPE-MANIFEST-EXACT.json after files[] finalisation. Not embedded in the manifest files[] array.",
};
const digestAbs = path.join(ROOT, OUT, "COMMIT-SCOPE-MANIFEST-EXACT.DIGEST.json");
fs.writeFileSync(digestAbs, `${JSON.stringify(digest, null, 2)}\n`);

const validation = {
  schemaVersion: "stage300-v2-commit-scope-manifest-hash-validation@1.0.0",
  hashedPayloadFileCount: payloadEntries.length,
  claimedDigestMismatches: digestMismatches,
  byteLengthMismatches: byteMismatches,
  manifestSelfHashStatus: "excluded_from_files_array_self_referential",
  detachedDigestPath: `${OUT}/COMMIT-SCOPE-MANIFEST-EXACT.DIGEST.json`,
  detachedDigestSha256: digest.sha256,
  fullyReconciled: manifest.reconciliation.fullyReconciled,
  zeroMismatches: digestMismatches.length === 0 && byteMismatches.length === 0,
};
fs.writeFileSync(
  path.join(ROOT, OUT, "manifest-hash-validation.json"),
  `${JSON.stringify(validation, null, 2)}\n`,
);

try {
  fs.unlinkSync(listFile);
} catch {
  /* ignore */
}

console.log(
  JSON.stringify(
    {
      hashedPayloadFileCount: payloadEntries.length,
      fullyReconciled: manifest.reconciliation.fullyReconciled,
      zeroMismatches: validation.zeroMismatches,
      digestMismatches: digestMismatches.length,
      byteMismatches: byteMismatches.length,
      missingDeclared,
      dependsOnExcludedCount: dependsFinal.length,
      detachedDigestSha256: digest.sha256,
      byClassification: Object.fromEntries(
        (
          [
            "production",
            "auditor_evaluator",
            "focused_contract",
            "compact_receipt",
            "emit_script",
            "rematerialise_script",
          ] as Classification[]
        ).map((c) => [c, payloadEntries.filter((f) => f.classification === c).length]),
      ),
    },
    null,
    2,
  ),
);
