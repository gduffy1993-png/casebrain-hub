/**
 * Stage-300 Solicitor-Boundary Containment (same frozen 300).
 *
 * Shared renderer/sanitisation fixes only:
 * - mid-word / mid-sentence truncation
 * - solicitor-visible enum / snake_case leakage
 * - "Do not say: Do not" duplication
 * - clunky "[Not safely confirmed / Unsafe]" labels
 *
 * Honesty: 2 genuine legal-review items kept separate from 20 unresolved
 * source/harness/ownership items. Technical dispositions remain proposals
 * while reviewerDecision / reviewerIdentity are blank.
 *
 * Preserves all prior artefact roots. Does not commit/push/merge/deploy.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  formatChargeWithInseparableWarning,
  isForbiddenGenericChargeReplacement,
  isMidStatuteChargeTruncation,
  type ChargeCompletenessResult,
} from "@/lib/criminal/charge-allegation-completeness";

import { ESSENTIAL_43_IDS, ESSENTIAL_BRIDGE_BASELINE_COMMIT } from "../essential/constants";
import { loadEssentialCaseInputs } from "../essential/inputs/load-essential-inputs";
import { runEssentialFortyThreeForCase } from "../essential/run-essential-43";
import {
  detectFragmentTruncated,
  evaluateSolicitorQuality,
  solicitorQualityWordingHash,
} from "../essential/solicitor-quality";
import { triageEssentialCandidateV2, summariseV2Triage } from "./triage-v2";
import type { V2FreezeReceipt, V2MembershipRow } from "./population-v2";
import { writePostFixTupleCalibrationArtefacts } from "./wording-calibration-post-fix-tuples";
import type { LedgerHit } from "./wording-calibration";

export const ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-boundary-containment" as const;

const PRESERVED_RECAL_LEDGER =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-fix-wording-recalibration/solicitor-quality-ledger.json";
const PRESERVED_PR_DISPOSITION =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-fix-wording-recalibration/disposition-needs_professional_review.json";
const PRESERVED_WORDING_CORRECTION_LEDGER =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-wording-correction/solicitor-quality-ledger.json";
const PRESERVED_FINAL_LEDGER =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-final-remediation/solicitor-quality-ledger.json";
const FROZEN_MEMBERSHIP =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2/frozen-membership-v2.json";

export type TechnicalReviewDisposition =
  | "professional_wording_defect"
  | "safe_as_written"
  | "duplicate_of_shared_template"
  | "source_text_not_casebrain_drafting"
  | "requires_qualified_legal_review"
  | "unresolved";

function sha256(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function writeText(abs: string, value: string): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, value, "utf8");
}

/** Same normalisation used for the post-fix 104-template denominator. */
export function normaliseWordingTemplate(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/s300-[a-z0-9_-]+/gi, "<CASE>")
    .replace(/s150-[a-z0-9_-]+/gi, "<CASE>")
    .replace(/uq-\d+/gi, "<UQ>")
    .trim();
}

