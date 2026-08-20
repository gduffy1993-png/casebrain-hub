/**
 * Enrich criminal corpus with ESA local cases that have bundle-text + truth-key
 * (PDF-only discovery misses text-only ESA material). READ-ONLY filesystem.
 *
 *   npx tsx scripts/assurance/enrich-criminal-corpus-with-esa-readonly.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance",
);
const ESA = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");

type Bundle = {
  bundleKey: string;
  domain: string;
  backendCaseId: string | null;
  title: string | null;
  uniquePdfHashes: string[];
  sourceAuditEligible: boolean;
  syntheticOrTemplateLikely: boolean;
  physicallyAccessible: boolean;
  reason: string;
  sourcePath?: string;
  truthKeyPath?: string;
  offenceFamily?: string;
};

function isCriminalTruth(tk: Record<string, unknown>, bundleText: string): boolean {
  const fam = String(tk.offenceFamily ?? tk.offence ?? "").toLowerCase();
  const title = String(tk.title ?? "").toLowerCase();
  const wording = String(tk.offenceWording ?? "").toLowerCase();
  const blob = `${fam}\n${title}\n${wording}\n${bundleText.slice(0, 8000)}`;
  const housing =
    /\b(housing\s+disrepair|landlord|tenancy|eviction|hhsrs|homeless)\b/i.test(blob);
  const criminal =
    /\b(criminal|theft|robbery|burglary|assault|gbh|abh|public\s+order|cps|pace|defendant|indictment|mg11|interview|custody|disclosure)\b/i.test(
      blob,
    ) ||
    /homicide|violence|drugs|fraud|motoring|sexual|weapons|youth|domestic/i.test(fam);
  if (housing && !criminal) return false;
  if (housing && criminal) return false; // ambiguous → do not force
  return criminal || Boolean(fam && fam !== "unknown" && fam !== "housing");
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const existingPath = path.join(OUT, "criminal-corpus-eligible-bundles.ndjson");
  const existing: Bundle[] = existsSync(existingPath)
    ? readFileSync(existingPath, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Bundle)
    : [];

  const byKey = new Map(existing.map((b) => [b.bundleKey, b]));
  const holdoutPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-phase5-starter-gold-audit/HOLDOUT-CANDIDATE-MANIFEST.json",
  );
  const holdout = new Set(
    existsSync(holdoutPath)
      ? (
          JSON.parse(readFileSync(holdoutPath, "utf8")) as { matters: { caseId: string }[] }
        ).matters.map((m) => m.caseId)
      : [],
  );

  let added = 0;
  let skippedAmbiguous = 0;
  let skippedMissing = 0;
  for (const ent of readdirSync(ESA, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const caseId = ent.name;
    if (holdout.has(caseId)) continue;
    const sourcePath = path.join(ESA, caseId, "bundle-text.md");
    const truthKeyPath = path.join(ESA, caseId, "truth-key.json");
    if (!existsSync(sourcePath) || !existsSync(truthKeyPath)) {
      skippedMissing += 1;
      continue;
    }
    const bundleText = readFileSync(sourcePath, "utf8");
    const tk = JSON.parse(readFileSync(truthKeyPath, "utf8")) as Record<string, unknown>;
    if (!isCriminalTruth(tk, bundleText)) {
      skippedAmbiguous += 1;
      continue;
    }
    const key = `local:${caseId}`;
    if (byKey.has(key)) {
      const prev = byKey.get(key)!;
      prev.sourcePath = path.relative(ROOT, sourcePath).replaceAll("\\", "/");
      prev.truthKeyPath = path.relative(ROOT, truthKeyPath).replaceAll("\\", "/");
      prev.offenceFamily = String(tk.offenceFamily ?? "unknown");
      prev.sourceAuditEligible = true;
      prev.physicallyAccessible = true;
      continue;
    }
    byKey.set(key, {
      bundleKey: key,
      domain: "CRIMINAL_DEFENCE",
      backendCaseId: null,
      title: String(tk.title ?? caseId),
      uniquePdfHashes: [],
      sourceAuditEligible: true,
      syntheticOrTemplateLikely: false,
      physicallyAccessible: true,
      reason: "esa_truth_key_criminal_enrichment",
      sourcePath: path.relative(ROOT, sourcePath).replaceAll("\\", "/"),
      truthKeyPath: path.relative(ROOT, truthKeyPath).replaceAll("\\", "/"),
      offenceFamily: String(tk.offenceFamily ?? "unknown"),
    });
    added += 1;
  }

  // Also attach source/truth paths for existing eligible local bundles under ESA
  for (const b of byKey.values()) {
    const id = b.bundleKey.replace(/^local:/, "");
    const sourcePath = path.join(ESA, id, "bundle-text.md");
    const truthKeyPath = path.join(ESA, id, "truth-key.json");
    if (existsSync(sourcePath) && existsSync(truthKeyPath)) {
      b.sourcePath = path.relative(ROOT, sourcePath).replaceAll("\\", "/");
      b.truthKeyPath = path.relative(ROOT, truthKeyPath).replaceAll("\\", "/");
      b.sourceAuditEligible = true;
      b.physicallyAccessible = true;
      try {
        const tk = JSON.parse(readFileSync(truthKeyPath, "utf8")) as { offenceFamily?: string };
        b.offenceFamily = tk.offenceFamily ?? b.offenceFamily;
      } catch {
        /* ignore */
      }
    }
  }

  const all = [...byKey.values()].filter((b) => b.domain === "CRIMINAL_DEFENCE");
  const withSource = all.filter(
    (b) => b.sourceAuditEligible && b.sourcePath && b.truthKeyPath && existsSync(path.join(ROOT, b.sourcePath)),
  );

  writeFileSync(
    path.join(OUT, "criminal-corpus-eligible-bundles.ndjson"),
    all.map((b) => JSON.stringify(b)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "criminal-corpus-assurance-matters.ndjson"),
    withSource.map((b) => JSON.stringify(b)).join("\n") + "\n",
  );

  const summary = {
    programme: "criminal-corpus-esa-enrichment",
    recordedAt: new Date().toISOString(),
    priorEligible: existing.length,
    addedFromEsa: added,
    skippedAmbiguousOrHousing: skippedAmbiguous,
    skippedMissingArtefacts: skippedMissing,
    holdoutSealed: holdout.size,
    totalCriminalEligibleBundles: all.length,
    assuranceRunnableWithTruthAndBundleText: withSource.length,
    finalUniqueCriminalCaseBundleCount: all.length,
    note: "ESA text-only criminal matters added; holdout remains sealed; housing/ambiguous excluded.",
  };
  writeFileSync(path.join(OUT, "criminal-corpus-enrichment-summary.json"), JSON.stringify(summary, null, 2));

  // Update criminal-corpus-manifest.json counts if present
  const manifestPath = path.join(OUT, "criminal-corpus-manifest.json");
  if (existsSync(manifestPath)) {
    const m = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
    m.finalUniqueCriminalCaseBundleCount = all.length;
    m.finalUniqueCriminalSourceAuditEligibleCount = all.length;
    m.assuranceRunnableWithTruthAndBundleText = withSource.length;
    m.esaEnrichment = summary;
    m.recordedAt = new Date().toISOString();
    writeFileSync(manifestPath, JSON.stringify(m, null, 2));
  }

  console.log(JSON.stringify(summary, null, 2));
}

main();
