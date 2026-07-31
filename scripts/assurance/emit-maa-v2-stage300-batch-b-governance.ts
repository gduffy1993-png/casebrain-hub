/**
 * Emit Stage-300 Batch-B control-coverage governance artefacts.
 * No CaseBrain changes. No Stage-300 run. Compact evidence only.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage300-batch-b-governance.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import {
  BATCH_B_ARTIFACT_ROOT,
  BATCH_B_BASELINE,
  BATCH_B_SCHEMA_VERSION,
  CANDIDATE_FREEZE_SHA256,
  ORDERED_MEMBERSHIP_SHA256,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/batch-b/constants";

const ROOT = process.cwd();
const OUT = path.join(ROOT, BATCH_B_ARTIFACT_ROOT, "governance");
const ESSENTIAL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-execution-readiness-plan/stage300-essential-control-register.json";

type Lane =
  | "source_corpus"
  | "production_casebrain"
  | "capture_materialisation_harness"
  | "maa_adapter"
  | "browser"
  | "human_legal_external_review";

type GapClass =
  | "production_emits_harness_loses"
  | "production_prose_only_not_structured"
  | "production_does_not_emit"
  | "source_packets_do_not_contain"
  | "browser_authenticated_capture_required"
  | "human_legal_external_required";

type Priority = "P0" | "P1" | "P2" | "P3";

function sha(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function head(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function purposeOf(controlId: string): string {
  const map: Record<string, string> = {
    "MAA2-SRC-07-REDACTION-DETECT": "Detect redactions in source binaries without inventing text",
    "MAA2-SRC-09-PAGINATION-DISCONTINUITY": "Detect pagination breaks/discontinuities in page units",
    "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS": "Detect attachment references without binary presence",
    "MAA2-SRC-13-PASSWORD-CORRUPT": "Detect password/corrupt PDF extraction failure honestly",
    "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE": "Bind extracted text to source-binary/OCR provenance",
    "MAA2-LSL-05-CATEGORY-SET-COVERAGE": "Charge instrument category-set coverage vs authority taxonomy",
    "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING": "Age at offence/hearing from DOB + event timestamps",
    "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS": "Transparent age/date calculation inputs and method",
    "MAA2-PRC-03-YOUTH-STATE": "Youth court / youth-state honesty",
    "MAA2-PRC-04-FITNESS-PARTICIPATION": "Fitness to plead / participation state honesty",
    "MAA2-PRC-07-DISCLOSURE-PII-STATE": "Disclosure PII state honesty",
    "MAA2-AUD-02-CLIENT-PLAIN": "Client-plain audience wording vs other surfaces",
    "MAA2-AUD-03-COURT-PRECISE": "Court-precise audience wording",
    "MAA2-AUD-04-CPS-SPECIFIC": "CPS-specific audience wording",
    "MAA2-AUD-05-SUPERVISOR-RISK": "Supervisor-risk audience wording",
    "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE": "Defence solicitor perspective integrity",
    "MAA2-XPP-02-PROSECUTION-CHALLENGE": "Prosecution-challenge perspective integrity",
    "MAA2-XPP-03-JUDICIAL-NEUTRALITY": "Judicial neutrality perspective integrity",
    "MAA2-XPP-04-CLIENT-COMPREHENSION": "Client comprehension perspective integrity",
    "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE": "Supervisor-risk perspective integrity",
    "MAA2-VDR-01-SOURCE-CASE-HASHES": "Source case hash reproducibility",
    "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER": "Frozen membership order integrity",
    "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD": "CaseBrain commit/build pin integrity",
    "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS": "Schema/registry/detector version pins",
    "MAA2-VDR-05-MODEL-PROMPT-VERSION": "Model/prompt version pin",
    "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS": "Exact output/finding ID reproducibility",
    "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS": "Timestamp/disposition reproducibility",
    "MAA2-VDR-08-BEFORE-AFTER-MAPPING": "Before/after version mapping",
    "MAA2-VDR-09-ADDED-REMOVED-RETAINED": "Added/removed/retained version delta",
    "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS": "Source-fact→conclusion sentence receipts",
    "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES": "Source-change affected sentence marking",
    "MAA2-ELD-03-STALE-DRAFT-MARKING": "Stale draft marking",
    "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS": "Stale drafts blocked across exits",
    "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE": "No silent rewrite/delete of locked text",
    "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON": "Before/after change reason receipts",
    "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL": "Solicitor approval before external send",
    "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY": "Rejected/superseded revision history",
    "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH": "Audience redraft preserves truth",
    "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL": "Unaffected sentences byte-identical",
    "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED": "Uncertain provenance must be qualified",
    "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE": "Cross-exit propagation complete",
    "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE": "Rollback on superseded source",
    "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT": "Actor/time/source/approval audit trail",
  };
  return map[controlId] ?? controlId;
}

function priorityOf(controlId: string): Priority {
  if (controlId.startsWith("MAA2-SRC-")) return "P0";
  if (controlId === "MAA2-LSL-05-CATEGORY-SET-COVERAGE") return "P0";
  if (controlId.startsWith("MAA2-CHR-") || controlId.startsWith("MAA2-PRC-")) return "P0";
  if (controlId.startsWith("MAA2-ELD-04") || controlId.startsWith("MAA2-ELD-05") || controlId.startsWith("MAA2-ELD-07"))
    return "P0";
  if (controlId.startsWith("MAA2-AUD-") || controlId.startsWith("MAA2-XPP-")) return "P1";
  if (controlId.startsWith("MAA2-ELD-")) return "P1";
  if (controlId.startsWith("MAA2-VDR-")) return "P1";
  return "P2";
}

type UnlockSpec = {
  missingInput: string;
  ownerLane: Lane;
  producerOwner: string;
  gapClass: GapClass;
  minEligibleDenominator: number;
  acceptanceEvidence: string;
  nextBatch: string;
  stage300CasesCanSupply: boolean;
  liveProductEventuallyRequired: boolean;
  currentStatus: string;
  productionFunction: string;
  independentTruth: string;
  sharedUtilities: string[];
  sameSubstantiveAlgorithmRisk: boolean;
  independenceClass: "INDEPENDENT_OK" | "INDEPENDENCE_PENDING_PROOF" | "TAUTOLOGICAL_UNSAFE";
};

function unlockSpec(controlId: string, theme: string, statusFromRegister: string): UnlockSpec {
  if (theme === "heavy_pdf_ocr_binary") {
    return {
      missingInput:
        "Original PDF/binary bytes + page-unit OCR extraction receipts (pageIdentityKnown, redaction masks, attachment inventory, password/corrupt flags) per source document",
      ownerLane: "source_corpus",
      producerOwner: "Stage-300 OCR/binary source packet builders (not live CaseBrain in this unit)",
      gapClass: "source_packets_do_not_contain",
      minEligibleDenominator: 1,
      acceptanceEvidence:
        "≥1 packet with genuine binary+OCR receipts; SRC detector contracts green; independence proof vs production extraction",
      nextBatch: "Batch-C-OCR-SRC (P0)",
      stage300CasesCanSupply: true,
      liveProductEventuallyRequired: true,
      currentStatus:
        controlId === "MAA2-SRC-13-PASSWORD-CORRUPT"
          ? "partially_implemented_pending_calibration"
          : "specified_not_implemented",
      productionFunction: "PDF/OCR extraction pipeline (live: document ingest)",
      independentTruth: "Source binary hashes + independent OCR/page-unit recompute receipts",
      sharedUtilities: ["page schema types", "hash utilities"],
      sameSubstantiveAlgorithmRisk: false,
      independenceClass: "INDEPENDENCE_PENDING_PROOF",
    };
  }
  if (controlId === "MAA2-LSL-05-CATEGORY-SET-COVERAGE") {
    return {
      missingInput:
        "Structured legalStateTaxonomy / category-set authority fields on chargeInstruments[] (not prose-only)",
      ownerLane: "capture_materialisation_harness",
      producerOwner: "Batch-10/Stage-300 materialisation of chargeInstruments.legalStateRole + authority taxonomy bag",
      gapClass: "production_prose_only_not_structured",
      minEligibleDenominator: 1,
      acceptanceEvidence:
        "≥1 Cohort packet with taxonomy bag; LSL-05 evaluator eligible>0; blind calibration after freeze",
      nextBatch: "Batch-C-SPECIALTY-LSL-CHR-PRC (P0)",
      stage300CasesCanSupply: true,
      liveProductEventuallyRequired: true,
      currentStatus: "substantive_evaluator_implemented_pending_review",
      productionFunction: "charge instrument / legal-state builders",
      independentTruth: "Pinned authority taxonomy registry + instrument exact wording from source pages",
      sharedUtilities: ["chargeInstruments schema"],
      sameSubstantiveAlgorithmRisk: false,
      independenceClass: "INDEPENDENCE_PENDING_PROOF",
    };
  }
  if (theme === "chronology_competing_timestamps") {
    const bag =
      controlId.startsWith("MAA2-CHR-")
        ? "dobAgeCalcLedger (DOB, offence/hearing timestamps, timezone, calcInputs)"
        : "proceduralPartyState (youthState / fitnessParticipation / disclosurePiiState)";
    return {
      missingInput: `Explicit structured ${bag} on packets — not inferred from court prose`,
      ownerLane: "capture_materialisation_harness",
      producerOwner: "Stage-300 specialty-bag materialisation from source MG/custody/listing fields",
      gapClass: "production_does_not_emit",
      minEligibleDenominator: 1,
      acceptanceEvidence: `≥1 packet with ${bag}; named evaluator eligible>0; blind calibration`,
      nextBatch: "Batch-C-SPECIALTY-LSL-CHR-PRC (P0)",
      stage300CasesCanSupply: true,
      liveProductEventuallyRequired: true,
      currentStatus: "substantive_evaluator_implemented_pending_review",
      productionFunction: "chronology / procedural-state builders",
      independentTruth: "Source DOB/listing/custody documents with page-bound dates (truth key blinded until freeze)",
      sharedUtilities: ["chronologyEvents schema", "timezone normalisation"],
      sameSubstantiveAlgorithmRisk: controlId === "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
      independenceClass:
        controlId === "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING"
          ? "INDEPENDENCE_PENDING_PROOF"
          : "INDEPENDENCE_PENDING_PROOF",
    };
  }
  if (theme === "cross_exit_cross_audience") {
    return {
      missingInput:
        "Independent per-audience surface packs (client/court/CPS/supervisor/defence/prosecution/judicial) with comparable payloads — not a single composed_prose blob",
      ownerLane: "production_casebrain",
      producerOwner: "Live multi-audience exit producers + Stage-300 audience pack capture",
      gapClass: "production_does_not_emit",
      minEligibleDenominator: 1,
      acceptanceEvidence:
        "≥1 packet with ≥2 distinct audience surfaces; AUD/XPP detector contracts; independence vs production wording generators",
      nextBatch: "Batch-D-AUDIENCE-AUD-XPP (P1)",
      stage300CasesCanSupply: true,
      liveProductEventuallyRequired: true,
      currentStatus: "adapter_foundation_only",
      productionFunction: "audience wording / perspective generators",
      independentTruth: "Pinned audience-policy fixtures + source-bound must-not-overstate ledger",
      sharedUtilities: ["exitPayloadReceipts schema"],
      sameSubstantiveAlgorithmRisk: true,
      independenceClass: "INDEPENDENCE_PENDING_PROOF",
    };
  }
  // VDR / ELD
  const isEld = controlId.startsWith("MAA2-ELD-");
  return {
    missingInput: isEld
      ? "Non-synthetic evidence-locked draft version pairs with sentence receipts, actor/time/approval audit, and cross-exit propagation artefacts"
      : "Non-synthetic versioned run receipts (source hashes, membership order, commit/build, schema/detector/model pins, finding IDs, dispositions)",
    ownerLane: isEld ? "production_casebrain" : "capture_materialisation_harness",
    producerOwner: isEld
      ? "Evidence-locked drafting production path + version-pair capture harness"
      : "Assurance run recorder / VDR receipt emitter (harness) with production commit pins",
    gapClass: isEld ? "production_does_not_emit" : "production_does_not_emit",
    minEligibleDenominator: 1,
    acceptanceEvidence: isEld
      ? "≥1 real before/after draft pair with sentence-level receipts; ELD contracts; independence proof"
      : "≥1 frozen run pair with pinned hashes/versions; VDR contracts; independence proof",
    nextBatch: isEld ? "Batch-E-ELD-VERSION-PAIRS (P0/P1)" : "Batch-E-VDR-RECEIPTS (P1)",
    stage300CasesCanSupply: true,
    liveProductEventuallyRequired: true,
    currentStatus: statusFromRegister.includes("adapter_foundation")
      ? "adapter_foundation_only"
      : "adapter_foundation_only",
    productionFunction: isEld ? "locked drafting / redraft / approval emitters" : "run artefact emitters",
    independentTruth: isEld
      ? "Independent sentence/hash recompute from frozen drafts + source change ledger"
      : "Independent recompute of hashes/order from frozen artefacts (not the emitter under test)",
    sharedUtilities: ["hash utilities", "schema version constants"],
    sameSubstantiveAlgorithmRisk: false,
    independenceClass: "INDEPENDENCE_PENDING_PROOF",
  };
}

function main() {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, ESSENTIAL), "utf8")) as {
    schemaVersion: string;
    count: number;
    controls: Array<{
      controlId: string;
      familyCode: string;
      theme: string;
      implementationStatus: string;
      missingPrerequisiteOrAdapter: string;
    }>;
  };
  if (reg.controls.length !== 43) throw new Error(`Expected 43 controls, got ${reg.controls.length}`);

  const headCommit = head();
  const unlockRows = reg.controls.map((c) => {
    const spec = unlockSpec(c.controlId, c.theme, c.implementationStatus);
    const priority = priorityOf(c.controlId);
    return {
      controlId: c.controlId,
      plainEnglishPurpose: purposeOf(c.controlId),
      familyCode: c.familyCode,
      theme: c.theme,
      currentStatus: spec.currentStatus,
      priority,
      severity: priority,
      exactMissingInput: spec.missingInput,
      exactProducerOwner: spec.producerOwner,
      missingInputLane: spec.ownerLane,
      productionVsHarnessGapClass: spec.gapClass,
      minimumEligibleDenominator: spec.minEligibleDenominator,
      requiredAcceptanceEvidence: spec.acceptanceEvidence,
      nextImplementationBatch: spec.nextBatch,
      stage300CasesCanSupplyInput: spec.stage300CasesCanSupply,
      liveProductWorkEventuallyRequired: spec.liveProductEventuallyRequired,
      auditorIndependence: {
        productionFunctionUnderAudit: spec.productionFunction,
        independentSourceOrTruth: spec.independentTruth,
        sharedTypesSchemasUtilities: spec.sharedUtilities,
        expectedAndActualShareSubstantiveAlgorithm: spec.sameSubstantiveAlgorithmRisk,
        independenceClass: spec.independenceClass,
        note:
          spec.independenceClass === "TAUTOLOGICAL_UNSAFE"
            ? "Cannot PASS or promote until independence proved"
            : "Must prove auditor does not call the same substantive production function for expected values",
      },
    };
  });

  writeJson("43-control-unlock-path.json", {
    schemaVersion: "stage300-batch-b-43-control-unlock-path@1.0.0",
    authorityRegister: ESSENTIAL,
    authorityRegisterSchema: reg.schemaVersion,
    controlCount: 43,
    programmeObjective: "CONTROL_COVERAGE",
    essentialUnlocksAfterBatchB: 0,
    rows: unlockRows,
    note: "Exact unlock paths — no vague richer-input wording. Next batches must follow P0/P1 first.",
  });

  writeJson("production-vs-harness-gap-register.json", {
    schemaVersion: "stage300-batch-b-production-vs-harness-gap@1.0.0",
    liveAppModifiedThisUnit: false,
    rows: unlockRows.map((r) => ({
      controlId: r.controlId,
      gapClass: r.productionVsHarnessGapClass,
      missingInputLane: r.missingInputLane,
      exactMissingInput: r.exactMissingInput,
      productBacklogItemRequired: r.liveProductWorkEventuallyRequired,
      harnessOnlyRepairSufficient: r.productionVsHarnessGapClass === "production_emits_harness_loses",
      riskNote:
        r.liveProductWorkEventuallyRequired
          ? "Assurance may outpace live builders unless product backlog absorbs this input"
          : "Harness/corpus can close without live product change",
    })),
    firstClassProductRisk: true,
  });

  writeJson("calibration-economy-rule.json", {
    schemaVersion: "stage300-calibration-economy-rule@1.0.0",
    permanent: true,
    rules: [
      "Do not run corpus calibration when named eligible denominator = 0",
      "Fixtures prove evaluator behaviour only and are never corpus calibration",
      "Unavailable-behaviour contracts may run without corpus eligibility",
      "Calibration begins only when ≥1 genuine packet satisfies the exact named prerequisite",
      "Zero-candidate FP/FN/recall rates remain null",
    ],
    metricsToRecordEachCalibration: [
      "runtimeMs",
      "casesScanned",
      "controlsExercised",
      "namedEligibleDenominators",
      "artefactBytes",
      "humanReviewBurdenEstimate",
    ],
    batchBApplication: {
      namedEligibleDenominator: 0,
      corpusCalibrationRun: false,
      fixtureContractsAllowed: true,
      fpFnRecall: null,
    },
  });

  writeJson("auditor-independence-tautology-register.json", {
    schemaVersion: "stage300-auditor-independence-tautology@1.0.0",
    rule: "Auditor must not calculate expected answers by calling the same production function it audits. Shared schemas/mechanical normalisation allowed only when they cannot reproduce the substantive decision.",
    tautologicalUnsafeCannotPassOrPromote: true,
    rows: unlockRows.map((r) => ({
      controlId: r.controlId,
      ...r.auditorIndependence,
    })),
    tautologicalUnsafeCount: unlockRows.filter((r) => r.auditorIndependence.independenceClass === "TAUTOLOGICAL_UNSAFE")
      .length,
    pendingProofCount: unlockRows.filter(
      (r) => r.auditorIndependence.independenceClass === "INDEPENDENCE_PENDING_PROOF",
    ).length,
  });

  const byPri = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const r of unlockRows) byPri[r.priority] += 1;
  writeJson("control-priority-severity-register.json", {
    schemaVersion: "stage300-control-priority-severity@1.0.0",
    definitions: {
      P0: "safety-critical leakage, attribution, charge, evidence-state or deadline risk",
      P1: "material solicitor-decision risk",
      P2: "wording, consistency or workflow quality",
      P3: "convenience or polish",
    },
    totals: byPri,
    orderedControlIds: [...unlockRows]
      .sort((a, b) => a.priority.localeCompare(b.priority) || a.controlId.localeCompare(b.controlId))
      .map((r) => ({ controlId: r.controlId, priority: r.priority })),
    rule: "Future implementation and case materialisation must address P0/P1 first.",
  });

  writeJson("foundation-stop-rule.json", {
    schemaVersion: "stage300-foundation-stop-rule@1.0.0",
    permanent: true,
    permittedFoundationBatchOnlyIf: [
      "unlocks a named essential control",
      "supplies an exact missing production/corpus input",
      "closes a documented safety gap",
    ],
    ifUnlocksZeroControlsMustChoose: [
      "build_missing_source_packets",
      "repair_capture_materialisation",
      "add_live_product_backlog_item",
      "defer_control",
      "move_to_later_stage",
    ],
    batchBDecision: {
      unlockedEssentialControls: 0,
      foundationOnlyElaborationForbiddenGoingForward: true,
      explicitDecisionRequired: true,
      chosenPathHint: "Batch-C-SPECIALTY-LSL-CHR-PRC or Batch-C-OCR-SRC or explicit deferral — not another adapter-only batch",
    },
  });

  writeJson("version-and-drift-control.json", {
    schemaVersion: "stage300-version-and-drift-control@1.0.0",
    pins: {
      appCommitBaseline: BATCH_B_BASELINE,
      appCommitHeadAtAcceptance: headCommit,
      batchBSchemaVersion: BATCH_B_SCHEMA_VERSION,
      batch8SchemaVersion: "maa-v2-stage150-batch8-structured-adapter@1.3.0",
      essentialControlRegister:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-execution-readiness-plan/stage300-essential-control-register.json",
      essentialControlRegisterSchema: reg.schemaVersion,
      orderedMembershipSha256: ORDERED_MEMBERSHIP_SHA256,
      candidateFreezeSha256: CANDIDATE_FREEZE_SHA256,
    },
    rule: "Any later change must emit a migration/diff receipt. Historical results must never be silently reinterpreted.",
  });

  writeJson("pre-agreed-acceptance-semantics-template.json", {
    schemaVersion: "stage300-pre-agreed-acceptance-semantics@1.0.0",
    permanent: true,
    requiredBeforeEveryFutureBatch: [
      "exactControlsTargeted",
      "exactInputNeeded",
      "exactEligibilityMeaning",
      "expectedDenominator",
      "permittedOutcomes",
      "whatCountsAsCompletion",
      "whatCannotBeClaimed",
    ],
    rule: "Written before implementation, not after results are known.",
    nextBatchStubExample: {
      batchId: "Batch-C-SPECIALTY-LSL-CHR-PRC",
      exactControlsTargeted: [
        "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
        "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
        "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
        "MAA2-PRC-03-YOUTH-STATE",
        "MAA2-PRC-04-FITNESS-PARTICIPATION",
        "MAA2-PRC-07-DISCLOSURE-PII-STATE",
      ],
      exactInputNeeded: "legalStateTaxonomy + dobAgeCalcLedger + proceduralPartyState on Stage-300 packets",
      exactEligibilityMeaning: "namedControlPrerequisiteComplete for specialty bags; capabilityStatus uses named only",
      expectedDenominator: "≥1 eligible packet per control before corpus calibration",
      permittedOutcomes: ["eligible>0 calibration", "explicit unavailable with specialty still missing"],
      whatCountsAsCompletion: "specialty bags present + contracts + blind freeze before truth + independence proof started",
      whatCannotBeClaimed: ["PASS", "promotion", "adapter-only unlock", "fixture rates as corpus rates"],
    },
  });

  writeJson("GOVERNANCE-INDEX.json", {
    schemaVersion: "stage300-batch-b-governance-index@1.0.0",
    decisionCardRelativePath:
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-batch-b-evidence-provenance-chase-exits/BATCH-B-DECISION-CARD.md",
    artefacts: [
      "43-control-unlock-path.json",
      "production-vs-harness-gap-register.json",
      "calibration-economy-rule.json",
      "auditor-independence-tautology-register.json",
      "control-priority-severity-register.json",
      "foundation-stop-rule.json",
      "version-and-drift-control.json",
      "pre-agreed-acceptance-semantics-template.json",
    ].map((n) => ({
      name: n,
      sha256: sha(fs.readFileSync(path.join(OUT, n), "utf8")),
    })),
  });

  console.log(
    JSON.stringify(
      {
        out: path.relative(ROOT, OUT).replace(/\\/g, "/"),
        controls: 43,
        byPriority: byPri,
        tautologicalUnsafe: unlockRows.filter((r) => r.auditorIndependence.independenceClass === "TAUTOLOGICAL_UNSAFE")
          .length,
      },
      null,
      2,
    ),
  );
}

main();
