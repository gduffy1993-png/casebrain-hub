/**
 * Phase 4 — offence-family concept registry classification across dual corpus lanes.
 * Run: npx tsx scripts/integrity-programme/phase4-family-registry-corpus.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  classifyTextsAgainstConceptRegistry,
  mapAuditScenarioFamilyToSolicitor,
  OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION,
  type StructuredProvenanceRef,
} from "@/lib/criminal/offence-family-concept-registry";
import { resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-4");
const DOCS = path.join(ROOT, "docs/integrity-programme");

type Lane = "scale" | "materialised";

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

function loadScaleCases(): Array<{ caseId: string; family: string }> {
  const messyPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
  );
  const raw = fs.readFileSync(messyPath, "utf8");
  const re = /"caseId":\s*"([^"]+)",\s*"family":\s*"([^"]+)"/g;
  const out: Array<{ caseId: string; family: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    out.push({ caseId: m[1]!, family: m[2]! });
  }
  return out;
}

function loadMaterialisedIds(): string[] {
  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  const ids: string[] = [];
  if (!fs.existsSync(esaRoot)) return ids;
  for (const entry of fs.readdirSync(esaRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (fs.existsSync(path.join(esaRoot, entry.name, "truth-key.json"))) ids.push(entry.name);
  }
  return ids.sort();
}

function mapAuditToSolicitor(auditFamily: string) {
  return (
    mapAuditScenarioFamilyToSolicitor(auditFamily) ??
    resolveSolicitorOffenceFamily({ allegation: auditFamily.replace(/-/g, " "), bundleHay: auditFamily })
      .family
  );
}

type CaseClass = {
  caseId: string;
  lane: Lane;
  primaryFamily: string;
  activatedFamilies: string[];
  mixedFamily: boolean;
  uncertain: boolean;
  conditionalAllowed: number;
  unsupportedBlocked: number;
  copyExportBlocked: boolean;
  rawMarkerCopyable: boolean;
  truncatedCopyable: boolean;
};

type LaneStats = {
  denominator: number;
  familyDistribution: Record<string, number>;
  mixedFamilyCount: number;
  uncertainCount: number;
  conditionalConceptsAllowed: number;
  unsupportedConceptsBlocked: number;
  uniqueAffectedCases: number;
  copyExportBlocks: number;
  rawMarkerCopyableOccurrences: number;
  truncatedCopyableOccurrences: number;
};

function emptyLaneStats(denominator: number): LaneStats {
  return {
    denominator,
    familyDistribution: {},
    mixedFamilyCount: 0,
    uncertainCount: 0,
    conditionalConceptsAllowed: 0,
    unsupportedConceptsBlocked: 0,
    uniqueAffectedCases: 0,
    copyExportBlocks: 0,
    rawMarkerCopyableOccurrences: 0,
    truncatedCopyableOccurrences: 0,
  };
}

function accumulate(stats: LaneStats, row: CaseClass) {
  stats.familyDistribution[row.primaryFamily] = (stats.familyDistribution[row.primaryFamily] ?? 0) + 1;
  if (row.mixedFamily) stats.mixedFamilyCount += 1;
  if (row.uncertain) stats.uncertainCount += 1;
  stats.conditionalConceptsAllowed += row.conditionalAllowed;
  stats.unsupportedConceptsBlocked += row.unsupportedBlocked;
  if (row.unsupportedBlocked > 0 || row.copyExportBlocked || row.uncertain) {
    stats.uniqueAffectedCases += 1;
  }
  if (row.copyExportBlocked) stats.copyExportBlocks += 1;
  if (row.rawMarkerCopyable) stats.rawMarkerCopyableOccurrences += 1;
  if (row.truncatedCopyable) stats.truncatedCopyableOccurrences += 1;
}

function classifyScaleCase(caseId: string, auditFamily: string): CaseClass {
  const mapped = mapAuditToSolicitor(auditFamily);
  const allegationSeed =
    mapped === "unknown"
      ? auditFamily.replace(/-/g, " ")
      : {
          harassment_digital: "Harassment Protection from Harassment Act phone WhatsApp",
          harassment_other: "Harassment Protection from Harassment Act",
          violence: "GBH assault",
          drugs_possession: "Possession of a controlled drug",
          drugs_supply: "PWITS intent to supply",
          theft: "Theft dishonest appropriation",
          motoring: "Drink drive road traffic",
        }[mapped as string] ?? auditFamily;

  // Synthetic probe texts: native-safe + three unsupported cross-family probes
  const texts = [
    "Attribution remains outstanding on the served screenshots.",
    "Consider defensive force and PWITS continuity.",
    "Vehicle ownership remains key for the timetable.",
  ];
  const c = classifyTextsAgainstConceptRegistry(texts, {
    allegation: allegationSeed,
    bundleHay: auditFamily,
    auditFamily,
    evidence: [],
  });

  const copyGate = gateSolicitorOutput({
    surfaceId: "phase4_scale_copy_probe",
    texts: [texts[1]!],
    allegation: allegationSeed,
    bundleHay: auditFamily,
    auditFamily,
    mode: "copy",
    data: { texts: [texts[1]!] },
  });

  return {
    caseId,
    lane: "scale",
    primaryFamily: c.primary.family,
    activatedFamilies: [...new Set(c.activatedFamilies.map((a) => a.family))],
    mixedFamily: c.mixedFamily,
    uncertain: c.uncertain || c.primary.failClosed,
    conditionalAllowed: c.conditionalAllowed.length,
    unsupportedBlocked: c.unsupportedBlocked.length,
    copyExportBlocked: copyGate.status === "integrity_blocked",
    rawMarkerCopyable: false,
    truncatedCopyable: false,
  };
}

function evidenceFromTruth(truth: Record<string, unknown>): StructuredProvenanceRef[] {
  const items = (truth.evidenceItems as Array<Record<string, unknown>> | undefined) ?? [];
  const out: StructuredProvenanceRef[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const label = String(
      it.label ?? it.evidence_item ?? it.name ?? "",
    ).trim();
    if (!label) continue;
    const existence = String(it.existence ?? it.correct_evidence_state ?? "unknown");
    const id = `ev_${createHash("sha256").update(`${label}|${existence}`).digest("hex").slice(0, 16)}`;
    out.push({
      evidenceId: id,
      label,
      existence,
      sourceDocument: (it.sourceDocument as string) ?? (it.source_page_anchor as string) ?? null,
      sourcePage: (it.sourcePage as string) ?? null,
    });
  }
  // simulator v2 lists
  for (const key of ["servedEvidence", "referredOnlyEvidence", "missingEvidence", "uncertainEvidence"] as const) {
    const arr = truth[key];
    if (!Array.isArray(arr)) continue;
    for (const labelRaw of arr) {
      const label = String(labelRaw).trim();
      if (!label) continue;
      const existence =
        key === "servedEvidence"
          ? "served"
          : key === "referredOnlyEvidence"
            ? "referred_only"
            : key === "missingEvidence"
              ? "missing"
              : "not_safely_confirmed";
      const id = `ev_${createHash("sha256").update(`${label}|${existence}`).digest("hex").slice(0, 16)}`;
      out.push({ evidenceId: id, label, existence });
    }
  }
  return out;
}

function classifyMaterialised(caseId: string): CaseClass {
  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  const truth = readJson<Record<string, unknown>>(path.join(esaRoot, caseId, "truth-key.json")) ?? {};
  const output = readJson<Record<string, unknown>>(path.join(esaRoot, caseId, "casebrain-output.json"));
  const allegation = String(truth.allegation ?? truth.offenceFamily ?? truth.offenceWording ?? "");
  const auditFamily = String(truth.offenceFamily ?? "");
  const evidence = evidenceFromTruth(truth);
  const hay = `${allegation} ${evidence.map((e) => e.label).join(" ")}`;

  const strings: string[] = [];
  const walk = (v: unknown, d: number) => {
    if (d > 5 || strings.length > 40) return;
    if (typeof v === "string" && v.length >= 12 && v.length <= 500) strings.push(v);
    else if (Array.isArray(v)) v.slice(0, 25).forEach((x) => walk(x, d + 1));
    else if (v && typeof v === "object") Object.values(v).slice(0, 25).forEach((x) => walk(x, d + 1));
  };
  if (output) walk(output, 0);
  const texts = strings.slice(0, 16);
  const probeTexts =
    texts.length > 0
      ? texts
      : ["Attribution remains outstanding on the served screenshots.", "Consider defensive force and PWITS continuity."];

  const c = classifyTextsAgainstConceptRegistry(probeTexts, {
    allegation,
    bundleHay: hay,
    auditFamily,
    evidence,
  });

  let rawMarkerCopyable = false;
  let truncatedCopyable = false;
  let copyExportBlocked = false;
  for (const t of probeTexts.slice(0, 12)) {
    const sentence = assessSolicitorSentence(t);
    const g = gateSolicitorOutput({
      surfaceId: "phase4_materialised_copy",
      texts: [t],
      allegation,
      bundleHay: hay,
      auditFamily,
      evidence,
      mode: "copy",
      data: { texts: [t] },
    });
    if (g.status === "integrity_blocked") {
      copyExportBlocked = true;
      if (sentence.issues.includes("raw_extraction_marker")) rawMarkerCopyable = true;
      if (sentence.issues.includes("truncated_fragment")) truncatedCopyable = true;
    }
  }

  return {
    caseId,
    lane: "materialised",
    primaryFamily: c.primary.family,
    activatedFamilies: [...new Set(c.activatedFamilies.map((a) => a.family))],
    mixedFamily: c.mixedFamily,
    uncertain: c.uncertain || c.primary.failClosed,
    conditionalAllowed: c.conditionalAllowed.length,
    unsupportedBlocked: c.unsupportedBlocked.length,
    copyExportBlocked,
    rawMarkerCopyable,
    truncatedCopyable,
  };
}

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const scaleCases = loadScaleCases();
  const materialisedIds = loadMaterialisedIds();
  const N_scale = scaleCases.length;
  const N_materialised = materialisedIds.length;
  const N_union = new Set([...scaleCases.map((c) => c.caseId), ...materialisedIds]).size;

  const scaleRows = scaleCases.map((c) => classifyScaleCase(c.caseId, c.family));
  const materialisedRows = materialisedIds.map((id) => classifyMaterialised(id));

  const scaleStats = emptyLaneStats(N_scale);
  const materialisedStats = emptyLaneStats(N_materialised);
  for (const r of scaleRows) accumulate(scaleStats, r);
  for (const r of materialisedRows) accumulate(materialisedStats, r);

  // Combined: unique case ids; prefer materialised row when both (none expected)
  const byId = new Map<string, CaseClass>();
  for (const r of scaleRows) byId.set(r.caseId, r);
  for (const r of materialisedRows) byId.set(r.caseId, r);
  const combinedRows = [...byId.values()];
  const combinedStats = emptyLaneStats(N_union);
  for (const r of combinedRows) accumulate(combinedStats, r);

  // Prior Phase-3 copyable raw/truncated confirmation (baseline + gate still blocks)
  const phase3Clusters = readJson<{
    combined?: Array<{
      ruleId: string;
      copyableExportableOccurrences?: number;
      totalOccurrences?: number;
    }>;
  }>(
    path.join(
      ROOT,
      "artifacts/casebrain-qa/integrity-programme/phase-3/failure-clusters-occurrence-vs-unique.json",
    ),
  );
  const phase3Raw =
    phase3Clusters?.combined?.find((c) => c.ruleId === "sentence.raw_extraction_marker")
      ?.copyableExportableOccurrences ?? null;
  const phase3Trunc =
    phase3Clusters?.combined?.find((c) => c.ruleId === "sentence.truncated_fragment")
      ?.copyableExportableOccurrences ?? null;

  const rawStillBlocked = gateSolicitorOutput({
    surfaceId: "confirm_raw",
    texts: ["MG6C disclosure schedule | 4 | remains outstanding."],
    allegation: "Harassment via WhatsApp",
    bundleHay: "WhatsApp MG11",
    mode: "copy",
    data: { texts: ["MG6C disclosure schedule | 4 | remains outstanding."] },
  });
  const truncStillBlocked = gateSolicitorOutput({
    surfaceId: "confirm_trunc",
    texts: ["Chase the and"],
    allegation: "Harassment via WhatsApp",
    bundleHay: "WhatsApp MG11",
    mode: "copy",
    data: { texts: ["Chase the and"] },
  });

  const falsePositiveSample = materialisedRows
    .filter((r) => r.unsupportedBlocked > 0 && r.mixedFamily)
    .slice(0, 25)
    .map((r) => ({
      caseId: r.caseId,
      primaryFamily: r.primaryFamily,
      activatedFamilies: r.activatedFamilies,
      unsupportedBlocked: r.unsupportedBlocked,
      diagnostic: redact(`${r.primaryFamily}|${r.activatedFamilies.join(",")}`),
      reviewNote: "Mixed activation with unsupported residual — human review for over-block risk",
    }));

  const migrationPlan = {
    deadline: "Shared composer / validator phases (programme Phases 5–6); no later than those phases.",
    remainingIndependentCalculators: [
      {
        id: "confidence_dashboard.countEvidenceStates",
        path: "lib/criminal/confidence-dashboard/build-confidence-dashboard.ts",
        action: "Replace local counts with CanonicalMatterStateV1.evidence.counts (+ fingerprint echo)",
        deprecateBy: "Phase 5 shared composer / Phase 6 validator",
      },
      {
        id: "overview-presentation.countEvidenceStates*",
        path: "lib/criminal/overview-presentation.ts",
        action: "Mark helpers legacy; call sites must use canonical adapter or validated projection",
        deprecateBy: "Phase 5 shared composer / Phase 6 validator",
      },
      {
        id: "solicitor-matter-state display counts",
        path: "lib/criminal/solicitor-matter-state.ts",
        action: "Consume projectCanonicalToLegacyMatterVm only — remove independent recount",
        deprecateBy: "Phase 5 shared composer / Phase 6 validator",
      },
    ],
    note: "CanonicalMatterStateV1 is foundational but not fully migrated — do not claim one canonical truth until these three and every substantive output surface consume it or an explicit validated adapter.",
  };

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 4,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Phase 4 family registry classification — not a corpus PASS. Hiding uncertain output is not a pass. Do not merge / do not deploy.",
    registryVersion: OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION,
    corpus: {
      N_approved_scale3000: N_scale,
      N_materialised: N_materialised,
      N_union,
    },
    lanes: {
      scale: scaleStats,
      materialised_gold: materialisedStats,
      combined_3530: combinedStats,
    },
    pendingComposerRepair: {
      phase3CopyableRawMarkerOccurrences: phase3Raw,
      phase3CopyableTruncatedOccurrences: phase3Trunc,
      stillBlockedOnCopy: {
        raw_extraction_marker: rawStillBlocked.status === "integrity_blocked",
        truncated_fragment: truncStillBlocked.status === "integrity_blocked",
      },
      note: "Confirm existing 72 raw-marker and 28 truncated copyable occurrences remain blocked pending later composer/provenance repair.",
    },
    falsePositiveReviewSample: falsePositiveSample,
    migrationPlan,
    unresolved: {
      canonicalNotFullyMigrated: true,
      independentStateCalculators: 3,
      composerRepairPending: true,
      scaleLaneUsesAuditFamilyProbes: true,
    },
  };

  fs.writeFileSync(path.join(OUT, "family-registry-corpus-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT, "migration-plan-independent-state-calculators.json"),
    JSON.stringify(migrationPlan, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT, "false-positive-review-sample.json"),
    JSON.stringify({ generatedAt: report.generatedAt, sample: falsePositiveSample }, null, 2),
  );

  const fmtDist = (d: Record<string, number>) =>
    Object.entries(d)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`)
      .join("\n");

  const md = `# Phase 4 checkpoint — offence-family concept registry

**Status:** REGISTRY + DUAL-LANE FAMILY CLASSIFICATION — **not a corpus PASS**  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

> CanonicalMatterStateV1 is **foundational but not fully migrated**. Do not claim one canonical truth until confidence dashboard, overview-presentation helpers, solicitor-matter-state, and every substantive output surface consume the canonical model or an explicit validated adapter.

## Registry

| Field | Value |
|-------|-------|
| Version | **${OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION}** |
| Module | \`lib/criminal/offence-family-concept-registry/\` |
| Tiers | allowed · conditional_provenance · forbidden · uncertain_fail_closed |

Source-backed / conditional allowance requires **structured provenance + evidence IDs**. Keyword presence in free-text hay alone does **not** activate another family.

Mixed-family: every activated family is recorded with activation source (allegation / evidence_item / audit / truth-key).

Scoped blocking: view mode can withhold only leaked lines; copy/API/export still fail closed on affected substantive output. One optional advanced leak must not wipe the whole matter view.

## Dual-lane results

| Lane | Denom | Mixed | Uncertain | Conditional allowed | Unsupported blocked | Unique affected | Copy/export blocks |
|------|------:|------:|----------:|--------------------:|--------------------:|----------------:|-------------------:|
| Scale | ${N_scale} | ${scaleStats.mixedFamilyCount} | ${scaleStats.uncertainCount} | ${scaleStats.conditionalConceptsAllowed} | ${scaleStats.unsupportedConceptsBlocked} | ${scaleStats.uniqueAffectedCases} | ${scaleStats.copyExportBlocks} |
| Materialised (gold) | ${N_materialised} | ${materialisedStats.mixedFamilyCount} | ${materialisedStats.uncertainCount} | ${materialisedStats.conditionalConceptsAllowed} | ${materialisedStats.unsupportedConceptsBlocked} | ${materialisedStats.uniqueAffectedCases} | ${materialisedStats.copyExportBlocks} |
| Combined | ${N_union} | ${combinedStats.mixedFamilyCount} | ${combinedStats.uncertainCount} | ${combinedStats.conditionalConceptsAllowed} | ${combinedStats.unsupportedConceptsBlocked} | ${combinedStats.uniqueAffectedCases} | ${combinedStats.copyExportBlocks} |

### Family distribution — scale

| Family | Count |
|--------|------:|
${fmtDist(scaleStats.familyDistribution)}

### Family distribution — materialised

| Family | Count |
|--------|------:|
${fmtDist(materialisedStats.familyDistribution)}

## Pending composer / provenance repair

| Metric | Value |
|--------|------:|
| Phase-3 copyable raw-marker occurrences | ${phase3Raw ?? "n/a"} |
| Phase-3 copyable truncated occurrences | ${phase3Trunc ?? "n/a"} |
| Raw marker still blocked on copy | ${rawStillBlocked.status === "integrity_blocked"} |
| Truncated still blocked on copy | ${truncStillBlocked.status === "integrity_blocked"} |

These remain blocked pending later composer/provenance repair — **not** cleared by family registry work.

## False-positive review sample

${falsePositiveSample.length} mixed cases with residual unsupported blocks sampled for human review (see \`false-positive-review-sample.json\`).

## Migration plan — independent state calculators

Deadline: **no later than shared composer / validator phases (Phases 5–6)**.

1. \`confidence_dashboard\` local \`countEvidenceStates\` → canonical counts + fingerprint
2. \`overview-presentation\` count helpers → legacy-only; validated adapter at call sites
3. \`solicitor-matter-state\` → \`projectCanonicalToLegacyMatterVm\` only

## Correctly classified vs still unresolved

**Classified / enforced this phase**
- Harassment blocks unsupported drugs / vehicle / self-defence (adversarial)
- Source-backed mixed passes only with evidence IDs
- Keyword-alone activation rejected
- Missing family blocks substantive copy/API/export; neutral ack remains usable
- Scoped view withholding of leaked lines

**Still unresolved (not a PASS)**
- Full canonical migration of three independent calculators
- Composer repair for raw-marker / truncated copyable stock
- Scale lane uses audit-family probes (full generated wording not on disk for all 3000)
- Residual unsupported / uncertain counts above — hidden output ≠ correct output

## Explicit non-goals

No broad UX wording cleanup. No merge. No deploy. No claim that uncertain outputs being hidden equals PASS.
`;

  fs.writeFileSync(path.join(DOCS, "phase-4-checkpoint.md"), md);
  fs.writeFileSync(path.join(OUT, "PHASE-4-CHECKPOINT.md"), md);
  fs.writeFileSync(path.join(DOCS, "phase-4-migration-plan-independent-state.md"), `# Phase 4 — migration plan for independent state calculators

${migrationPlan.note}

**Deadline:** ${migrationPlan.deadline}

| Calculator | Path | Action | Deprecate by |
|------------|------|--------|--------------|
${migrationPlan.remainingIndependentCalculators.map((c) => `| \`${c.id}\` | \`${c.path}\` | ${c.action} | ${c.deprecateBy} |`).join("\n")}
`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        registryVersion: OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION,
        N_scale,
        N_materialised,
        N_union,
        scaleMixed: scaleStats.mixedFamilyCount,
        materialisedUncertain: materialisedStats.uncertainCount,
        pendingRaw: phase3Raw,
        pendingTrunc: phase3Trunc,
        out: path.relative(ROOT, OUT).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
}

main();
