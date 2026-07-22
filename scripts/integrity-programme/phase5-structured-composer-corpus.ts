/**
 * Phase 5 — structured composer repair + Phase 4 closure metrics.
 * Run: npx tsx scripts/integrity-programme/phase5-structured-composer-corpus.ts
 *
 * Keeps production-output findings separate from adversarial probe results.
 * "Hidden by gate" is never counted as repaired.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  classifyTextsAgainstConceptRegistry,
  type StructuredProvenanceRef,
} from "@/lib/criminal/offence-family-concept-registry";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import {
  STRUCTURED_SOLICITOR_OUTPUT_VERSION,
  migrateLegacySolicitorString,
} from "@/lib/criminal/structured-solicitor-output";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-5");
const DOCS = path.join(ROOT, "docs/integrity-programme");

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

function evidenceFromTruth(truth: Record<string, unknown>): StructuredProvenanceRef[] {
  const items = (truth.evidenceItems as Array<Record<string, unknown>> | undefined) ?? [];
  const out: StructuredProvenanceRef[] = [];
  for (const it of items) {
    const label = String(it.label ?? it.evidence_item ?? it.name ?? "").trim();
    if (!label) continue;
    const existence = String(it.existence ?? it.correct_evidence_state ?? "unknown");
    out.push({
      evidenceId: `ev_${createHash("sha256").update(`${label}|${existence}`).digest("hex").slice(0, 16)}`,
      label,
      existence,
    });
  }
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
      out.push({
        evidenceId: `ev_${createHash("sha256").update(`${label}|${existence}`).digest("hex").slice(0, 16)}`,
        label,
        existence,
      });
    }
  }
  return out;
}

function walkStrings(v: unknown, out: string[], d = 0) {
  if (d > 5 || out.length > 50) return;
  if (typeof v === "string" && v.length >= 8 && v.length <= 600) out.push(v);
  else if (Array.isArray(v)) v.slice(0, 30).forEach((x) => walkStrings(x, out, d + 1));
  else if (v && typeof v === "object") Object.values(v).slice(0, 30).forEach((x) => walkStrings(x, out, d + 1));
}

type StockHit = {
  fixtureId: string;
  surface: string;
  ruleId: "sentence.raw_extraction_marker" | "sentence.truncated_fragment";
  diagnostic: string;
  disposition: "reconstructed" | "safely_omitted" | "still_blocked";
  before: string;
  after: string | null;
};

type MaterialisedCaseRow = {
  caseId: string;
  primaryFamily: string;
  mixed: boolean;
  uncertain: boolean;
  conditionalAllowed: number;
  unsupportedBlocked: number;
  copyExportUnavailable: boolean;
  activatedFamilies: string[];
};

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  const materialisedIds = fs.existsSync(esaRoot)
    ? fs
        .readdirSync(esaRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(esaRoot, e.name, "truth-key.json")))
        .map((e) => e.name)
        .sort()
    : [];

  const caseRows: MaterialisedCaseRow[] = [];
  const stockHits: StockHit[] = [];
  const beforeAfterExamples: Array<{ fixtureId: string; ruleId: string; before: string; after: string | null; disposition: string }> = [];

  for (const caseId of materialisedIds) {
    const truth = readJson<Record<string, unknown>>(path.join(esaRoot, caseId, "truth-key.json")) ?? {};
    const output = readJson<Record<string, unknown>>(path.join(esaRoot, caseId, "casebrain-output.json"));
    const allegation = String(truth.allegation ?? truth.offenceFamily ?? truth.offenceWording ?? "");
    const auditFamily = String(truth.offenceFamily ?? "");
    const evidence = evidenceFromTruth(truth);
    const hay = `${allegation} ${evidence.map((e) => e.label).join(" ")}`;
    const strings: string[] = [];
    if (output) walkStrings(output, strings);

    const classification = classifyTextsAgainstConceptRegistry(strings.slice(0, 16).length ? strings.slice(0, 16) : ["Acknowledged."], {
      allegation,
      bundleHay: hay,
      auditFamily,
      evidence,
    });

    let copyExportUnavailable = false;
    for (const t of strings.slice(0, 20)) {
      const sentence = assessSolicitorSentence(t);
      const isRaw = sentence.issues.includes("raw_extraction_marker");
      const isTrunc = sentence.issues.includes("truncated_fragment");
      if (!isRaw && !isTrunc) continue;

      const g = gateSolicitorOutput({
        surfaceId: "phase5_stock_copy",
        texts: [t],
        allegation,
        bundleHay: hay,
        evidence,
        auditFamily,
        mode: "copy",
        data: { texts: [t] },
      });
      if (g.status !== "integrity_blocked") continue;
      copyExportUnavailable = true;

      const ruleId = isRaw
        ? ("sentence.raw_extraction_marker" as const)
        : ("sentence.truncated_fragment" as const);
      const migrated = migrateLegacySolicitorString(t, {
        kind: "cps_chase",
        evidenceState: "not_safely_confirmed",
      });
      // Gate-hidden without migrate disposition is still_blocked — never "repaired"
      const disposition = migrated.disposition ?? "still_blocked";
      const hit: StockHit = {
        fixtureId: caseId,
        surface: "casebrain_output.copy",
        ruleId,
        diagnostic: redact(t),
        disposition,
        before: redact(t),
        after: migrated.text ? redact(migrated.text) : null,
      };
      stockHits.push(hit);
      if (beforeAfterExamples.length < 12) {
        beforeAfterExamples.push({
          fixtureId: caseId,
          ruleId,
          before: redact(t),
          after: hit.after,
          disposition,
        });
      }
    }

    // Also mark copy unavailable when family/uncertain blocks substantive strings
    for (const t of strings.slice(0, 8)) {
      const g = gateSolicitorOutput({
        surfaceId: "phase5_family_copy",
        texts: [t],
        allegation,
        bundleHay: hay,
        evidence,
        auditFamily,
        mode: "copy",
        data: { texts: [t] },
      });
      if (g.status === "integrity_blocked") copyExportUnavailable = true;
    }

    caseRows.push({
      caseId,
      primaryFamily: classification.primary.family,
      mixed: classification.mixedFamily,
      uncertain: classification.uncertain || classification.primary.failClosed,
      conditionalAllowed: classification.conditionalAllowed.length,
      unsupportedBlocked: classification.unsupportedBlocked.length,
      copyExportUnavailable,
      activatedFamilies: [...new Set(classification.activatedFamilies.map((a) => a.family))],
    });
  }

  // --- Phase 4 closure: mixed ∩ uncertain overlap ---
  const mixedIds = new Set(caseRows.filter((r) => r.mixed).map((r) => r.caseId));
  const uncertainIds = new Set(caseRows.filter((r) => r.uncertain).map((r) => r.caseId));
  const mixedAndUncertain = [...mixedIds].filter((id) => uncertainIds.has(id));
  const mixedOnly = [...mixedIds].filter((id) => !uncertainIds.has(id));
  const uncertainOnly = [...uncertainIds].filter((id) => !mixedIds.has(id));

  // Coverage table by family
  const families = [...new Set(caseRows.map((r) => r.primaryFamily))].sort();
  const coverageTable = families.map((family) => {
    const rows = caseRows.filter((r) => r.primaryFamily === family);
    const resolved = rows.filter((r) => !r.uncertain);
    const mixedResolved = resolved.filter((r) => r.mixed);
    const uncertain = rows.filter((r) => r.uncertain);
    return {
      family,
      resolvedCases: resolved.length,
      mixedResolvedCases: mixedResolved.length,
      uncertainCases: uncertain.length,
      unsupportedConceptsBlocked: rows.reduce((a, r) => a + r.unsupportedBlocked, 0),
      conditionalConceptsAllowed: rows.reduce((a, r) => a + r.conditionalAllowed, 0),
      substantiveCopyExportUnavailable: rows.filter((r) => r.copyExportUnavailable).length,
    };
  });

  // Stratified FP/FN review sample
  const stratifiedReview = {
    note: "Human review sample across charge families — not auto-PASS. Includes uncertain, mixed, allowed, blocked.",
    samples: [] as Array<{
      stratum: string;
      caseId: string;
      primaryFamily: string;
      mixed: boolean;
      uncertain: boolean;
      unsupportedBlocked: number;
      conditionalAllowed: number;
      diagnostic: string;
    }>,
  };
  const pick = (stratum: string, pred: (r: MaterialisedCaseRow) => boolean, n = 4) => {
    for (const r of caseRows.filter(pred).slice(0, n)) {
      stratifiedReview.samples.push({
        stratum,
        caseId: r.caseId,
        primaryFamily: r.primaryFamily,
        mixed: r.mixed,
        uncertain: r.uncertain,
        unsupportedBlocked: r.unsupportedBlocked,
        conditionalAllowed: r.conditionalAllowed,
        diagnostic: redact(`${r.primaryFamily}|${r.activatedFamilies.join(",")}`),
      });
    }
  };
  pick("uncertain", (r) => r.uncertain);
  pick("mixed_resolved", (r) => r.mixed && !r.uncertain);
  pick("allowed_clean", (r) => !r.uncertain && r.unsupportedBlocked === 0 && r.conditionalAllowed >= 0);
  pick("blocked_unsupported", (r) => r.unsupportedBlocked > 0);
  pick("copy_unavailable", (r) => r.copyExportUnavailable);

  // Adversarial vs production — keep separate
  const adversarial = {
    note: "Adversarial probe results only — NOT combined into production defect rates.",
    scaleProbe: {
      identities: 3000,
      method: "Cross-family probe texts per audit family (Phase 4) — containment proof only",
      doNotCombineWithProduction: true,
    },
    productionMaterialised: {
      casesScanned: materialisedIds.length,
      stockRawCopyableHits: stockHits.filter((h) => h.ruleId === "sentence.raw_extraction_marker").length,
      stockTruncCopyableHits: stockHits.filter((h) => h.ruleId === "sentence.truncated_fragment").length,
    },
  };

  const phase3 = readJson<{
    combined?: Array<{ ruleId: string; copyableExportableOccurrences?: number }>;
  }>(
    path.join(
      ROOT,
      "artifacts/casebrain-qa/integrity-programme/phase-3/failure-clusters-occurrence-vs-unique.json",
    ),
  );
  const priorRaw =
    phase3?.combined?.find((c) => c.ruleId === "sentence.raw_extraction_marker")?.copyableExportableOccurrences ?? 72;
  const priorTrunc =
    phase3?.combined?.find((c) => c.ruleId === "sentence.truncated_fragment")?.copyableExportableOccurrences ?? 28;

  const rawHits = stockHits.filter((h) => h.ruleId === "sentence.raw_extraction_marker");
  const truncHits = stockHits.filter((h) => h.ruleId === "sentence.truncated_fragment");
  const countDisp = (hits: StockHit[]) => ({
    reconstructed: hits.filter((h) => h.disposition === "reconstructed").length,
    safely_omitted: hits.filter((h) => h.disposition === "safely_omitted").length,
    still_blocked: hits.filter((h) => h.disposition === "still_blocked").length,
    total: hits.length,
  });

  const uniqueCasesStock = new Set(stockHits.map((h) => h.fixtureId)).size;
  const uniqueSurfacesStock = new Set(stockHits.map((h) => h.surface)).size;

  const composersMigrated = [
    "structured-solicitor-output (new v1.0.0)",
    "buildDisclosureChaseBrief.toCourtLine / draftChaseWording",
    "pack-aa-messy-parsers MG6 list joins (pipe → semicolon)",
    "HearingWarRoom sayThis export (pipe → bullets)",
    "build-client-explanation dedupe + structured field assess",
    "solicitor-sentence-composer abbreviation-safe truncation",
  ];
  const legacyRemaining = [
    "app/api/criminal/[caseId]/defence-plan-chat/route.ts (eval evidence joins — isolated / gated)",
    "confidence_dashboard countEvidenceStates (canonical migration ≤ Phase 6)",
    "overview-presentation count helpers (canonical migration ≤ Phase 6)",
    "solicitor-matter-state display counts (canonical migration ≤ Phase 6)",
    "Some disclosure-export assembleFullText section joiners (newline OK; migrate to structured blocks next)",
  ];

  const uncertainUsability = {
    uncertainCases: uncertainIds.size,
    mixedAndUncertainOverlap: mixedAndUncertain.length,
    note: "Uncertain family still fail-closes substantive copy/API/export; neutral non-substantive ack remains usable. Scoped view can keep clean lines.",
  };

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 5,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Phase 5 structured-composer repair — not a corpus PASS. Phase 4 remains safe-but-unresolved. Hidden-by-gate ≠ repaired. Do not merge / do not deploy.",
    structuredComposerVersion: STRUCTURED_SOLICITOR_OUTPUT_VERSION,
    phase4Closure: {
      materialisedMixedCount: mixedIds.size,
      materialisedUncertainCount: uncertainIds.size,
      mixedAndUncertainOverlap: mixedAndUncertain.length,
      mixedOnly: mixedOnly.length,
      uncertainOnly: uncertainOnly.length,
      overlapCaseIdsSample: mixedAndUncertain.slice(0, 40),
      coverageTable,
      stratifiedFalsePositiveFalseNegativeReview: stratifiedReview,
      provenanceRule:
        "Conditional / source-backed requires evidenceId AND label content supporting the concept — ID alone insufficient.",
    },
    adversarialVersusProduction: adversarial,
    stockRepair: {
      priorPhase3CopyableRaw: priorRaw,
      priorPhase3CopyableTruncated: priorTrunc,
      scannedCopyableRaw: countDisp(rawHits),
      scannedCopyableTruncated: countDisp(truncHits),
      uniqueCasesAffected: uniqueCasesStock,
      uniqueSurfacesAffected: uniqueSurfacesStock,
      note: "Disposition is reconstructed | safely_omitted | still_blocked. Gate-hidden without reconstruction is still_blocked.",
    },
    composersMigrated,
    legacyComposersRemaining: legacyRemaining,
    beforeAfterExamples,
    compatibilityFailures: [] as string[],
    uncertainFamilyUsabilityImpact: uncertainUsability,
    canonicalMigrationDeadline: "Phase 6 — confidence dashboard, overview-presentation helpers, solicitor-matter-state",
  };

  // Compatibility smoke: clean court compose still renders
  {
    const smoke = migrateLegacySolicitorString(
      "The defence asks the court to record that attribution remains outstanding on the current papers.",
      { kind: "court_line" },
    );
    if (!smoke.ok) report.compatibilityFailures.push("clean_court_line_migration_failed");
  }

  fs.writeFileSync(path.join(OUT, "structured-composer-corpus-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT, "phase4-closure-coverage.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        overlap: report.phase4Closure,
        coverageTable,
        stratifiedReview,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(OUT, "stock-raw-truncated-dispositions.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        priorRaw,
        priorTrunc,
        raw: countDisp(rawHits),
        truncated: countDisp(truncHits),
        hits: stockHits.slice(0, 500),
        truncatedHitsList: true,
        totalHits: stockHits.length,
      },
      null,
      2,
    ),
  );

  const covMd = coverageTable
    .map(
      (c) =>
        `| ${c.family} | ${c.resolvedCases} | ${c.mixedResolvedCases} | ${c.uncertainCases} | ${c.unsupportedConceptsBlocked} | ${c.conditionalConceptsAllowed} | ${c.substantiveCopyExportUnavailable} |`,
    )
    .join("\n");

  const md = `# Phase 5 checkpoint — structured composer repair

**Status:** STRUCTURED COMPOSER MIGRATION IN PROGRESS — **not a corpus PASS**  
**Phase 4 status:** safe-but-unresolved (not PASS)  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Structured composer

| Field | Value |
|-------|-------|
| Version | **${STRUCTURED_SOLICITOR_OUTPUT_VERSION}** |
| Module | \`lib/criminal/structured-solicitor-output/\` |
| Fields | subject · evidenceState · sourceEvidenceId · whyItMatters · requestedAction · hearingDeadlineState · safetyQualification · sourceQuotation |

Rendering rules enforced: no arbitrary bullet punctuation-joins; no speculative quotation completion; no source excerpts as headings; no raw delimiters/placeholders; no contradictory served/missing; no partial sentences; legitimate abbreviations preserved.

## Phase 4 closure (materialised)

| Metric | Count |
|--------|------:|
| Mixed | ${mixedIds.size} |
| Uncertain | ${uncertainIds.size} |
| **Mixed ∩ uncertain overlap** | **${mixedAndUncertain.length}** |
| Mixed only | ${mixedOnly.length} |
| Uncertain only | ${uncertainOnly.length} |

### Family / charge coverage (materialised production)

| Family | Resolved | Mixed resolved | Uncertain | Unsupported blocked | Conditional allowed | Copy/export unavailable |
|--------|---------:|---------------:|----------:|--------------------:|--------------------:|------------------------:|
${covMd}

Stratified FP/FN review sample: ${stratifiedReview.samples.length} cases across uncertain / mixed / allowed / blocked strata (see \`phase4-closure-coverage.json\`).

Provenance: structured evidence ID **and** supporting label content required — ID alone insufficient.

## Actual production vs adversarial

| Lane | Role |
|------|------|
| Production (materialised casebrain-output) | Stock raw/truncated dispositions below |
| Adversarial (scale probes) | Containment only — **never** folded into production defect rates |

${adversarial.scaleProbe.method}

## Stock repair (72 raw / 28 truncated prior copyable)

| Stock | Prior (Phase 3 copyable) | Scanned copyable | Reconstructed | Safely omitted | Still blocked |
|-------|-------------------------:|-----------------:|--------------:|---------------:|--------------:|
| Raw marker | ${priorRaw} | ${countDisp(rawHits).total} | ${countDisp(rawHits).reconstructed} | ${countDisp(rawHits).safely_omitted} | ${countDisp(rawHits).still_blocked} |
| Truncated | ${priorTrunc} | ${countDisp(truncHits).total} | ${countDisp(truncHits).reconstructed} | ${countDisp(truncHits).safely_omitted} | ${countDisp(truncHits).still_blocked} |

Unique cases affected (stock): ${uniqueCasesStock} · Unique surfaces: ${uniqueSurfacesStock}

**Hidden by gate is not counted as repaired.**

### Before / after examples (redacted)

${beforeAfterExamples
  .slice(0, 8)
  .map((e) => `- \`${e.fixtureId}\` ${e.ruleId}: ${e.disposition} — before ${e.before} → after ${e.after ?? "null"}`)
  .join("\n")}

## Composers migrated

${composersMigrated.map((c) => `- ${c}`).join("\n")}

## Legacy composers remaining

${legacyRemaining.map((c) => `- ${c}`).join("\n")}

## Compatibility failures

${report.compatibilityFailures.length ? report.compatibilityFailures.map((c) => `- ${c}`).join("\n") : "- none in smoke checks"}

## Uncertain-family usability impact

Uncertain cases: ${uncertainIds.size}. Substantive copy/API/export remain fail-closed; neutral non-substantive responses stay usable; scoped view can retain clean lines.

## Canonical migration deadline

Confidence dashboard, overview-presentation helpers, and solicitor-matter-state: **no later than Phase 6**.

## Explicit non-goals

No merge. No deploy. No claim that Phase 4 is PASS. No folding adversarial probe blocks into production defect rates.
`;

  fs.writeFileSync(path.join(DOCS, "phase-5-checkpoint.md"), md);
  fs.writeFileSync(path.join(OUT, "PHASE-5-CHECKPOINT.md"), md);

  // Update Phase 4 checkpoint note that closure metrics live in Phase 5
  const p4path = path.join(DOCS, "phase-4-checkpoint.md");
  if (fs.existsSync(p4path)) {
    let p4 = fs.readFileSync(p4path, "utf8");
    if (!p4.includes("Phase 4 closure metrics")) {
      p4 += `\n\n## Phase 4 closure metrics\n\nReported with Phase 5 (mixed∩uncertain overlap, coverage table, stratified review): see \`docs/integrity-programme/phase-5-checkpoint.md\` and \`artifacts/casebrain-qa/integrity-programme/phase-5/phase4-closure-coverage.json\`.\n\n**Phase 4 remains safe-but-unresolved — not PASS.**\n`;
      fs.writeFileSync(p4path, p4);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        composerVersion: STRUCTURED_SOLICITOR_OUTPUT_VERSION,
        mixedUncertainOverlap: mixedAndUncertain.length,
        raw: countDisp(rawHits),
        trunc: countDisp(truncHits),
        compatibilityFailures: report.compatibilityFailures.length,
        out: path.relative(ROOT, OUT).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
}

main();
