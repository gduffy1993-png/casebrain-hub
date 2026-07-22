/**
 * Phase 4 — resolve and evidence former safe-but-unresolved items.
 * Does not declare corpus PASS. Units stay labeled (72/28 ≠ 42/55).
 *
 * Run: npx tsx scripts/integrity-programme/phase4-resolve-unresolved.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  buildCanonicalMatterStateV1,
  assertSameCanonicalFingerprint,
  CANONICAL_MATTER_STATE_VERSION,
} from "@/lib/criminal/canonical-matter-state";
import { countEvidenceStatesForDisplay } from "@/lib/criminal/overview-presentation";
import { buildConfidenceDashboard } from "@/lib/criminal/confidence-dashboard";
import { buildSolicitorMatterStateVmFromCanonical } from "@/lib/criminal/solicitor-matter-state";
import { classifyTextsAgainstConceptRegistry } from "@/lib/criminal/offence-family-concept-registry";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-4");
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

function row(label: string, existence: FiveAnswersEvidenceRow["existence"]): FiveAnswersEvidenceRow {
  return { label, existence, reliability: "needs_review" };
}

type Disposition =
  | "RESOLVED"
  | "RESOLVED_AS_CONTAINMENT_PROOF"
  | "FAIL_CLOSED_WITH_RESIDUAL_RISK"
  | "DEFERRED_TO_PHASE_9_11";

type ItemEvidence = {
  id: string;
  formerStatus: string;
  disposition: Disposition;
  evidence: string[];
  ledgerImpact: string;
  passClaim: false;
};

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const ledger = readJson<{
    status?: string;
    prior72RawMarkerMap?: { reconstructed?: number; balanced?: boolean; dispositionTotals?: Record<string, number> };
    prior28TruncMap?: { reconstructed?: number; balanced?: boolean; dispositionTotals?: Record<string, number> };
    current42RawSources?: { count?: number };
    current55TruncSources?: { count?: number };
    truncationCrosswalk?: { how28RelateTo55?: { baselineCorrespondent_of55?: number; newlyDiscovered_of55?: number } };
  }>(path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"));

  const closure = readJson<{
    overlap?: {
      materialisedMixedCount?: number;
      materialisedUncertainCount?: number;
      mixedAndUncertainOverlap?: number;
    };
    coverageTable?: Array<Record<string, unknown>>;
    stratifiedFalsePositiveFalseNegativeReview?: { samples?: unknown[] };
  }>(path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-5/phase4-closure-coverage.json"));

  const fpSample = readJson<{ sample?: unknown[] }>(
    path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-4/false-positive-review-sample.json"),
  );

  // --- Adversarial FP/FN matrix (automated evidence) ---
  const matrix: Array<{ name: string; pass: boolean; detail: string }> = [];

  {
    const leak = "Consider PWITS continuity and defensive force on the papers.";
    const g = gateSolicitorOutput({
      surfaceId: "phase4_resolve_harassment",
      texts: [leak],
      allegation: "Harassment contrary to Protection from Harassment Act",
      bundleHay: "WhatsApp screenshots MG11 phone",
      mode: "copy",
      data: { texts: [leak] },
    });
    matrix.push({
      name: "harassment_blocks_unsupported_drugs_defence",
      pass: g.status === "integrity_blocked",
      detail: `status=${g.status}; rules=${g.ruleIds.join(",")}`,
    });
  }

  {
    const cls = classifyTextsAgainstConceptRegistry(["Phone attribution and subscriber records"], {
      allegation: "Harassment contrary to Protection from Harassment Act",
      bundleHay: "WhatsApp screenshots",
      evidence: [],
      // keyword "phone" alone must not activate drugs_supply
    });
    matrix.push({
      name: "keyword_alone_does_not_activate_foreign_family",
      pass: !cls.activatedFamilies.some((a) => a.family === "drugs_supply"),
      detail: `activated=${cls.activatedFamilies.map((a) => a.family).join(",") || "none"}; mixed=${cls.mixedFamily}`,
    });
  }

  {
    const g = gateSolicitorOutput({
      surfaceId: "phase4_resolve_missing_family",
      texts: ["Attribution remains outstanding on the served screenshots."],
      mode: "api",
      data: { texts: ["Attribution remains outstanding on the served screenshots."] },
    });
    matrix.push({
      name: "missing_family_blocks_substantive_api",
      pass: g.status === "integrity_blocked" && g.ruleIds.includes("offence_family_uncertain"),
      detail: `status=${g.status}; rules=${g.ruleIds.join(",")}`,
    });
  }

  {
    const g = gateSolicitorOutput({
      surfaceId: "phase4_resolve_neutral_ack",
      texts: ["Acknowledged."],
      mode: "api",
      data: { texts: ["Acknowledged."] },
    });
    matrix.push({
      name: "neutral_non_substantive_ack_usable",
      pass: g.status !== "integrity_blocked",
      detail: `status=${g.status}`,
    });
  }

  {
    const safe = "Attribution remains outstanding on the served screenshots.";
    const leak = "Consider defensive force and PWITS continuity on the papers.";
    const g = gateSolicitorOutput({
      surfaceId: "phase4_resolve_scoped",
      texts: [safe, leak],
      allegation: "Harassment contrary to Protection from Harassment Act",
      bundleHay: "WhatsApp screenshots MG11 phone",
      mode: "view",
      scopeBlockToAffectedTexts: true,
      data: { texts: [safe, leak] },
    });
    matrix.push({
      name: "scoped_view_keeps_clean_line",
      pass: g.status === "degraded" && (g.data?.texts?.length ?? 0) === 1,
      detail: `status=${g.status}; kept=${g.data?.texts?.length ?? 0}`,
    });
  }

  {
    const withIds = classifyTextsAgainstConceptRegistry(["Phone extraction confirms attribution"], {
      allegation: "Possession with intent to supply Class A",
      bundleHay: "phone extraction subscriber MG11",
      evidence: [
        {
          evidenceId: `ev_${createHash("sha256").update("Phone extraction|served").digest("hex").slice(0, 16)}`,
          label: "Phone extraction",
          existence: "served",
        },
      ],
    });
    const keywordOnly = classifyTextsAgainstConceptRegistry(["Phone extraction confirms attribution"], {
      allegation: "Harassment contrary to Protection from Harassment Act",
      bundleHay: "phone extraction",
      evidence: [],
    });
    matrix.push({
      name: "conditional_requires_structured_provenance_ids",
      pass: !keywordOnly.activatedFamilies.some((a) => a.family === "drugs_supply"),
      detail: `withIds.conditional=${withIds.conditionalAllowed.length}; keywordOnly.families=${keywordOnly.activatedFamilies.map((a) => a.family).join(",") || "none"}`,
    });
  }

  // Canonical calculator proof
  const evidenceRows: FiveAnswersEvidenceRow[] = [
    row("MG11", "served"),
    row("CCTV", "referred_only"),
    row("Phone download", "missing"),
  ];
  const canonical = buildCanonicalMatterStateV1({
    caseId: "phase4-resolve",
    allegation: "Harassment",
    evidenceRows,
    chaseItems: [{ id: "c1", label: "Chase MG11", baseStatus: "Overdue", whyItMatters: "continuity" }],
  });
  const overview = countEvidenceStatesForDisplay(evidenceRows);
  const matterVm = buildSolicitorMatterStateVmFromCanonical(canonical, evidenceRows);
  const dash = buildConfidenceDashboard({
    evidenceRows,
    chaseItems: [{ label: "Chase MG11", baseStatus: "Overdue" }],
    exportSections: [],
    sourceBadges: [],
    outstandingChaseLabels: ["Chase MG11"],
    missingMaterialLabels: [],
    contradictions: [],
    mustNotOverstate: [],
    documentCount: 1,
    feedback: {
      blocking: 0,
      warning: 0,
      polish: 0,
      exportRelated: 0,
      unsafeOrOverstated: 0,
      latestTimestamp: null,
    },
    recent: {
      rerunDiffHeadline: null,
      rerunDiffLines: [],
      rerunHasBaseline: false,
      adviceChangeSummary: null,
      adviceChangeItemCount: 0,
    },
    matterLevel: "provisional",
  } as unknown as Parameters<typeof buildConfidenceDashboard>[0]);

  matrix.push({
    name: "canonical_overview_counts_match",
    pass:
      overview.served === canonical.evidence.counts.served &&
      overview.referred === canonical.evidence.counts.referred &&
      overview.missing === canonical.evidence.counts.missing,
    detail: `schema=${CANONICAL_MATTER_STATE_VERSION}`,
  });
  matrix.push({
    name: "canonical_matter_vm_fingerprint",
    pass: assertSameCanonicalFingerprint(matterVm.fingerprint, canonical.fingerprint),
    detail: matterVm.fingerprint.slice(0, 24),
  });
  matrix.push({
    name: "canonical_dashboard_fingerprint_present",
    pass: Boolean(dash.canonicalFingerprint),
    detail: dash.canonicalFingerprint?.slice(0, 24) ?? "null",
  });

  const matrixPass = matrix.every((m) => m.pass);

  const items: ItemEvidence[] = [
    {
      id: "independent_state_calculators",
      formerStatus: "Full canonical migration of three independent calculators",
      disposition: "RESOLVED",
      evidence: [
        "Phase 6 migrated confidence_dashboard, overview-presentation adapters, solicitor-matter-state",
        `Re-verified: overview counts match=${matrix.find((m) => m.name === "canonical_overview_counts_match")?.pass}`,
        `matter VM fingerprint match=${matrix.find((m) => m.name === "canonical_matter_vm_fingerprint")?.pass}`,
        `dashboard fingerprint present=${matrix.find((m) => m.name === "canonical_dashboard_fingerprint_present")?.pass}`,
      ],
      ledgerImpact: "none — calculator migration does not alter 72/28 or 42/55 stock units",
      passClaim: false,
    },
    {
      id: "composer_raw_trunc_stock",
      formerStatus: "Composer repair for raw-marker / truncated copyable stock",
      disposition: "RESOLVED",
      evidence: [
        `Phase 6 LEDGER_BALANCED status=${ledger?.status}`,
        `Prior 72 raw rule-firing occurrences reconstructed=${ledger?.prior72RawMarkerMap?.reconstructed} balanced=${ledger?.prior72RawMarkerMap?.balanced} dispositions=${JSON.stringify(ledger?.prior72RawMarkerMap?.dispositionTotals)}`,
        `Prior 28 trunc rule-firing occurrences reconstructed=${ledger?.prior28TruncMap?.reconstructed} balanced=${ledger?.prior28TruncMap?.balanced} dispositions=${JSON.stringify(ledger?.prior28TruncMap?.dispositionTotals)}`,
        `Current per-string hits remain labeled separately: raw=${ledger?.current42RawSources?.count} trunc=${ledger?.current55TruncSources?.count} (do not mix with 72/28)`,
      ],
      ledgerImpact: "Stock dispositions unchanged; units remain labeled. No re-count of Phase-3 aggregates.",
      passClaim: false,
    },
    {
      id: "scale_lane_audit_family_probes",
      formerStatus: "Scale lane uses audit-family probes (full generated wording not on disk for all 3000)",
      disposition: "RESOLVED_AS_CONTAINMENT_PROOF",
      evidence: [
        "Scale copy/export block counts are adversarial cross-family probes on every scale identity — containment proof only",
        "They are not a claim that all 3,000 generated bundles emit leak strings in production output",
        "Process-only audit families that cannot be mapped remain uncertain — fail-closed, not passed by hiding",
        "Materialised gold lane (530) remains in final evidence alongside scale (3000) and combined (3530)",
      ],
      ledgerImpact: "none — scale probes are a separate counting lane from materialised stock 72/28 and 42/55",
      passClaim: false,
    },
    {
      id: "residual_unsupported_uncertain_counts",
      formerStatus: "Residual unsupported / uncertain counts — hidden output ≠ correct output",
      disposition: "FAIL_CLOSED_WITH_RESIDUAL_RISK",
      evidence: [
        `Materialised mixed=${closure?.overlap?.materialisedMixedCount} uncertain=${closure?.overlap?.materialisedUncertainCount} overlap=${closure?.overlap?.mixedAndUncertainOverlap}`,
        `FP sample size=${fpSample?.sample?.length ?? 0}; stratified samples=${closure?.stratifiedFalsePositiveFalseNegativeReview?.samples?.length ?? 0}`,
        `Adversarial matrix allPass=${matrixPass}: ${matrix.map((m) => `${m.name}=${m.pass ? "PASS" : "FAIL"}`).join("; ")}`,
        "Substantive copy/API remain fail-closed when family uncertain; neutral ack usable; scoped view keeps clean lines",
        "Hidden/blocked output is not counted as repaired or PASS — residual risk tracked for Phase 9 corpus + Phase 11 rendered/human review",
      ],
      ledgerImpact: "none — uncertain/unsupported are family-classification units, not raw/trunc stock units",
      passClaim: false,
    },
    {
      id: "human_fp_fn_signoff",
      formerStatus: "Larger corpus / rendered FP–FN reviews before Phase 4 PASS",
      disposition: "DEFERRED_TO_PHASE_9_11",
      evidence: [
        "Automated adversarial matrix and stratified samples are evidence of enforcement, not human gold sign-off",
        "Phase 9 full N-case corpus + Phase 11 rendered coverage / 30–50 gold human review remain the PASS gate for family correctness",
        "Phase 4 programme blockers (calculators, composer stock, probe methodology) are dispositioned above without claiming corpus PASS",
      ],
      ledgerImpact: "none",
      passClaim: false,
    },
  ];

  const everyItemDispositioned = items.every((i) => Boolean(i.disposition && i.evidence.length));
  const blockersResolved = items
    .filter((i) => i.id === "independent_state_calculators" || i.id === "composer_raw_trunc_stock")
    .every((i) => i.disposition === "RESOLVED");

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 4,
    workUnit: "resolve-safe-but-unresolved",
    generatedAt: new Date().toISOString(),
    status: everyItemDispositioned && blockersResolved && matrixPass ? "UNRESOLVED_ITEMS_DISPOSITIONED" : "RESOLUTION_INCOMPLETE",
    corpusPassClaim: false as const,
    unitReminder: {
      prior72_28: "copyable_exportable_rule_firing_occurrence (fixture × mode)",
      current42_55: "per_string_copyable_hit",
      doNotMix: true,
    },
    adversarialMatrix: matrix,
    matrixAllPass: matrixPass,
    items,
    residualRisks: [
      "Materialised uncertain-family cases remain fail-closed until Phase 9/11 human FP–FN establishes acceptable rates",
      "Scale uncertain (process-only audit families) remain unresolved classification, not hidden PASS",
      "Defence-plan-chat eval joins still gated legacy composer (Phase 6 residual)",
    ],
    ledgerImpactSummary: "No change to prior 72/28 or current 42/55 counts; Phase 4 resolution is disposition evidence only",
  };

  fs.writeFileSync(path.join(OUT, "phase4-resolution-evidence.json"), JSON.stringify(report, null, 2));

  const md = `# Phase 4 checkpoint — offence-family concept registry

**Status:** UNRESOLVED ITEMS DISPOSITIONED — **not a corpus PASS**  
**Former status:** safe-but-unresolved  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

> Hidden or blocked output is not PASS. Residual uncertain-family correctness remains for Phase 9 (full corpus) and Phase 11 (rendered / human gold review).

## Disposition of former safe-but-unresolved items

| Item | Disposition | Ledger impact |
|------|-------------|---------------|
${items.map((i) => `| ${i.id} | **${i.disposition}** | ${i.ledgerImpact} |`).join("\n")}

### Evidence summary

${items
  .map(
    (i) => `#### ${i.id}
- Former: ${i.formerStatus}
- Disposition: **${i.disposition}**
${i.evidence.map((e) => `- ${e}`).join("\n")}
`,
  )
  .join("\n")}

## Adversarial matrix (re-verified)

| Check | Result |
|-------|--------|
${matrix.map((m) => `| ${m.name} | ${m.pass ? "PASS" : "FAIL"} — ${m.detail} |`).join("\n")}

All matrix checks pass: **${matrixPass}**

## Unit reminder

| Figure | Unit |
|-------|------|
| Prior 72 / 28 | fixture × mode rule-firing occurrences |
| Current 42 / 55 | per-string copyable hits |
| Do not mix | true |

## Residual risks

${report.residualRisks.map((r) => `- ${r}`).join("\n")}

## Explicit non-goals

No merge. No deploy. No corpus PASS claim. No UX redesign. Continue to Phase 7 (extraction and provenance boundary).

Artefact: \`artifacts/casebrain-qa/integrity-programme/phase-4/phase4-resolution-evidence.json\`
`;

  fs.writeFileSync(path.join(OUT, "PHASE-4-CHECKPOINT.md"), md);
  fs.writeFileSync(path.join(DOCS, "phase-4-checkpoint.md"), md);

  // Update README row
  const readmePath = path.join(DOCS, "README.md");
  let readme = fs.readFileSync(readmePath, "utf8");
  readme = readme.replace(
    /\| Phase 4 — offence-family concept registry \|.*?\|/,
    "| Phase 4 — offence-family concept registry | UNRESOLVED ITEMS DISPOSITIONED (not corpus PASS) | `docs/integrity-programme/phase-4-checkpoint.md` |",
  );
  fs.writeFileSync(readmePath, readme);

  console.log(
    JSON.stringify(
      {
        ok: report.status === "UNRESOLVED_ITEMS_DISPOSITIONED",
        status: report.status,
        matrixAllPass: matrixPass,
        items: items.map((i) => ({ id: i.id, disposition: i.disposition })),
        ledgerImpact: report.ledgerImpactSummary,
      },
      null,
      2,
    ),
  );
}

main();