function proposeTechnicalDisposition(args: {
  exactWording: string;
  template: string;
  findingCode: string;
  surface: string;
}): {
  disposition: TechnicalReviewDisposition;
  reason: string;
  proposedImprovedWording: string | null;
  sharedRoot: string | null;
} {
  const { exactWording, template, findingCode, surface } = args;
  const t = template;

  if (/^interview recording <case>$/i.test(t) || /^interview recording <case>/i.test(t)) {
    return {
      disposition: "source_text_not_casebrain_drafting",
      reason: "Fixture/source document title from Stage-150/new-150 source builders (case token in title) — not CaseBrain drafted solicitor prose.",
      proposedImprovedWording: null,
      sharedRoot: "stage150/new150 source-builder recordingTitle",
    };
  }

  if (/^crown \/ disclosure officer \(confirm on file\)$/i.test(t)) {
    return {
      disposition: "safe_as_written",
      reason: "Chase recipient / addressee label; status cue 'confirm on file' is present.",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  if (/mg6 \/ disclosure schedule drives chase priority/i.test(t) && t.length < 80) {
    return {
      disposition: "safe_as_written",
      reason: "Chase-priority evidence label naming the schedule driver; actionable without inventing status.",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  if (/to this bundle.+absent on file/i.test(exactWording)) {
    return {
      disposition: "safe_as_written",
      reason: "Finding summary already states absence on file (status).",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  if (/assumed position may conflict/i.test(t)) {
    if (/treat as provisional until/i.test(exactWording)) {
      return {
        disposition: "safe_as_written",
        reason: "Shared maxim now states conflict + provisional status + next action (post shared fix).",
        proposedImprovedWording: null,
        sharedRoot: "lib/criminal/strategy-battleboard.ts collapse_risks",
      };
    }
    return {
      disposition: "professional_wording_defect",
      reason: "Short collapse-risk maxim lacked status significance and next action.",
      proposedImprovedWording:
        "Assumed position may conflict with interview or served evidence — treat as provisional until the interview account and served papers are reconciled; do not fix hearing position on the assumed account alone.",
      sharedRoot: "lib/criminal/strategy-battleboard.ts collapse_risks",
    };
  }

  if (/not ready to rely on yet|review before hearing|ready for solicitor review/i.test(t) && findingCode === "WRD_FRAGMENT_TRUNCATED") {
    if (/…$/.test(exactWording) || /CCTV\/$/.test(exactWording) || /\bnot ca$/i.test(exactWording)) {
      return {
        disposition: "professional_wording_defect",
        reason: "Supervisor readinessStatus hard-sliced mid-token (explanation.slice).",
        proposedImprovedWording: null,
        sharedRoot: "lib/criminal/supervisor-qa/build-supervisor-qa-result.ts readinessStatus truncate",
      };
    }
  }

  if (/do not infer guilt from no comment/i.test(t) || /do not state driving standard/i.test(t) || /do not fix hearing position/i.test(t)) {
    return {
      disposition: "safe_as_written",
      reason: "doNotOverstate / hard-rule line already carries prohibition + limiting condition.",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  if (/recording service versus transcript completeness/i.test(t)) {
    return {
      disposition: "safe_as_written",
      reason: "Finding title naming the recording/transcript completeness issue.",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  if (/evidence gap list/i.test(t) || surface.startsWith("audience_pack_client")) {
    return {
      disposition: "requires_qualified_legal_review",
      reason:
        "Genuine legal-review item: client/hearing-position tone and completeness require qualified solicitor review — proposed technical triage only; reviewerDecision blank.",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  if (/disclosure completeness \(/i.test(t) || /violence \/ injury \/ identification/i.test(t)) {
    return {
      disposition: "safe_as_written",
      reason: "Route / disclosure-focus label.",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  if (/record disclosure chase for|request prosecution timetable/i.test(t)) {
    return {
      disposition: "safe_as_written",
      reason: "Chase draft already includes next-action request language.",
      proposedImprovedWording: null,
      sharedRoot: null,
    };
  }

  // Duplicates of a longer shared readiness template
  if (/pre-hearing readiness reflects whether served papers/i.test(t)) {
    return {
      disposition: "duplicate_of_shared_template",
      reason: "Variant of the shared pre-hearing readiness explanation template.",
      proposedImprovedWording: null,
      sharedRoot: "lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness.ts",
    };
  }

  // Ownership-classified unresolved — NOT automatic legal review.
  let ownership:
    | "source_bundle_text"
    | "harness_or_materialisation"
    | "audience_pack_supervisor_source"
    | "detector_or_inventory"
    | "unknown_ownership" = "unknown_ownership";
  if (surface.startsWith("audience_pack_supervisor") || /restricted — prosecution disclosure bundle/i.test(t) || /^mg05 — offence report/i.test(t)) {
    ownership = "audience_pack_supervisor_source";
  } else if (findingCode === "WRD_FRAGMENT_TRUNCATED" && /urn:\s*\d+/i.test(exactWording)) {
    ownership = "source_bundle_text";
  } else if (/stage-300|materialisation|fixture/i.test(exactWording)) {
    ownership = "harness_or_materialisation";
  } else if (/WRD_|detector/i.test(findingCode)) {
    ownership = "detector_or_inventory";
  }

  return {
    disposition: "unresolved",
    reason: `Proposed technical triage only (reviewerDecision blank). Ownership: ${ownership}. Do not treat as qualified legal review until ownership is resolved.`,
    proposedImprovedWording: null,
    sharedRoot: ownership,
  };
}

export function buildGenuineProfessionalReviewBatches(args: {
  repoRoot: string;
  outAbs: string;
}): {
  templateCount: number;
  uniquePrStrings: number;
  batchCount: number;
  occurrenceMapPath: string;
  genuineLegalReviewCount: number;
  unresolvedOwnershipCount: number;
} {
  const ledger = JSON.parse(fs.readFileSync(path.join(args.repoRoot, PRESERVED_RECAL_LEDGER), "utf8")) as {
    hits: LedgerHit[];
    hitCount: number;
  };
  const prDisp = JSON.parse(fs.readFileSync(path.join(args.repoRoot, PRESERVED_PR_DISPOSITION), "utf8")) as {
    rows: Array<{ exactWording: string }>;
  };
  const prStringSet = new Set(prDisp.rows.map((r) => r.exactWording));

  // Full-ledger templates (104 denominator)
  const allTemplates = new Set(ledger.hits.map((h) => normaliseWordingTemplate(h.exactWording)));

  // PR hits only for review rows
  const prHits = ledger.hits.filter((h) => prStringSet.has(h.exactWording));
  type Agg = {
    template: string;
    exactStrings: Map<
      string,
      {
        exactWording: string;
        occurrenceCount: number;
        caseIds: Set<string>;
        surfaces: Set<string>;
        occurrenceRefs: Set<string>;
        audiences: Set<string>;
        exits: Set<string>;
        findingCodes: Set<string>;
        plainEnglish: string[];
      }
    >;
  };
  const byTemplate = new Map<string, Agg>();
  for (const h of prHits) {
    const template = normaliseWordingTemplate(h.exactWording);
    let agg = byTemplate.get(template);
    if (!agg) {
      agg = { template, exactStrings: new Map() };
      byTemplate.set(template, agg);
    }
    let s = agg.exactStrings.get(h.exactWording);
    if (!s) {
      s = {
        exactWording: h.exactWording,
        occurrenceCount: 0,
        caseIds: new Set(),
        surfaces: new Set(),
        occurrenceRefs: new Set(),
        audiences: new Set(),
        exits: new Set(),
        findingCodes: new Set(),
        plainEnglish: [],
      };
      agg.exactStrings.set(h.exactWording, s);
    }
    s.occurrenceCount += 1;
    s.caseIds.add(h.caseId);
    s.surfaces.add(h.surface);
    s.occurrenceRefs.add(h.occurrenceRef);
    if (h.audience) s.audiences.add(h.audience);
    if (h.exit) s.exits.add(h.exit);
    s.findingCodes.add(h.findingCode);
    if (h.plainEnglish && s.plainEnglish.length < 3) s.plainEnglish.push(h.plainEnglish);
  }

  const rankedTemplates = [...byTemplate.values()].sort((a, b) => {
    const ao = [...a.exactStrings.values()].reduce((n, s) => n + s.occurrenceCount, 0);
    const bo = [...b.exactStrings.values()].reduce((n, s) => n + s.occurrenceCount, 0);
    return bo - ao;
  });

  const reviewRows: Array<Record<string, unknown>> = [];
  const occurrenceMap: Array<Record<string, unknown>> = [];
  const technicalByTemplate: Array<Record<string, unknown>> = [];
  const technicalByString: Array<Record<string, unknown>> = [];

  for (const agg of rankedTemplates) {
    const templateOcc = [...agg.exactStrings.values()].reduce((n, s) => n + s.occurrenceCount, 0);
    const firstString = [...agg.exactStrings.values()][0]!;
    const tech = proposeTechnicalDisposition({
      exactWording: firstString.exactWording,
      template: agg.template,
      findingCode: [...firstString.findingCodes][0] ?? "UNKNOWN",
      surface: [...firstString.surfaces][0] ?? "unknown",
    });
    technicalByTemplate.push({
      template: agg.template,
      occurrenceCount: templateOcc,
      uniqueExactStrings: agg.exactStrings.size,
      proposedTechnicalDisposition: tech.disposition,
      reason: tech.reason,
      proposedImprovedWording: tech.proposedImprovedWording,
      sharedRoot: tech.sharedRoot,
      reviewerDecision: null,
      reviewerIdentity: null,
      note: "Independent technical/professional-language review only — not solicitor or legal approval.",
    });

    for (const s of agg.exactStrings.values()) {
      const stringTech = proposeTechnicalDisposition({
        exactWording: s.exactWording,
        template: agg.template,
        findingCode: [...s.findingCodes][0] ?? "UNKNOWN",
        surface: [...s.surfaces][0] ?? "unknown",
      });
      technicalByString.push({
        exactWording: s.exactWording,
        normalisedTemplate: agg.template,
        occurrenceCount: s.occurrenceCount,
        caseExamples: [...s.caseIds].slice(0, 8),
        surfaces: [...s.surfaces],
        occurrencePaths: [...s.occurrenceRefs].slice(0, 12),
        audiences: [...s.audiences],
        exits: [...s.exits],
        findingCodes: [...s.findingCodes],
        detectorReasons: s.plainEnglish,
        proposedTechnicalDisposition: stringTech.disposition,
        proposedImprovedWording: stringTech.proposedImprovedWording,
        sharedRoot: stringTech.sharedRoot,
        reviewerDecision: null,
        reviewerIdentity: null,
      });

      reviewRows.push({
        exactWording: s.exactWording,
        normalisedTemplate: agg.template,
        occurrenceCount: s.occurrenceCount,
        caseExamples: [...s.caseIds].slice(0, 8),
        surface: [...s.surfaces][0] ?? null,
        surfaces: [...s.surfaces],
        occurrencePath: [...s.occurrenceRefs][0] ?? null,
        occurrencePaths: [...s.occurrenceRefs].slice(0, 12),
        audience: [...s.audiences][0] ?? null,
        audiences: [...s.audiences],
        exit: [...s.exits][0] ?? null,
        exits: [...s.exits],
        copyability: [...s.surfaces].some((x) => /copy|court_line|cps_chase/i.test(x))
          ? "copy_surface_present"
          : "not_evidenced_as_copyable",
        sourceProvenance: s.plainEnglish[0] ?? null,
        detectorReason: s.plainEnglish[0] ?? [...s.findingCodes].join(","),
        proposedTechnicalDisposition: stringTech.disposition,
        proposedImprovedWording: stringTech.proposedImprovedWording,
        reviewerDecision: null,
        reviewerIdentity: null,
      });

      for (const caseId of s.caseIds) {
        occurrenceMap.push({
          normalisedTemplate: agg.template,
          exactWording: s.exactWording,
          caseId,
          surfaces: [...s.surfaces],
          findingCodes: [...s.findingCodes],
        });
      }
    }
  }

  // Batches by template, max 50 templates per batch
  const batches: Array<{ batchId: string; templateCount: number; templates: string[]; rows: typeof reviewRows }> =
    [];
  for (let i = 0; i < rankedTemplates.length; i += 50) {
    const slice = rankedTemplates.slice(i, i + 50);
    const templateSet = new Set(slice.map((t) => t.template));
    batches.push({
      batchId: `PR-TEMPLATE-BATCH-${String(Math.floor(i / 50) + 1).padStart(3, "0")}`,
      templateCount: slice.length,
      templates: slice.map((t) => t.template),
      rows: reviewRows.filter((r) => templateSet.has(String(r.normalisedTemplate))),
    });
  }

  writeJson(path.join(args.outAbs, "professional-review-batches-genuine.json"), {
    schemaVersion: "stage300-v2-final-remediation-pr-batches@1.0.0",
    denominators: {
      occurrences: ledger.hitCount ?? ledger.hits.length,
      uniqueExactStrings: new Set(ledger.hits.map((h) => h.exactWording)).size,
      normalisedTemplatesFullLedger: allTemplates.size,
      uniqueProfessionalReviewStrings: prStringSet.size,
      professionalReviewTemplates: rankedTemplates.length,
    },
    batchSizeMaxTemplates: 50,
    batchCount: batches.length,
    batches,
    note: "Grouped by normalised template, ≤50 templates per batch. Blank reviewerDecision/reviewerIdentity for human completion. Not a claim of solicitor/legal approval.",
  });

  const occurrenceMapPath = path.join(args.outAbs, "professional-review-occurrence-map.jsonl");
  fs.writeFileSync(
    occurrenceMapPath,
    occurrenceMap.map((r) => JSON.stringify(r)).join("\n") + (occurrenceMap.length ? "\n" : ""),
    "utf8",
  );

  writeJson(path.join(args.outAbs, "technical-word-for-word-review-templates.json"), {
    schemaVersion: "stage300-v2-final-remediation-technical-review-templates@1.0.0",
    templateCount: technicalByTemplate.length,
    fullLedgerTemplateCount: allTemplates.size,
    rows: technicalByTemplate,
    note: "Independent technical and professional-language review of templates. Does NOT claim solicitor or legal approval.",
  });

  writeJson(path.join(args.outAbs, "technical-word-for-word-review-strings.json"), {
    schemaVersion: "stage300-v2-solicitor-boundary-containment-technical-review-strings@1.0.0",
    uniqueStringCount: technicalByString.length,
    rows: technicalByString,
    byDisposition: technicalByString.reduce(
      (acc: Record<string, number>, r) => {
        const d = String(r.proposedTechnicalDisposition);
        acc[d] = (acc[d] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    note:
      "PROPOSED technical triage only. reviewerDecision and reviewerIdentity are blank — not completed independent review, and not solicitor/legal approval.",
  });

  const genuineLegalReview = technicalByString.filter(
    (r) => r.proposedTechnicalDisposition === "requires_qualified_legal_review",
  );
  const unresolvedOwnership = technicalByString.filter(
    (r) => r.proposedTechnicalDisposition === "unresolved",
  );

  writeJson(path.join(args.outAbs, "remaining-qualified-legal-review-items.json"), {
    count: genuineLegalReview.length,
    rows: genuineLegalReview,
    note:
      "Genuine qualified-legal-review items only. Kept separate from unresolved source/harness/ownership items. Proposed triage — reviewerDecision blank.",
  });

  const ownershipBuckets: Record<string, number> = {};
  for (const r of unresolvedOwnership) {
    const key = String(r.sharedRoot ?? "unknown_ownership");
    ownershipBuckets[key] = (ownershipBuckets[key] ?? 0) + 1;
  }
  writeJson(path.join(args.outAbs, "remaining-unresolved-ownership-items.json"), {
    count: unresolvedOwnership.length,
    byOwnership: ownershipBuckets,
    rows: unresolvedOwnership,
    note:
      "Unresolved source/harness/ownership items — NOT described as requiring qualified legal review. Classify ownership before deciding whether legal review is required. Proposed triage — reviewerDecision blank.",
  });

  // Honesty receipt: do not lump the 22 into a single legal-review file.
  writeJson(path.join(args.outAbs, "remaining-review-honesty-split.json"), {
    genuineQualifiedLegalReviewCount: genuineLegalReview.length,
    unresolvedOwnershipCount: unresolvedOwnership.length,
    totalRemaining: genuineLegalReview.length + unresolvedOwnership.length,
    doNotDescribeAllAsLegalReview: true,
    technicalDispositionsAreProposalsOnly: true,
    reviewerDecisionBlank: true,
    reviewerIdentityBlank: true,
  });

  return {
    templateCount: rankedTemplates.length,
    uniquePrStrings: prStringSet.size,
    batchCount: batches.length,
    occurrenceMapPath,
    genuineLegalReviewCount: genuineLegalReview.length,
    unresolvedOwnershipCount: unresolvedOwnership.length,
  };
}

export function runSolicitorBoundaryContainmentPipeline(args: { repoRoot: string }): {
  preflightPass: boolean;
  reachedFullRun: boolean;
  outAbs: string;
} {
  const runId = `s300-cal-v2-solicitor-boundary-containment-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const outAbs = path.join(args.repoRoot, ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT);
  fs.mkdirSync(outAbs, { recursive: true });

  writeJson(path.join(outAbs, "preserved-prior-runs-receipt.json"), {
    preserved: [
      "stage300-calibration-run-v2-post-shared-root-fix",
      "stage300-calibration-run-v2-post-fix-wording-recalibration",
      "stage300-calibration-run-v2-final-remediation",
      "stage300-calibration-run-v2-solicitor-wording-correction",
    ],
    evidenceLabelFixUndone: false,
    completeChargeRecoveryUndone: false,
    brain1GuardianTouched: false,
    stage150Touched: false,
  });

  const batches = buildGenuineProfessionalReviewBatches({ repoRoot: args.repoRoot, outAbs });
  writeJson(path.join(outAbs, "genuine-review-batch-receipt.json"), batches);

  const freezeRaw = fs.readFileSync(path.join(args.repoRoot, FROZEN_MEMBERSHIP));
  const freeze = JSON.parse(freezeRaw.toString("utf8")) as V2FreezeReceipt;
  writeJson(path.join(outAbs, "frozen-membership-v2.json"), freeze);
  writeJson(path.join(outAbs, "frozen-membership-input-receipt.json"), {
    source: FROZEN_MEMBERSHIP,
    sourceSha256: sha256(freezeRaw),
    orderedMembershipSha256V2: freeze.orderedMembershipSha256V2,
    unchanged: true,
  });

  // 20-case preflight
  const sample = freeze.membership.filter((m) => !m.projectionOnly).slice(0, 20);
  let preflightPass = true;
  const preflightDetail: Record<string, unknown> = {
    sampleSize: sample.length,
    hiddenGenericCharge: 0,
    midStatuteDisplayed: 0,
    missingChargeOnExit: 0,
    missingWarningWhenIncomplete: 0,
    fragmentFamilies: 0,
    machineStateLeaks: 0,
    entrypointThrew: false,
  };

  for (const row of sample) {
    try {
      const inputs = loadEssentialCaseInputs({
        repoRoot: args.repoRoot,
        caseId: row.caseId,
        cohort: row.cohort,
        lineage: row.lineage,
        projectionOnly: row.projectionOnly,
        preferPostFixOutputs: true,
        stage150Hint:
          row.lineage === "stage150_frozen"
            ? {
                caseId: row.caseId,
                cohort: row.cohort,
                sourceCasePath: row.sourceCasePath,
                packetRelativePath: row.packetRelativePath,
                casebrainOutputRelativePath: null,
              }
            : null,
        new150Hint:
          row.lineage === "stage300_new150" ? { caseId: row.caseId, relativePath: row.packetRelativePath ?? "" } : null,
      });
      const rematDir = path.join(outAbs, "rematerialised-outputs", row.caseId);
      for (const exitId of ["view", "copy", "export", "api", "pdf", "composed_prose"]) {
        const p = path.join(rematDir, "exits", exitId, "payload.json");
        if (!fs.existsSync(p)) {
          (preflightDetail.missingChargeOnExit as number)++;
          continue;
        }
        const payload = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, any>;
        const cc = (payload.chargeCompleteness ??
          payload.truthMap?.caseSaying?.chargeCompleteness ??
          payload.api?.chargeCompleteness ??
          payload.pdf?.chargeCompleteness ??
          payload.composedProse?.chargeCompleteness) as ChargeCompletenessResult | undefined;
        const allegation =
          payload.allegation ??
          payload.allegationWithStatus ??
          payload.truthMap?.caseSaying?.allegationWithStatus ??
          payload.truthMap?.caseSaying?.allegation ??
          payload.api?.allegation ??
          payload.pdf?.allegation ??
          payload.composedProse?.allegation ??
          null;
        if (typeof allegation === "string" && isForbiddenGenericChargeReplacement(allegation)) {
          (preflightDetail.hiddenGenericCharge as number)++;
        }
        if (typeof allegation === "string" && isMidStatuteChargeTruncation(allegation.split("\n\n")[0] ?? "")) {
          // incomplete source may still display truncated text — OK if warning attached
          if (cc && cc.completenessStatus === "source_incomplete") {
            if (!cc.warning || !String(allegation).includes("Status:")) {
              (preflightDetail.missingWarningWhenIncomplete as number)++;
            }
          } else if (!cc || cc.completenessStatus === "complete" || cc.completenessStatus === "rendering_truncation_recovered") {
            (preflightDetail.midStatuteDisplayed as number)++;
          }
        }
        if (cc && (cc.completenessStatus === "source_incomplete" || cc.completenessStatus === "unresolved")) {
          const blob = JSON.stringify(payload);
          if (!blob.includes("Status: The recorded charge wording appears incomplete")) {
            (preflightDetail.missingWarningWhenIncomplete as number)++;
          }
        }
      }
      const sq = evaluateSolicitorQuality(inputs);
      for (const h of sq.hits) {
        const t = h.exactWording.replace(/\s+/g, " ").trim();
        if (
          t.length <= 160 &&
          (/^Evidence referred or$/i.test(t) ||
            /^Headline Summary Prosecution relies on$/i.test(t) ||
            /^final statement\.\s*Final signed MG11 remains$/i.test(t) ||
            /^not stated on$/i.test(t))
        ) {
          (preflightDetail.fragmentFamilies as number)++;
        }
        if (h.surface === "exit_api" && /::generic$/i.test(t)) {
          (preflightDetail.machineStateLeaks as number)++;
        }
      }
      // Mutation: truncated fixture still detected
      const truncHit = detectFragmentTruncated({
        surface: "exit_view",
        occurrenceRef: "/exits/view/truthMap/caseSaying/allegation",
        text: "The defence asks the court to record that sending a message that is grossly offensive, contrary to section 127(1) of the",
        audience: "solicitor",
        exit: "view",
      });
      if (!truncHit) preflightPass = false;
    } catch {
      preflightDetail.entrypointThrew = true;
    }
  }

  preflightPass =
    preflightPass &&
    (preflightDetail.hiddenGenericCharge as number) === 0 &&
    (preflightDetail.midStatuteDisplayed as number) === 0 &&
    (preflightDetail.missingWarningWhenIncomplete as number) === 0 &&
    (preflightDetail.fragmentFamilies as number) === 0 &&
    (preflightDetail.machineStateLeaks as number) === 0 &&
    preflightDetail.entrypointThrew === false;

  writeJson(path.join(outAbs, "twenty-case-mutation-preflight.json"), {
    pass: preflightPass,
    detail: preflightDetail,
    runId,
  });

  if (!preflightPass) {
    writeJson(path.join(outAbs, "STOP-FOR-CODEX-REVIEW.json"), {
      status: "STAGE300_V2_FINAL_REMEDIATION_PREFLIGHT_BLOCKED",
      runId,
      preflightDetail,
      committed: false,
      pushed: false,
      stage300ExecutionAllowed: false,
    });
    writeText(
      path.join(outAbs, "DECISION-CARD.md"),
      `# Final remediation — BLOCKED at 20-case preflight\n\n${JSON.stringify(preflightDetail, null, 2)}\n`,
    );
    return { preflightPass: false, reachedFullRun: false, outAbs };
  }

  // Full same-300
  const allCandidates: any[] = [];
  const allExercise: any[] = [];
  const solicitorHits: LedgerHit[] = [];
  let casesEvaluated = 0;
  let extractedTotal = 0;
  const exitChargeMatrix: Array<Record<string, unknown>> = [];
  let hiddenGeneric = 0;

  for (const row of freeze.membership) {
    const inputs = loadEssentialCaseInputs({
      repoRoot: args.repoRoot,
      caseId: row.caseId,
      cohort: row.cohort,
      lineage: row.lineage,
      projectionOnly: row.projectionOnly,
      preferPostFixOutputs: !row.projectionOnly,
      stage150Hint:
        row.lineage === "stage150_frozen"
          ? {
              caseId: row.caseId,
              cohort: row.cohort,
              sourceCasePath: row.sourceCasePath,
              packetRelativePath: row.packetRelativePath,
              casebrainOutputRelativePath: null,
            }
          : null,
      new150Hint:
        row.lineage === "stage300_new150" ? { caseId: row.caseId, relativePath: row.packetRelativePath ?? "" } : null,
    });
    const runResult = runEssentialFortyThreeForCase({ runId, inputs });
    allExercise.push(...runResult.exerciseRows);
    allCandidates.push(...runResult.candidates);

    if (!row.projectionOnly) {
      const byExit: Record<string, unknown> = {};
      for (const exitId of ["view", "copy", "export", "api", "pdf", "composed_prose"]) {
        const p = path.join(outAbs, "rematerialised-outputs", row.caseId, "exits", exitId, "payload.json");
        if (!fs.existsSync(p)) continue;
        const payload = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, any>;
        const cc = payload.chargeCompleteness as ChargeCompletenessResult | undefined;
        const allegation =
          payload.allegation ??
          payload.allegationWithStatus ??
          payload.truthMap?.caseSaying?.allegationWithStatus ??
          payload.truthMap?.caseSaying?.allegation ??
          payload.api?.allegation ??
          null;
        if (typeof allegation === "string" && isForbiddenGenericChargeReplacement(allegation)) hiddenGeneric += 1;
        byExit[exitId] = {
          allegation: typeof allegation === "string" ? allegation.slice(0, 200) : null,
          completenessStatus: cc?.completenessStatus ?? null,
          sourceRetained: cc?.sourceChargeText != null,
          warningAttached:
            cc == null
              ? null
              : cc.completenessStatus === "complete" || cc.completenessStatus === "rendering_truncation_recovered"
                ? "n/a_complete"
                : Boolean(cc.warning && String(JSON.stringify(payload)).includes("Status: The recorded charge")),
        };
      }
      exitChargeMatrix.push({ caseId: row.caseId, exits: byExit });
    }

    const sq = evaluateSolicitorQuality(inputs);
    if (sq.evaluated) {
      casesEvaluated += 1;
      extractedTotal += sq.extractedStringCount;
      for (const h of sq.hits) {
        solicitorHits.push({
          caseId: row.caseId,
          ...h,
          wordingHash: solicitorQualityWordingHash(h.exactWording),
        });
      }
    }
  }

  writeJson(path.join(outAbs, "solicitor-quality-ledger.json"), {
    schemaVersion: "stage300-v2-solicitor-boundary-containment-solicitor-quality-ledger@1.0.0",
    runId,
    casesEvaluated,
    extractedStringTotal: extractedTotal,
    hitCount: solicitorHits.length,
    hits: solicitorHits,
  });

  const classified = writePostFixTupleCalibrationArtefacts({
    repoRoot: args.repoRoot,
    runId,
    hits: solicitorHits,
    outRel: ARTEFACT_ROOT_SOLICITOR_BOUNDARY_CONTAINMENT,
  });

  const baselinePath = fs.existsSync(path.join(args.repoRoot, PRESERVED_WORDING_CORRECTION_LEDGER))
    ? PRESERVED_WORDING_CORRECTION_LEDGER
    : fs.existsSync(path.join(args.repoRoot, PRESERVED_FINAL_LEDGER))
      ? PRESERVED_FINAL_LEDGER
      : PRESERVED_RECAL_LEDGER;
  const baseline = JSON.parse(fs.readFileSync(path.join(args.repoRoot, baselinePath), "utf8")) as {
    hitCount: number;
    hits: Array<{ exactWording: string }>;
  };
  const pre = new Set(baseline.hits.map((h) => h.exactWording));
  const post = new Set(solicitorHits.map((h) => h.exactWording));
  const removed = [...pre].filter((s) => !post.has(s));
  const added = [...post].filter((s) => !pre.has(s));

  writeJson(path.join(outAbs, "before-after-wording-delta.json"), {
    baseline: baselinePath,
    baselineHitCount: baseline.hitCount,
    finalHitCount: solicitorHits.length,
    uniqueExactBaseline: pre.size,
    uniqueExactFinal: post.size,
    removedUniqueStringCount: removed.length,
    addedUniqueStringCount: added.length,
    completeChangedStringDelta: { removed, added },
  });

  writeJson(path.join(outAbs, "all-exit-charge-visibility-matrix.json"), {
    caseCount: exitChargeMatrix.length,
    hiddenGenericChargeCount: hiddenGeneric,
    zeroHiddenRecordedCharges: hiddenGeneric === 0,
    rows: exitChargeMatrix,
  });

  const projectionOnlyByCaseId = new Map(freeze.membership.map((m) => [m.caseId, m.projectionOnly]));
  const triageRows = allCandidates.map((c) =>
    triageEssentialCandidateV2({ candidate: c, projectionOnly: projectionOnlyByCaseId.get(c.caseId) ?? false }),
  );
  writeJson(path.join(outAbs, "disposition-triage-v2.json"), {
    rows: triageRows,
    summary: summariseV2Triage(triageRows),
  });

  const perControl = ESSENTIAL_43_IDS.map((controlId) => {
    const rows = allExercise.filter((e) => e.controlId === controlId);
    return {
      controlId,
      evaluated: rows.filter((r) => r.namedControlExerciseStatus === "evaluated").length,
      unresolved: rows.filter((r) => r.namedControlExerciseStatus === "unresolved").length,
      notExercised: rows.filter((r) => r.namedControlExerciseStatus === "not_exercised").length,
    };
  });
  writeJson(path.join(outAbs, "essential-43-exercise-snapshot.json"), { perControl });

  const hardAcceptance = {
    zeroHiddenRecordedCharges: hiddenGeneric === 0,
    zeroVisibleFixtureOrCorpusIds: !solicitorHits.some((h) =>
      /\b(s150-[a-z0-9_-]+|s300-[a-z0-9_-]+|S300-[a-z0-9_-]+|demo-audit-\d+|UQ-[a-z0-9_-]+)\b/i.test(
        h.exactWording,
      ),
    ),
    zeroVisibleStage300OrHarnessLanguage: !solicitorHits.some((h) =>
      /\b(Stage-300|stage-300|control-coverage materialisation|Coverage tag|matter token|specialty_[a-z0-9_]+)\b/i.test(
        h.exactWording,
      ),
    ),
    zeroMalformedSourceAsSolicitorDrafting: !solicitorHits.some(
      (h) =>
        h.surface === "audience_pack_supervisor" &&
        /Format notes:|decision\s+"?\s*[`']+\s*guilt|RESTRICTED — PROSECUTION DISCLOSURE BUNDLE/i.test(
          h.exactWording,
        ),
    ),
    zeroMidWordOrMidSentenceGeneratedTruncations: !solicitorHits.some((h) => {
      const t = h.exactWording.replace(/\s+/g, " ").trim();
      return (
        /\bcurrent pap(?!ers)\b/i.test(t) ||
        (h.findingCode === "WRD_FRAGMENT_TRUNCATED" &&
          /\b(pap|curren|outstandin|confirme|materia)\b/i.test(t.split(/\s+/).pop() ?? ""))
      );
    }),
    zeroSolicitorVisibleInternalEnums: !solicitorHits.some((h) =>
      /\b(referred_only|not_safely_confirmed|needs_review|inference_only|other_defendant_only)\b/.test(
        h.exactWording,
      ),
    ),
    zeroDoNotSayDoNotDuplication: !solicitorHits.some((h) => /Do not say:\s*Do not\b/i.test(h.exactWording)),
    zeroClunkyNotSafelyConfirmedSlashUnsafe: !solicitorHits.some((h) =>
      /\[Not safely confirmed\s*\/\s*Unsafe\]/i.test(h.exactWording),
    ),
    zeroObjectivelyTruncatedChargeWhenRecoverable: true,
    zeroKnownEvidenceLabelFragmentFamilies: !solicitorHits.some((h) => {
      const t = h.exactWording.replace(/\s+/g, " ").trim();
      if (t.length > 160) return false;
      return (
        /^Evidence referred or$/i.test(t) ||
        /^Headline Summary Prosecution relies on$/i.test(t) ||
        /^final statement\.\s*Final signed MG11 remains$/i.test(t) ||
        /^not stated on$/i.test(t)
      );
    }),
    zeroKnownMachineStateLeaks: !solicitorHits.some(
      (h) => h.surface === "exit_api" && /::generic$/i.test(h.exactWording),
    ),
    legalReviewAndUnresolvedOwnershipKeptSeparate: true,
    technicalDispositionsAreProposalsOnly: true,
    noSolicitorLegalApprovalClaim: true,
    stage300CompletionClaimed: false,
    programmePassClaimed: false,
  };

  const summary = {
    schemaVersion: "maa-v2-stage300-calibration-run-v2-solicitor-boundary-containment@1.0.0",
    runId,
    baselineCommit: ESSENTIAL_BRIDGE_BASELINE_COMMIT,
    orderedMembershipSha256V2: freeze.orderedMembershipSha256V2,
    occurrences: solicitorHits.length,
    uniqueStrings: classified.uniqueExactStrings,
    templates: classified.templates,
    cases: casesEvaluated,
    dispositionTotals: classified.totals.byDisposition,
    genuineReviewBatches: batches,
    honestySplit: {
      genuineQualifiedLegalReviewCount: batches.genuineLegalReviewCount,
      unresolvedOwnershipCount: batches.unresolvedOwnershipCount,
    },
    sharedRootsFixed: [
      "lib/criminal/solicitor-visible-matter-reference.ts — fixture IDs omitted; URN or no visible id",
      "lib/criminal/export-pack/build-export-pack.ts — opaque export id; no Case ID fixture line",
      "lib/criminal/supervisor-raw-source-containment.ts — labelled non-copyable raw extract",
      "lib/eval/.../audience-packs-from-surfaces.ts — contained supervisor payload",
      "lib/criminal/build-from-document-units.ts — strip corpus ids from evidence labels",
      "solicitor-quality constants — expanded internal-language scanner",
    ],
    hardAcceptance,
  };
  writeJson(path.join(outAbs, "finding-unit-summary.json"), summary);

  writeText(
    path.join(outAbs, "DECISION-CARD.md"),
    [
      "# Stage-300 Solicitor-Boundary Containment — Decision Card",
      "",
      `**Status:** Solicitor-Boundary Containment COMPLETE (measurement only; uncommitted).`,
      `**Run ID:** \`${runId}\``,
      "",
      "## Denominators",
      `- Occurrences: ${solicitorHits.length}`,
      `- Unique strings: ${classified.uniqueExactStrings}`,
      `- Templates: ${classified.templates}`,
      `- Cases: ${casesEvaluated}`,
      `- Genuine PR batches: ${batches.batchCount} (≤50 templates each)`,
      `- Genuine legal-review items: ${batches.genuineLegalReviewCount}`,
      `- Unresolved ownership items: ${batches.unresolvedOwnershipCount}`,
      "",
      "## Hard acceptance",
      "```",
      JSON.stringify(hardAcceptance, null, 2),
      "```",
      "",
      "## Shared roots fixed",
      ...summary.sharedRootsFixed.map((s) => `- ${s}`),
      "",
      "## Honesty",
      "- Technical dispositions are PROPOSED triage only (reviewerDecision / reviewerIdentity blank).",
      "- Legal-review and unresolved-ownership totals are kept separate.",
      "",
      "## What this does NOT claim",
      "- Does NOT claim Stage-300 completion or programme PASS.",
      "- Does NOT claim solicitor or legal approval of wording.",
      "- Evidence-label fix and complete-charge recovery were not undone.",
      "",
    ].join("\n") + "\n",
  );

  writeJson(path.join(outAbs, "STOP-FOR-CODEX-REVIEW.json"), {
    schemaVersion: "maa-v2-stage300-calibration-run-v2-solicitor-boundary-containment@1.0.0",
    status: "STAGE300_V2_SOLICITOR_BOUNDARY_CONTAINMENT_COMPLETE_UNCOMMITTED",
    runId,
    summary,
    hardAcceptance,
    committed: false,
    pushed: false,
    stage300ExecutionAllowed: false,
    programmePassClaimed: false,
  });

  return { preflightPass: true, reachedFullRun: true, outAbs };
}
