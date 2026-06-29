#!/usr/bin/env npx tsx
/**
 * Ingest + normalise H4 simulator v2 manifest (sim-038..075).
 * Run: npx tsx scripts/build-simulator-manifest-v2.ts
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeV2ManifestCase, type RawV2Case } from "../lib/eval/h4-simulator/normalize-v2-manifest";

const ROOT = process.cwd();
const DRAFT = path.join(ROOT, "docs", "h4", "H4_SIMULATOR_MANIFEST_V2_DRAFT.json");
const OUT = path.join(ROOT, "docs", "h4", "simulator-manifest.v2.json");

function main(): void {
  if (!fs.existsSync(DRAFT)) {
    throw new Error(`Missing draft: ${DRAFT}`);
  }
  const draft = JSON.parse(fs.readFileSync(DRAFT, "utf8")) as {
    cases: RawV2Case[];
    principles?: string[];
    globalBlockingRules?: string[];
    coverageNotes?: unknown;
  };

  const cases = draft.cases.map(normalizeV2ManifestCase);
  if (cases.length !== 38) throw new Error(`Expected 38 cases, got ${cases.length}`);
  for (let n = 38; n <= 75; n++) {
    const id = `sim-${String(n).padStart(3, "0")}`;
    if (!cases.find((c) => c.caseId === id)) throw new Error(`Missing ${id}`);
  }

  const sim075 = cases.find((c) => c.caseId === "sim-075");
  if (sim075?.expectedSendability !== "blocked") {
    throw new Error("sim-075 must map to blocked sendability");
  }

  const manifest = {
    version: "simulator-manifest-v2",
    supplementOf: ["simulator-manifest-v1", "simulator-manifest-v1.1"],
    generatedAt: new Date().toISOString(),
    principle: "Fake/anonymised bundles — test by shape, not identity.",
    baseLibraryCount: 37,
    targetCount: 38,
    combinedLibraryCount: 75,
    caseIdRange: "sim-038..sim-075",
    normalisation: {
      badges: "snake_case (served, referred_only, missing, etc.)",
      blocked_until_review: "blocked for sim-075; needs_solicitor_review otherwise",
      blockingOverrides: ["sim-072", "sim-075"],
    },
    gate: {
      blocking: draft.globalBlockingRules ?? [],
      runsWith: ["simulator v1+v1.1+v2", "golden 102", "h4-export-copy-gate"],
    },
    coverageNotes: draft.coverageNotes,
    cases,
  };

  fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${OUT} (${cases.length} cases, combined library 75)`);
}

main();
