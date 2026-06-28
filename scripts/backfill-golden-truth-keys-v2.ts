#!/usr/bin/env npx tsx
/**
 * H2 — backfill golden truth-key v2 verification fields on all gold pack cases.
 *
 * Run: npx tsx scripts/backfill-golden-truth-keys-v2.ts
 * Dry run: npx tsx scripts/backfill-golden-truth-keys-v2.ts --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import type { BundleFidelityTruthKey } from "../lib/eval/casebrain-auditor/bundle-fidelity-types";
import {
  auditTruthKeyCoverage,
  deriveVerificationFromManifest,
  manualVerificationForAnchor,
  type GoldenVerificationTruthKey,
} from "../lib/eval/casebrain-auditor/golden-truth-key-v2";
import { generateManifestFromSeed } from "../lib/eval/casebrain-auditor/strategy-corpus-manifest";

const ROOT = process.cwd();
const GOLD_ROOT = path.join(ROOT, "docs", "bundle-fidelity-set", "gold");
const DRY_RUN = process.argv.includes("--dry-run");

function corpusSeedFromDir(caseId: string): number | null {
  const m = caseId.match(/^sc-([0-9a-f]+)$/i);
  if (!m) return null;
  return parseInt(m[1]!, 16);
}

function backfillOne(truthPath: string): GoldenVerificationTruthKey {
  const raw = JSON.parse(fs.readFileSync(truthPath, "utf8")) as BundleFidelityTruthKey;
  const dirName = path.basename(path.dirname(truthPath));

  if (dirName.startsWith("corpus-")) {
    const seed = corpusSeedFromDir(dirName.replace(/^corpus-/, ""));
    if (seed != null) {
      const manifest = generateManifestFromSeed(seed, "discovery", "text-rendered");
      return deriveVerificationFromManifest(manifest, raw);
    }
  }

  return manualVerificationForAnchor(raw.bundleId ?? dirName, raw);
}

function main(): void {
  const truthPaths: string[] = [];
  for (const name of fs.readdirSync(GOLD_ROOT, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const p = path.join(GOLD_ROOT, name.name, "truth-key.json");
    if (fs.existsSync(p)) truthPaths.push(p);
  }

  const coverageRows: Array<{ bundleId: string; coveragePct: number; missing: string[] }> = [];

  for (const truthPath of truthPaths.sort()) {
    const updated = backfillOne(truthPath);
    const audit = auditTruthKeyCoverage(updated);
    coverageRows.push({
      bundleId: audit.bundleId,
      coveragePct: audit.coveragePct,
      missing: audit.missing,
    });
    if (!DRY_RUN) {
      fs.writeFileSync(truthPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    }
  }

  const avg =
    coverageRows.length === 0
      ? 0
      : Math.round(coverageRows.reduce((s, r) => s + r.coveragePct, 0) / coverageRows.length);
  const full = coverageRows.filter((r) => r.coveragePct === 100).length;

  console.log(`Backfill H2 truth keys — ${truthPaths.length} cases (${DRY_RUN ? "dry run" : "written"})`);
  console.log(`  Average coverage: ${avg}%`);
  console.log(`  Full coverage (100%): ${full}/${coverageRows.length}`);
  const weak = coverageRows.filter((r) => r.coveragePct < 100).slice(0, 10);
  for (const row of weak) {
    console.log(`  ${row.bundleId}: ${row.coveragePct}% missing [${row.missing.join(", ")}]`);
  }
}

main();
