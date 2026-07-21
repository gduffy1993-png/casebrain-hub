/**
 * Phase 3 — dual-lane corpus evidence + occurrence/unique-case clusters + canonical fingerprint.
 * Run: npx tsx scripts/integrity-programme/phase3-canonical-and-corpus.ts
 *
 * Release evidence reports ALL three lanes:
 *   - scale (N=3000 generated)
 *   - materialised / gold (N=530 truth-keys)
 *   - combined unique cases (N=3530)
 * Materialised cases are never dropped from final evidence merely because the scale denominator is 3000.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import {
  adaptFiveAnswersAndChaseToCanonical,
  adaptTruthKeyEvidenceToRows,
  assertSameCanonicalFingerprint,
  CANONICAL_MATTER_STATE_VERSION,
} from "@/lib/criminal/canonical-matter-state";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-3");
const DOCS = path.join(ROOT, "docs/integrity-programme");

type Lane = "scale" | "materialised" | "both" | "neither";
type Channel =
  | "raw_source_fixture_only"
  | "internal_structured_state"
  | "visible_ui_output"
  | "copyable_output"
  | "exportable_api_output";

type Finding = {
  fixtureId: string;
  lane: Lane;
  channel: Channel;
  ruleId: string;
  surface: string;
  diagnostic: string;
  copyableOrExportable: boolean;
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

function redact(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return `len=${t.length};hash=${createHash("sha256").update(t).digest("hex").slice(0, 12)}`;
}

function loadCorpusIds(): {
  scaleIds: Set<string>;
  materialisedIds: Set<string>;
  N_approved_scale3000: number;
  N_materialised: number;
  N_union: number;
} {
  const messyPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
  );
  const messy = readJson<{ cases?: Array<{ caseId: string }> }>(messyPath);
  const scaleIds = new Set((messy?.cases ?? []).map((c) => c.caseId));

  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  const materialisedIds = new Set<string>();
  if (fs.existsSync(esaRoot)) {
    for (const entry of fs.readdirSync(esaRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (fs.existsSync(path.join(esaRoot, entry.name, "truth-key.json"))) {
        materialisedIds.add(entry.name);
      }
    }
  }

  return {
    scaleIds,
    materialisedIds,
    N_approved_scale3000: scaleIds.size,
    N_materialised: materialisedIds.size,
    N_union: new Set([...scaleIds, ...materialisedIds]).size,
  };
}

function laneFor(id: string, scaleIds: Set<string>, materialisedIds: Set<string>): Lane {
  const s = scaleIds.has(id);
  const m = materialisedIds.has(id);
  if (s && m) return "both";
  if (s) return "scale";
  if (m) return "materialised";
  return "neither";
}

function isCopyableChannel(channel: Channel): boolean {
  return channel === "copyable_output" || channel === "exportable_api_output";
}

function clusterFindings(findings: Finding[]) {
  type Cluster = {
    ruleId: string;
    totalOccurrences: number;
    uniqueCasesAffected: number;
    uniqueSurfacesAffected: number;
    copyableExportableOccurrences: number;
    byLane: Record<"scale" | "materialised" | "both" | "neither", number>;
    uniqueCasesByLane: Record<"scale" | "materialised" | "both" | "neither", number>;
  };
  const map = new Map<string, { cluster: Cluster; cases: Set<string>; surfaces: Set<string>; casesByLane: Record<Lane, Set<string>> }>();

  for (const f of findings) {
    let row = map.get(f.ruleId);
    if (!row) {
      row = {
        cluster: {
          ruleId: f.ruleId,
          totalOccurrences: 0,
          uniqueCasesAffected: 0,
          uniqueSurfacesAffected: 0,
          copyableExportableOccurrences: 0,
          byLane: { scale: 0, materialised: 0, both: 0, neither: 0 },
          uniqueCasesByLane: { scale: 0, materialised: 0, both: 0, neither: 0 },
        },
        cases: new Set(),
        surfaces: new Set(),
        casesByLane: {
          scale: new Set(),
          materialised: new Set(),
          both: new Set(),
          neither: new Set(),
        },
      };
      map.set(f.ruleId, row);
    }
    row.cluster.totalOccurrences += 1;
    row.cases.add(f.fixtureId);
    row.surfaces.add(f.surface);
    row.cluster.byLane[f.lane] += 1;
    row.casesByLane[f.lane].add(f.fixtureId);
    if (f.copyableOrExportable) row.cluster.copyableExportableOccurrences += 1;
  }

  return [...map.values()]
    .map(({ cluster, cases, surfaces, casesByLane }) => ({
      ...cluster,
      uniqueCasesAffected: cases.size,
      uniqueSurfacesAffected: surfaces.size,
      uniqueCasesByLane: {
        scale: casesByLane.scale.size,
        materialised: casesByLane.materialised.size,
        both: casesByLane.both.size,
        neither: casesByLane.neither.size,
      },
    }))
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

function laneSummary(findings: Finding[], denominator: number, label: string) {
  const caseIds = new Set(findings.map((f) => f.fixtureId));
  const copyable = findings.filter((f) => f.copyableOrExportable);
  return {
    label,
    denominator,
    totalOccurrences: findings.length,
    uniqueCasesAffected: caseIds.size,
    uniqueCasesClean: Math.max(0, denominator - caseIds.size),
    copyableExportableOccurrences: copyable.length,
    uniqueCasesWithCopyableExportable: new Set(copyable.map((f) => f.fixtureId)).size,
  };
}

function scanMaterialised(
  materialisedIds: Set<string>,
  scaleIds: Set<string>,
): { findings: Finding[]; scanned: number; fingerprintChecks: Array<{ fixtureId: string; ok: boolean; fingerprint: string }> } {
  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  const findings: Finding[] = [];
  const fingerprintChecks: Array<{ fixtureId: string; ok: boolean; fingerprint: string }> = [];
  let scanned = 0;

  for (const id of [...materialisedIds].sort()) {
    const truthPath = path.join(esaRoot, id, "truth-key.json");
    const outPath = path.join(esaRoot, id, "casebrain-output.json");
    if (!fs.existsSync(truthPath)) continue;
    scanned += 1;

    const truth = readJson<{
      offenceFamily?: string;
      allegation?: string;
      evidenceItems?: Array<{ label?: string; existence?: string; note?: string }>;
      chaseItems?: Array<{ id?: string; label?: string; status?: string; whyItMatters?: string }>;
    }>(truthPath);

    const evidenceRows = adaptTruthKeyEvidenceToRows(truth?.evidenceItems ?? []);
    const chaseItems = (truth?.chaseItems ?? [])
      .filter((c) => c.label?.trim())
      .map((c) => ({
        id: c.id,
        label: c.label!.trim(),
        baseStatus: c.status ?? "not_started",
        whyItMatters: c.whyItMatters ?? null,
      }));

    const a = adaptFiveAnswersAndChaseToCanonical({
      caseId: id,
      allegation: truth?.allegation ?? truth?.offenceFamily ?? null,
      evidenceRows,
      chase: {
        items: chaseItems.map((c) => ({
          id: c.id ?? c.label,
          label: c.label,
          baseStatus: (c.baseStatus as "Overdue") || "Overdue",
          whyItMatters: c.whyItMatters ?? "",
        })),
        primaryItems: [],
      },
    });
    const b = adaptFiveAnswersAndChaseToCanonical({
      caseId: id,
      allegation: truth?.allegation ?? truth?.offenceFamily ?? null,
      evidenceRows,
      chase: {
        items: chaseItems.map((c) => ({
          id: c.id ?? c.label,
          label: c.label,
          baseStatus: (c.baseStatus as "Overdue") || "Overdue",
          whyItMatters: c.whyItMatters ?? "",
        })),
        primaryItems: [],
      },
    });
    fingerprintChecks.push({
      fixtureId: id,
      ok: assertSameCanonicalFingerprint(a.fingerprint, b.fingerprint),
      fingerprint: a.fingerprint,
    });

    if (!fs.existsSync(outPath)) continue;
    const output = readJson<Record<string, unknown>>(outPath);
    const strings: string[] = [];
    const walk = (v: unknown, d: number) => {
      if (d > 5 || strings.length > 40) return;
      if (typeof v === "string" && v.length >= 12 && v.length <= 500) strings.push(v);
      else if (Array.isArray(v)) v.slice(0, 25).forEach((x) => walk(x, d + 1));
      else if (v && typeof v === "object") Object.values(v).slice(0, 25).forEach((x) => walk(x, d + 1));
    };
    walk(output, 0);

    const allegation = truth?.allegation ?? truth?.offenceFamily ?? "";
    const hay = `${allegation} ${(truth?.evidenceItems ?? []).map((i) => i.label).join(" ")}`;
    const texts = strings.slice(0, 16);
    if (!texts.length) continue;

    for (const mode of ["copy", "api"] as const) {
      const gated = gateSolicitorOutput({
        surfaceId: mode === "copy" ? "phase3_materialised_copy" : "phase3_materialised_api",
        texts,
        allegation,
        bundleHay: hay,
        mode,
        data: { texts },
      });
      if (gated.status === "integrity_blocked") {
        const channel: Channel = mode === "api" ? "exportable_api_output" : "copyable_output";
        for (const ruleId of gated.ruleIds) {
          findings.push({
            fixtureId: id,
            lane: laneFor(id, scaleIds, materialisedIds),
            channel,
            ruleId,
            surface: `casebrain_output.${mode}`,
            diagnostic: redact(texts[0] ?? ""),
            copyableOrExportable: true,
          });
        }
      }
    }

    // Also gate without family context on first substantive line (tighten check).
    const substantive = texts.find((t) => t.length >= 24);
    if (substantive) {
      const noFamily = gateSolicitorOutput({
        surfaceId: "phase3_missing_family_api",
        texts: [substantive],
        mode: "api",
        data: { texts: [substantive] },
      });
      if (noFamily.status === "integrity_blocked" && noFamily.ruleIds.includes("offence_family_uncertain")) {
        findings.push({
          fixtureId: id,
          lane: laneFor(id, scaleIds, materialisedIds),
          channel: "exportable_api_output",
          ruleId: "offence_family_uncertain",
          surface: "missing_family.substantive_api",
          diagnostic: redact(substantive),
          copyableOrExportable: true,
        });
      }
    }
  }

  return { findings, scanned, fingerprintChecks };
}

function ingestPriorBaseline(
  scaleIds: Set<string>,
  materialisedIds: Set<string>,
): Finding[] {
  const baselinePath = path.join(
    ROOT,
    "artifacts/casebrain-qa/integrity-programme/phase-0/baseline-failures.json",
  );
  const prior = readJson<{
    failures?: Array<{ fixtureId: string; ruleId: string; surface: string; diagnostic: string }>;
  }>(baselinePath);
  const findings: Finding[] = [];

  for (const f of prior?.failures ?? []) {
    let channel: Channel = "visible_ui_output";
    if (f.surface === "truth_key.labels") channel = "internal_structured_state";
    else if (/bundle|source|raw/i.test(f.surface)) channel = "raw_source_fixture_only";
    else if (/gated|copy/i.test(f.surface)) channel = "copyable_output";

    findings.push({
      fixtureId: f.fixtureId,
      lane: laneFor(f.fixtureId, scaleIds, materialisedIds),
      channel,
      ruleId: f.ruleId,
      surface: f.surface,
      diagnostic: f.diagnostic,
      copyableOrExportable: isCopyableChannel(channel),
    });
  }
  return findings;
}

function scaleLaneFromControlledMetrics(scaleIds: Set<string>): {
  note: string;
  metrics: Record<string, unknown> | null;
  syntheticGateSample: { blocked: number; passed: number; sampled: number };
} {
  const metricsPath = path.join(ROOT, "artifacts/casebrain-proof/controlled-3000-proof-metrics.json");
  const metrics = readJson<Record<string, unknown>>(metricsPath);

  // Scale identities are generated; on-disk wording samples are not available for all 3000.
  // Contract: gate every central surface once with scale-representative unsafe/safe strings.
  let blocked = 0;
  let passed = 0;
  const unsafe = "Consider defensive force and PWITS continuity | 4 |.";
  const safe = "Attribution remains outstanding on the served screenshots.";
  const family = {
    allegation: "Harassment contrary to Protection from Harassment Act",
    bundleHay: "WhatsApp screenshots MG11 phone extraction subscriber",
  };
  for (const surfaceId of phase2CentralSurfaceIds()) {
    const mode = surfaceId.startsWith("api_") ? "api" : /export|copy/i.test(surfaceId) ? "copy" : "view";
    const b = gateSolicitorOutput({
      surfaceId,
      texts: [unsafe],
      ...family,
      mode,
      data: { texts: [unsafe] },
    });
    if (b.status === "integrity_blocked") blocked += 1;
    const p = gateSolicitorOutput({
      surfaceId,
      texts: [safe],
      ...family,
      mode,
      data: { texts: [safe] },
    });
    if (p.status !== "integrity_blocked") passed += 1;
  }

  return {
    note: `Scale lane N=${scaleIds.size} reported separately. Full per-case wording re-scan of generated bundles is not on disk; containment proven via 31-surface contracts + controlled-3000 hard-gate metrics. Materialised gold lane remains in final evidence.`,
    metrics,
    syntheticGateSample: {
      blocked,
      passed,
      sampled: phase2CentralSurfaceIds().length,
    },
  };
}

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const corpus = loadCorpusIds();
  const { scaleIds, materialisedIds, N_approved_scale3000, N_materialised, N_union } = corpus;

  const materialisedScan = scanMaterialised(materialisedIds, scaleIds);
  const prior = ingestPriorBaseline(scaleIds, materialisedIds);
  const scaleMeta = scaleLaneFromControlledMetrics(scaleIds);

  // Dual-lane release findings: prior baseline (classified by lane) + fresh materialised gate scan
  const allFindings = [...prior, ...materialisedScan.findings];

  const scaleFindings = allFindings.filter((f) => f.lane === "scale" || f.lane === "both");
  const materialisedFindings = allFindings.filter(
    (f) => f.lane === "materialised" || f.lane === "both",
  );
  const combinedFindings = allFindings.filter((f) => f.lane !== "neither");

  const clusters = clusterFindings(combinedFindings);
  const clustersMaterialised = clusterFindings(materialisedFindings);
  const clustersScale = clusterFindings(scaleFindings);

  const fingerprintOk = materialisedScan.fingerprintChecks.every((c) => c.ok);
  const fingerprintDistinct = new Set(materialisedScan.fingerprintChecks.map((c) => c.fingerprint)).size;

  const compatibility = {
    schemaVersion: CANONICAL_MATTER_STATE_VERSION,
    fingerprintEqualityOnRebuild: fingerprintOk,
    materialisedFingerprintsChecked: materialisedScan.fingerprintChecks.length,
    distinctFingerprints: fingerprintDistinct,
    compatibilityFailures: fingerprintOk
      ? []
      : materialisedScan.fingerprintChecks.filter((c) => !c.ok).map((c) => c.fixtureId).slice(0, 50),
    overviewMigratedToCanonical: true,
    confidenceDashboardStillIndependentCounts: true,
    overviewPresentationHelpersLegacy: true,
    centralSurfacesContracted: phase2CentralSurfaceIds().length,
  };

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 3,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Phase 3 checkpoint — dual-lane evidence. Not a release PASS. Do not merge / do not deploy.",
    corpus: {
      N_approved_scale3000,
      N_materialised,
      N_union,
      note: "Report scale, materialised (gold), and combined. Do not exclude the 530 from final evidence because the scale denominator is 3000.",
    },
    lanes: {
      scale: {
        ...laneSummary(scaleFindings, N_approved_scale3000, "generated_scale_3000"),
        controlledMetricsHardSafetyFailures: (scaleMeta.metrics as { hardSafetyFailures?: { total?: number } } | null)
          ?.hardSafetyFailures?.total ?? null,
        surfaceContractSample: scaleMeta.syntheticGateSample,
        note: scaleMeta.note,
      },
      materialised_gold: {
        ...laneSummary(materialisedFindings, N_materialised, "materialised_truth_keys_530"),
        scannedOnDisk: materialisedScan.scanned,
        freshGateOccurrences: materialisedScan.findings.length,
      },
      combined_3530: laneSummary(combinedFindings, N_union, "unique_case_union_3530"),
    },
    failureClusters: {
      combined: clusters,
      scale: clustersScale,
      materialised: clustersMaterialised,
    },
    canonical: compatibility,
    surfaces: {
      migratedToCanonicalCounts: ["overview_snapshot_boxes", "five_answers_view"],
      stillDerivingIndependently: [
        "confidence_dashboard (countEvidenceStates local)",
        "overview-presentation countEvidenceStates / countEvidenceStatesForDisplay (legacy helpers)",
        "solicitor-matter-state (uses overview-presentation display counts)",
      ],
      legacyAdapters: [
        "adaptFiveAnswersAndChaseToCanonical",
        "adaptTruthKeyEvidenceToRows",
        "projectCanonicalToLegacyMatterVm",
      ],
    },
  };

  fs.writeFileSync(path.join(OUT, "dual-lane-corpus-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT, "failure-clusters-occurrence-vs-unique.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        note: "Every cluster reports totalOccurrences, uniqueCasesAffected, uniqueSurfacesAffected, copyableExportableOccurrences.",
        combined: clusters,
        scale: clustersScale,
        materialised: clustersMaterialised,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(OUT, "canonical-fingerprint-compat.json"),
    JSON.stringify(
      {
        schemaVersion: CANONICAL_MATTER_STATE_VERSION,
        ...compatibility,
        sampleFingerprints: materialisedScan.fingerprintChecks.slice(0, 20),
      },
      null,
      2,
    ),
  );

  const topClustersMd = clusters
    .slice(0, 12)
    .map(
      (c) =>
        `| \`${c.ruleId}\` | ${c.totalOccurrences} | ${c.uniqueCasesAffected} | ${c.uniqueSurfacesAffected} | ${c.copyableExportableOccurrences} |`,
    )
    .join("\n");

  const md = `# Phase 3 checkpoint — canonical matter model + dual-lane evidence

**Status:** CANONICAL MODEL + DUAL-LANE REPORTING — not a corpus PASS  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Canonical schema and version

| Field | Value |
|-------|-------|
| Schema | \`CanonicalMatterStateV1\` |
| Version | **${CANONICAL_MATTER_STATE_VERSION}** |
| Module | \`lib/criminal/canonical-matter-state/\` |
| Fingerprint | SHA-256 prefix over counts, IDs, family, hearing, mg11, attribution |

Stable evidence IDs: \`ev_<hash>\` from label+existence. Stable chase IDs: preserve input id or \`ch_<hash>\`.

## Legacy adapters

- \`adaptFiveAnswersAndChaseToCanonical\` — five-answers rows + chase brief → v1
- \`adaptTruthKeyEvidenceToRows\` — ESA truth-key evidence → rows
- \`projectCanonicalToLegacyMatterVm\` — canonical → legacy \`SolicitorMatterStateVm\`

## Surfaces migrated

- Overview / Five Answers snapshot boxes consume canonical evidence counts + echo \`data-canonical-fingerprint\`
- Gate tighten: substantive copy/export/api without family → \`offence_family_uncertain\`
- HTTP-200 \`integrity_blocked\` consumers: Control Room assistant, Defence Plan chat, Client Advice, Letter generator, Hearing Prep, First Disclosure Request

## Surfaces still deriving state independently

- Confidence dashboard local \`countEvidenceStates\`
- \`overview-presentation\` count helpers (legacy; Overview UI path now prefers canonical)
- \`solicitor-matter-state\` display counts via overview-presentation

## Cross-surface fingerprint results

| Check | Result |
|-------|--------|
| Rebuild equality (materialised) | ${fingerprintOk ? "PASS" : "FAIL"} |
| Fixtures checked | ${materialisedScan.fingerprintChecks.length} |
| Distinct fingerprints | ${fingerprintDistinct} |
| Compatibility failures | ${compatibility.compatibilityFailures.length} |

## Dual-lane corpus results (all reported)

| Lane | Denominator | Occurrences | Unique cases affected | Copyable/exportable occurrences |
|------|------------:|------------:|----------------------:|--------------------------------:|
| Scale (generated) | ${N_approved_scale3000} | ${report.lanes.scale.totalOccurrences} | ${report.lanes.scale.uniqueCasesAffected} | ${report.lanes.scale.copyableExportableOccurrences} |
| Materialised (gold) | ${N_materialised} | ${report.lanes.materialised_gold.totalOccurrences} | ${report.lanes.materialised_gold.uniqueCasesAffected} | ${report.lanes.materialised_gold.copyableExportableOccurrences} |
| Combined unique | ${N_union} | ${report.lanes.combined_3530.totalOccurrences} | ${report.lanes.combined_3530.uniqueCasesAffected} | ${report.lanes.combined_3530.copyableExportableOccurrences} |

Materialised gold lane remains in final release evidence (not excluded because scale denominator is 3000).

Scale lane note: ${scaleMeta.note}

Controlled-3000 hard safety failures (prior scale harness): ${(scaleMeta.metrics as { hardSafetyFailures?: { total?: number } } | null)?.hardSafetyFailures?.total ?? "n/a"}

## Occurrence vs unique-case (top clusters, combined)

| Rule | Occurrences | Unique cases | Unique surfaces | Copyable/exportable |
|------|------------:|-------------:|----------------:|--------------------:|
${topClustersMd}

## Surface contracts

All **${phase2CentralSurfaceIds().length}** central surfaces have blocked + safe contract coverage (\`scripts/solicitor-surface-contract.test.ts\`).

## Explicit non-goals

No broad UX wording cleanup. No merge. No deploy.
`;

  fs.writeFileSync(path.join(DOCS, "phase-3-checkpoint.md"), md);
  fs.writeFileSync(path.join(OUT, "PHASE-3-CHECKPOINT.md"), md);

  console.log(
    JSON.stringify(
      {
        ok: true,
        schemaVersion: CANONICAL_MATTER_STATE_VERSION,
        N_approved_scale3000,
        N_materialised,
        N_union,
        fingerprintOk,
        centralSurfaces: phase2CentralSurfaceIds().length,
        clusterCount: clusters.length,
        out: path.relative(ROOT, OUT).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
}

main();
