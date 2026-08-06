/**
 * Phase 0 — corpus discovery + baseline integrity scan.
 * Enumerates approved fixtures without altering them.
 * Diagnostics use fixture IDs + rule IDs only (no sensitive case text).
 *
 * Run: npx tsx scripts/integrity-programme/phase0-discover-corpus.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import {
  assessSolicitorSentence,
  type SentenceIntegrityIssue,
} from "@/lib/criminal/solicitor-sentence-composer";
import { findWrongFamilyTerms } from "@/lib/criminal/solicitor-offence-family";

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-0");
const DOCS_OUT = path.join(ROOT, "docs/integrity-programme");

type ApprovalLane =
  | "messy_scale3000"
  | "evidence_state_audit"
  | "bundle_fidelity_gold"
  | "family40_confirmed"
  | "family40_uncertain"
  | "demo_audit_template"
  | "h4_simulator"
  | "gold_manual_packet"
  | "cb_fresh_adversarial"
  | "foundation_pack";

type FixtureCatalogRow = {
  fixtureId: string;
  lanes: ApprovalLane[];
  offenceFamilyDeclared: string | null;
  offenceFamilyResolved: string | null;
  familyConfidence: "high" | "low" | "uncertain" | null;
  mixedOrUncertain: boolean;
  evidenceTypes: string[];
  evidenceStates: string[];
  mg11Status: string | null;
  attributionFlag: boolean | null;
  bundleSparse: boolean | null;
  hearingState: string | null;
  defendantCount: number | null;
  expectedRoutes: string[];
  sourceRef: string;
  materialisedOnDisk: boolean;
};

type BaselineFailure = {
  fixtureId: string;
  family: string | null;
  surface: string;
  ruleId: string;
  diagnostic: string;
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson<T>(abs: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function redact(s: string, max = 48): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return `[len=${t.length}]`;
  return `[len=${t.length} hash=${createHash("sha256").update(t).digest("hex").slice(0, 10)}]`;
}

function uniqSorted(xs: string[]): string[] {
  return [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function pushLane(map: Map<string, FixtureCatalogRow>, id: string, patch: Partial<FixtureCatalogRow> & { lane: ApprovalLane; sourceRef: string }) {
  const existing = map.get(id);
  if (!existing) {
    map.set(id, {
      fixtureId: id,
      lanes: [patch.lane],
      offenceFamilyDeclared: patch.offenceFamilyDeclared ?? null,
      offenceFamilyResolved: patch.offenceFamilyResolved ?? null,
      familyConfidence: patch.familyConfidence ?? null,
      mixedOrUncertain: patch.mixedOrUncertain ?? false,
      evidenceTypes: patch.evidenceTypes ?? [],
      evidenceStates: patch.evidenceStates ?? [],
      mg11Status: patch.mg11Status ?? null,
      attributionFlag: patch.attributionFlag ?? null,
      bundleSparse: patch.bundleSparse ?? null,
      hearingState: patch.hearingState ?? null,
      defendantCount: patch.defendantCount ?? null,
      expectedRoutes: patch.expectedRoutes ?? [],
      sourceRef: patch.sourceRef,
      materialisedOnDisk: patch.materialisedOnDisk ?? false,
    });
    return;
  }
  if (!existing.lanes.includes(patch.lane)) existing.lanes.push(patch.lane);
  existing.offenceFamilyDeclared ??= patch.offenceFamilyDeclared ?? null;
  existing.offenceFamilyResolved ??= patch.offenceFamilyResolved ?? null;
  existing.familyConfidence ??= patch.familyConfidence ?? null;
  existing.mixedOrUncertain = existing.mixedOrUncertain || Boolean(patch.mixedOrUncertain);
  existing.evidenceTypes = uniqSorted([...existing.evidenceTypes, ...(patch.evidenceTypes ?? [])]);
  existing.evidenceStates = uniqSorted([...existing.evidenceStates, ...(patch.evidenceStates ?? [])]);
  existing.mg11Status ??= patch.mg11Status ?? null;
  if (existing.attributionFlag == null) existing.attributionFlag = patch.attributionFlag ?? null;
  if (existing.bundleSparse == null) existing.bundleSparse = patch.bundleSparse ?? null;
  existing.hearingState ??= patch.hearingState ?? null;
  if (existing.defendantCount == null) existing.defendantCount = patch.defendantCount ?? null;
  existing.expectedRoutes = uniqSorted([...existing.expectedRoutes, ...(patch.expectedRoutes ?? [])]);
  existing.materialisedOnDisk = existing.materialisedOnDisk || Boolean(patch.materialisedOnDisk);
}

function inferMg11(items: Array<{ label?: string; existence?: string }>): string | null {
  const mg = items.filter((i) => /\bmg11\b|witness statement/i.test(i.label ?? ""));
  if (!mg.length) return "not_on_file";
  const states = uniqSorted(mg.map((i) => i.existence ?? "unknown"));
  return states.join("+");
}

function scanLinesForBaseline(
  fixtureId: string,
  familyDeclared: string | null,
  lines: string[],
  surface: string,
  failures: BaselineFailure[],
) {
  const resolution = resolveSolicitorOffenceFamily({
    allegation: familyDeclared ?? "",
    bundleHay: familyDeclared ?? "",
  });
  for (const line of lines) {
    if (!line?.trim()) continue;
    const sentence = assessSolicitorSentence(line);
    if (!sentence.ok) {
      for (const issue of sentence.issues as SentenceIntegrityIssue[]) {
        failures.push({
          fixtureId,
          family: familyDeclared,
          surface,
          ruleId: `sentence.${issue}`,
          diagnostic: redact(line),
        });
      }
    }
    const wrong = findWrongFamilyTerms(line, resolution, familyDeclared ?? "");
    for (const w of wrong) {
      failures.push({
        fixtureId,
        family: familyDeclared,
        surface,
        ruleId: `family.wrong_term.${w.replace(/[^a-z0-9]+/gi, "_").slice(0, 40)}`,
        diagnostic: redact(line),
      });
    }
  }
}

function discoverMessy3000(map: Map<string, FixtureCatalogRow>) {
  const summaryPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
  );
  const summary = readJson<{
    cases?: Array<{ caseId: string; family?: string; sourceCaseId?: string; trap?: string }>;
  }>(summaryPath);
  if (!summary?.cases?.length) {
    console.warn("WARN: messy v9 summary missing — scale3000 lane empty");
    return { n: 0, path: summaryPath };
  }
  for (const c of summary.cases) {
    pushLane(map, c.caseId, {
      lane: "messy_scale3000",
      sourceRef: "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
      offenceFamilyDeclared: c.family ?? null,
      mixedOrUncertain: /mixed|uncertain/i.test(c.family ?? ""),
      expectedRoutes: c.trap ? [c.trap] : [],
      materialisedOnDisk: false,
    });
  }
  return { n: summary.cases.length, path: summaryPath };
}

function discoverEsa(map: Map<string, FixtureCatalogRow>, failures: BaselineFailure[]) {
  const root = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  if (!fs.existsSync(root)) return { n: 0 };
  let n = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const truthPath = path.join(dir, "truth-key.json");
    if (!fs.existsSync(truthPath)) continue;
    n += 1;
    const truth = readJson<{
      caseId?: string;
      offenceFamily?: string;
      evidenceItems?: Array<{ label?: string; existence?: string; kind?: string }>;
      expectedChaseItems?: string[];
      mustNotSayGlobal?: string[];
      profile?: string;
      hearing?: { status?: string; dateIso?: string };
      defendants?: unknown[];
    }>(truthPath);
    const family = truth?.offenceFamily ?? null;
    const items = truth?.evidenceItems ?? [];
    const resolved = resolveSolicitorOffenceFamily({
      allegation: family ?? "",
      bundleHay: `${family ?? ""} ${(items.map((i) => i.label).join(" ") ?? "")}`,
    });
    pushLane(map, entry.name, {
      lane: "evidence_state_audit",
      sourceRef: path.relative(ROOT, truthPath).replace(/\\/g, "/"),
      offenceFamilyDeclared: family,
      offenceFamilyResolved: resolved.family,
      familyConfidence: resolved.confidence,
      mixedOrUncertain: resolved.failClosed || resolved.confidence === "uncertain",
      evidenceTypes: uniqSorted(items.map((i) => i.kind || i.label || "").filter(Boolean)),
      evidenceStates: uniqSorted(items.map((i) => i.existence || "").filter(Boolean)),
      mg11Status: inferMg11(items),
      attributionFlag: items.some((i) => /attribution|subscriber|handset/i.test(i.label ?? "")),
      bundleSparse: items.length > 0 && items.length < 4,
      hearingState: truth?.hearing?.status ?? (truth?.hearing?.dateIso ? "has_date" : null),
      defendantCount: Array.isArray(truth?.defendants) ? truth!.defendants!.length : null,
      expectedRoutes: truth?.profile ? [truth.profile] : [],
      materialisedOnDisk: true,
    });

    // Baseline: must-not-say lines + chase labels only (no full bundle text).
    scanLinesForBaseline(
      entry.name,
      family,
      [...(truth?.mustNotSayGlobal ?? []), ...(truth?.expectedChaseItems ?? [])],
      "truth_key.labels",
      failures,
    );

    const outputPath = path.join(dir, "casebrain-output.json");
    if (fs.existsSync(outputPath)) {
      const output = readJson<Record<string, unknown>>(outputPath);
      const strings: string[] = [];
      const walk = (v: unknown, depth: number) => {
        if (depth > 6 || strings.length > 80) return;
        if (typeof v === "string") {
          if (v.length >= 12 && v.length <= 500) strings.push(v);
          return;
        }
        if (Array.isArray(v)) {
          for (const x of v.slice(0, 40)) walk(x, depth + 1);
          return;
        }
        if (v && typeof v === "object") {
          for (const x of Object.values(v as Record<string, unknown>).slice(0, 40)) walk(x, depth + 1);
        }
      };
      walk(output, 0);
      scanLinesForBaseline(entry.name, family, strings, "casebrain_output.strings", failures);
    }
  }
  return { n };
}

function discoverFidelityGold(map: Map<string, FixtureCatalogRow>) {
  const root = path.join(ROOT, "docs/bundle-fidelity-set/gold");
  if (!fs.existsSync(root)) return { n: 0 };
  let n = 0;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!/truth-key\.json$/i.test(entry.name)) continue;
      const truth = readJson<{
        bundleId?: string;
        linkStatus?: string;
        charge?: string;
        offence?: string;
        missingMaterial?: string[];
        docs?: Array<{ type?: string }>;
      }>(abs);
      if (!truth) continue;
      if (truth.linkStatus && truth.linkStatus !== "runnable") continue;
      n += 1;
      const id = truth.bundleId || path.basename(path.dirname(abs));
      const charge = truth.charge || truth.offence || "";
      const resolved = resolveSolicitorOffenceFamily({ allegation: charge, bundleHay: charge });
      pushLane(map, id, {
        lane: "bundle_fidelity_gold",
        sourceRef: path.relative(ROOT, abs).replace(/\\/g, "/"),
        offenceFamilyDeclared: charge || null,
        offenceFamilyResolved: resolved.family,
        familyConfidence: resolved.confidence,
        mixedOrUncertain: resolved.failClosed,
        evidenceTypes: uniqSorted((truth.docs ?? []).map((d) => d.type || "").filter(Boolean)),
        expectedRoutes: truth.missingMaterial?.slice(0, 5) ?? [],
        materialisedOnDisk: true,
      });
    }
  };
  walk(root);
  return { n };
}

function discoverFamily40(map: Map<string, FixtureCatalogRow>) {
  try {
    // Dynamic import path via require of compiled ts through tsx — read catalog file as text fallback
    const catalogPath = path.join(ROOT, "lib/eval/casebrain-auditor/family-40-catalog.ts");
    const raw = fs.readFileSync(catalogPath, "utf8");
    const idHits = [...raw.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]!);
    const certaintyHits = [...raw.matchAll(/manifestCertainty:\s*"(confirmed|uncertain)"/g)].map(
      (m) => m[1] as "confirmed" | "uncertain",
    );
    let n = 0;
    for (let i = 0; i < idHits.length; i++) {
      const id = idHits[i]!;
      if (!/^NS-CPS-|^CB-|^F40-/i.test(id) && !/case/i.test(id)) {
        // keep all catalog ids that look like case refs
      }
      const certainty = certaintyHits[i] ?? "uncertain";
      n += 1;
      pushLane(map, id, {
        lane: certainty === "confirmed" ? "family40_confirmed" : "family40_uncertain",
        sourceRef: "lib/eval/casebrain-auditor/family-40-catalog.ts",
        mixedOrUncertain: certainty !== "confirmed",
        materialisedOnDisk: fs.existsSync(path.join(ROOT, `docs/fictional-cases-40/${id}.txt`)),
      });
    }
    return { n, confirmed: certaintyHits.filter((c) => c === "confirmed").length };
  } catch {
    return { n: 0, confirmed: 0 };
  }
}

function discoverDemoTemplates(map: Map<string, FixtureCatalogRow>) {
  const files = [
    "lib/eval/demo-audit-packs/case-specs.ts",
    "lib/eval/demo-audit-packs/thirty-case-catalog.ts",
    "lib/eval/demo-audit-packs/v9-forty-case-catalog.ts",
  ];
  let n = 0;
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const raw = fs.readFileSync(abs, "utf8");
    const ids = [...raw.matchAll(/id:\s*"(demo-audit-[^"]+)"/g)].map((m) => m[1]!);
    for (const id of uniqSorted(ids)) {
      n += 1;
      pushLane(map, id, {
        lane: "demo_audit_template",
        sourceRef: rel,
        materialisedOnDisk: fs.existsSync(
          path.join(ROOT, `artifacts/evidence-state-audit-local/cases/${id}/truth-key.json`),
        ),
      });
    }
  }
  return { n };
}

function discoverH4(map: Map<string, FixtureCatalogRow>) {
  const manifests = [
    "docs/h4/simulator-manifest.v1.json",
    "docs/h4/simulator-manifest.v1.1.json",
    "docs/h4/simulator-manifest.v2.json",
    "docs/h4/simulator-manifest.v4.json",
  ];
  let n = 0;
  for (const rel of manifests) {
    const abs = path.join(ROOT, rel);
    const data = readJson<{ cases?: Array<{ id?: string; caseId?: string; family?: string; offenceFamily?: string }> }>(abs);
    if (!data?.cases) continue;
    for (const c of data.cases) {
      const id = c.id || c.caseId;
      if (!id) continue;
      n += 1;
      pushLane(map, id, {
        lane: "h4_simulator",
        sourceRef: rel,
        offenceFamilyDeclared: c.family || c.offenceFamily || null,
        materialisedOnDisk: false,
      });
    }
  }
  return { n };
}

function clusterFailures(failures: BaselineFailure[]) {
  const byRule = new Map<string, { ruleId: string; count: number; fixtureIds: string[]; surfaces: string[] }>();
  for (const f of failures) {
    const cur = byRule.get(f.ruleId) ?? {
      ruleId: f.ruleId,
      count: 0,
      fixtureIds: [],
      surfaces: [],
    };
    cur.count += 1;
    if (cur.fixtureIds.length < 25) cur.fixtureIds.push(f.fixtureId);
    if (!cur.surfaces.includes(f.surface)) cur.surfaces.push(f.surface);
    byRule.set(f.ruleId, cur);
  }
  return [...byRule.values()].sort((a, b) => b.count - a.count);
}

function coverageGaps(rows: FixtureCatalogRow[]) {
  const families = new Map<string, number>();
  const states = new Map<string, number>();
  let missingFamily = 0;
  let uncertainFamily = 0;
  let noHearing = 0;
  let noMg11 = 0;
  let notMaterialised = 0;
  for (const r of rows) {
    const fam = r.offenceFamilyDeclared || r.offenceFamilyResolved || "unknown";
    families.set(fam, (families.get(fam) ?? 0) + 1);
    if (!r.offenceFamilyDeclared && !r.offenceFamilyResolved) missingFamily += 1;
    if (r.mixedOrUncertain || r.familyConfidence === "uncertain") uncertainFamily += 1;
    if (!r.hearingState) noHearing += 1;
    if (!r.mg11Status) noMg11 += 1;
    if (!r.materialisedOnDisk) notMaterialised += 1;
    for (const s of r.evidenceStates) states.set(s, (states.get(s) ?? 0) + 1);
  }
  const requiredFamilies = [
    "harassment",
    "violence",
    "drugs",
    "theft",
    "motoring",
    "fraud",
    "sexual",
    "public_order",
    "mixed",
  ];
  const familyKeys = [...families.keys()].join(" ").toLowerCase();
  const missingRequired = requiredFamilies.filter((f) => !familyKeys.includes(f.replace("_", " ")) && !familyKeys.includes(f));
  return {
    familyHistogram: Object.fromEntries([...families.entries()].sort((a, b) => b[1] - a[1])),
    evidenceStateHistogram: Object.fromEntries([...states.entries()].sort((a, b) => b[1] - a[1])),
    missingFamily,
    uncertainFamily,
    noHearing,
    noMg11,
    notMaterialised,
    missingRequiredFamilyCoverage: missingRequired,
  };
}

function main() {
  ensureDir(OUT_DIR);
  ensureDir(DOCS_OUT);
  const map = new Map<string, FixtureCatalogRow>();
  const failures: BaselineFailure[] = [];

  const messy = discoverMessy3000(map);
  const esa = discoverEsa(map, failures);
  const fidelity = discoverFidelityGold(map);
  const family40 = discoverFamily40(map);
  const demo = discoverDemoTemplates(map);
  const h4 = discoverH4(map);

  const rows = [...map.values()].sort((a, b) => a.fixtureId.localeCompare(b.fixtureId));
  const N = rows.length;

  // Approved programme corpus for N-case runs: prefer scale3000 lane when present.
  const approvedScale = rows.filter((r) => r.lanes.includes("messy_scale3000"));
  const approvedMaterialised = rows.filter((r) => r.materialisedOnDisk);
  const N_approved_scale = approvedScale.length || messy.n;
  const N_materialised = approvedMaterialised.length;

  const clusters = clusterFailures(failures);
  const gaps = coverageGaps(rows);

  const manifest = {
    programme: "criminal-defence-integrity-corpus",
    phase: 0,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Discovery only — fixtures not altered. Diagnostics are redacted. Not a PASS claim.",
    N_union_all_lanes: N,
    N_approved_scale3000: N_approved_scale,
    N_materialised_truth_keys: N_materialised,
    laneCounts: {
      messy_scale3000: messy.n,
      evidence_state_audit: esa.n,
      bundle_fidelity_gold: fidelity.n,
      family40: family40.n,
      family40_confirmed: family40.confirmed,
      demo_audit_template: demo.n,
      h4_simulator: h4.n,
    },
    sources: {
      messySummary: messy.path,
      controlledMetrics: "artifacts/casebrain-proof/controlled-3000-proof-metrics.json",
    },
    note:
      "Programme N for full corpus runs is N_approved_scale3000 when the messy v9 identity list is present; materialised truth-key fixtures are the on-disk baseline scan set.",
  };

  fs.writeFileSync(path.join(OUT_DIR, "corpus-manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "corpus-catalog.json"), JSON.stringify({ fixtures: rows }, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, "coverage-gaps.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), ...gaps }, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "baseline-failures.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        failureCount: failures.length,
        fixtureCountTouched: new Set(failures.map((f) => f.fixtureId)).size,
        failures: failures.slice(0, 5000),
        truncated: failures.length > 5000,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "baseline-failure-clusters.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), clusters }, null, 2),
  );

  const md = `# Phase 0 checkpoint — corpus discovery & baseline

**Status:** DISCOVERY COMPLETE — not a PASS  
**Generated:** ${manifest.generatedAt}  
**Branch:** programme/criminal-defence-integrity-corpus  

## N (approved corpus)

| Metric | Count |
|--------|------:|
| **N_approved_scale3000** (programme full-run identity list) | **${N_approved_scale}** |
| N_materialised_truth_keys (on-disk baseline scan) | ${N_materialised} |
| N_union_all_lanes (deduped across catalogs) | ${N} |

Lane counts: messy=${messy.n}, ESA=${esa.n}, fidelity_gold=${fidelity.n}, family40=${family40.n} (confirmed=${family40.confirmed}), demo_templates=${demo.n}, h4=${h4.n}.

## Coverage gaps (summary)

- Missing declared/resolved family: ${gaps.missingFamily}
- Uncertain/mixed family: ${gaps.uncertainFamily}
- No hearing metadata in catalog: ${gaps.noHearing}
- No MG11 metadata in catalog: ${gaps.noMg11}
- Not materialised on disk: ${gaps.notMaterialised}
- Missing required family coverage signals: ${gaps.missingRequiredFamilyCoverage.join(", ") || "(none detected by keyword)"}

Top families: ${Object.entries(gaps.familyHistogram)
    .slice(0, 12)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")}

## Baseline failure clusters (current code)

Total baseline hits: **${failures.length}** across **${new Set(failures.map((f) => f.fixtureId)).size}** fixtures (truth-key labels + casebrain-output strings only; no fixture mutation).

| Rank | Rule ID | Count | Surfaces |
|-----:|---------|------:|----------|
${clusters
  .slice(0, 25)
  .map((c, i) => `| ${i + 1} | ${c.ruleId} | ${c.count} | ${c.surfaces.join(", ")} |`)
  .join("\n")}

## Root-cause map (preliminary)

1. **Composition / punctuation** — \`sentence.malformed_punctuation\`, truncations, raw markers → shared composer (Phase 5–6).
2. **Offence-family bleed** — \`family.wrong_term.*\` → concept registry + fail-closed (Phase 4).
3. **Catalog sparsity** — many scale3000 IDs lack materialised truth-keys → need generation harness for full N runs (Phase 9).
4. **Metadata gaps** — hearing/MG11 often unset in catalogs → canonical matter model (Phase 3).

## Preserved prior work

Cherry-picked into this branch: solicitor output integrity gate (copy/deep fail-closed, offence-family helper, sentence composer, matter-state VM, hearing status).

## Next checkpoint

Phase 1 — machine-readable inventory of every solicitor output pathway.

## Artefacts

- \`artifacts/casebrain-qa/integrity-programme/phase-0/corpus-manifest.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-0/corpus-catalog.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-0/coverage-gaps.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-0/baseline-failures.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-0/baseline-failure-clusters.json\`
`;

  fs.writeFileSync(path.join(DOCS_OUT, "phase-0-checkpoint.md"), md);
  fs.writeFileSync(path.join(OUT_DIR, "PHASE-0-CHECKPOINT.md"), md);

  console.log(
    JSON.stringify(
      {
        ok: true,
        N_approved_scale3000: N_approved_scale,
        N_materialised: N_materialised,
        N_union: N,
        baselineFailures: failures.length,
        topClusters: clusters.slice(0, 8).map((c) => ({ ruleId: c.ruleId, count: c.count })),
        outDir: path.relative(ROOT, OUT_DIR).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
}

main();
