/**
 * Named-prerequisite capability checks for the 43 essential controls.
 * Does not run audit verdicts. Does not open truth keys.
 */

import fs from "node:fs";
import path from "node:path";

import type { New150CaseSpec } from "./coverage-catalog";
import type { New150CaptureResult } from "./production-capture";
import { PRODUCTION_EXITS } from "./constants";

export type ControlCoverageRow = {
  controlId: string;
  priority: string;
  targetDenominator: number;
  achievedDenominator: number;
  genuineEligibleCaseIds: string[];
  partialOrUnavailableCaseIds: string[];
  corpusDesignSatisfiedCount: number;
  exactMissingInputWhereMissed: string | null;
  ownership: "source_corpus" | "production_casebrain" | "capture_materialisation_harness" | "browser" | "human_legal_external" | "mixed";
  readyForStage300Calibration: boolean;
  deferReason: string | null;
};

const UNLOCK_PATH =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-batch-b-evidence-provenance-chase-exits/governance/43-control-unlock-path.json";

type UnlockRow = {
  controlId: string;
  priority: string;
  exactMissingInput: string;
  minimumEligibleDenominator: number;
  missingInputLane: string;
  productionVsHarnessGapClass: string;
  stage300CasesCanSupplyInput: boolean;
  liveProductWorkEventuallyRequired: boolean;
  auditorIndependence?: { independenceClass?: string };
};

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function familyOf(controlId: string): string {
  const m = controlId.match(/^MAA2-([A-Z]+)-/);
  return m?.[1] ?? "UNK";
}

export function loadUnlockRows(repoRoot: string): UnlockRow[] {
  const raw = JSON.parse(fs.readFileSync(path.join(repoRoot, UNLOCK_PATH), "utf8")) as {
    rows: UnlockRow[];
  };
  return raw.rows;
}

export type CaseCapabilitySnapshot = {
  caseId: string;
  coverageTag: string;
  targetedControlIds: string[];
  sixProductionExitsComplete: boolean;
  ocrReceiptsPresent: boolean;
  vdrReceiptPresent: boolean;
  sourceCapability: Record<string, unknown> | null;
  productionSpecialtyBags: {
    legalStateTaxonomy: boolean;
    dobAgeCalcLedger: boolean;
    proceduralPartyState: boolean;
  };
  audiencePacksPresent: boolean;
  eldProductionPairsPresent: boolean;
  corpusDesignByControl: Record<string, boolean>;
  namedCompleteByControl: Record<string, boolean>;
};

export function scanCaseCapability(args: {
  spec: New150CaseSpec;
  capture: New150CaptureResult;
  sourceDir: string;
}): CaseCapabilitySnapshot {
  const { spec, capture, sourceDir } = args;
  const sixOk = PRODUCTION_EXITS.every((e) => !!capture.exitHashes[e]);
  const ocrReceiptsPresent = capture.ocrReceiptSha256 != null && fs.existsSync(path.join(sourceDir, "ocr-page-unit-receipts.json"));
  const vdrReceiptPresent = fs.existsSync(path.join(sourceDir, "vdr-run-receipt.json"));
  const inv = fs.existsSync(path.join(sourceDir, "source-capability-inventory.json"))
    ? (JSON.parse(fs.readFileSync(path.join(sourceDir, "source-capability-inventory.json"), "utf8")) as Record<
        string,
        unknown
      >)
    : null;

  const cb = JSON.parse(fs.readFileSync(path.join(sourceDir, "casebrain-output.json"), "utf8")) as Record<
    string,
    unknown
  >;

  // Specialty bags must NEVER live on CaseBrain output. Independent expectations only.
  const harnessPath = path.join(sourceDir, "specialty-bags-harness.json");
  const harness = fs.existsSync(harnessPath)
    ? (JSON.parse(fs.readFileSync(harnessPath, "utf8")) as Record<string, unknown>)
    : null;
  const harnessOk =
    harness != null &&
    harness.notFromTruthKey !== false &&
    harness.notFromCaseBrainProductionEmitter !== false &&
    !isObj(cb.legalStateTaxonomy) &&
    !isObj(cb.dobAgeCalcLedger) &&
    !isObj(cb.proceduralPartyState);

  const specialtyExpectations = {
    legalStateTaxonomy: harnessOk && isObj(harness.legalStateTaxonomy),
    dobAgeCalcLedger: harnessOk && isObj(harness.dobAgeCalcLedger),
    proceduralPartyState: harnessOk && isObj(harness.proceduralPartyState),
    derivedNumericClaims:
      harnessOk &&
      (Array.isArray(harness.derivedNumericClaims) ||
        (isObj(harness.dobAgeCalcLedger) &&
          Array.isArray((harness.dobAgeCalcLedger as Record<string, unknown>).calcInputs) &&
          ((harness.dobAgeCalcLedger as Record<string, unknown>).calcInputs as unknown[]).length > 0)),
  };

  // CaseBrain production emitter specialty bags — must remain false until product emits.
  const productionSpecialtyBags = {
    legalStateTaxonomy: isObj(cb.legalStateTaxonomy),
    dobAgeCalcLedger: isObj(cb.dobAgeCalcLedger),
    proceduralPartyState: isObj(cb.proceduralPartyState),
  };

  let audiencePacksPresent = false;
  const audPackPath = path.join(sourceDir, "audience-packs.json");
  if (fs.existsSync(audPackPath)) {
    const a = JSON.parse(fs.readFileSync(audPackPath, "utf8")) as {
      independentAudiencePacksPresent?: boolean;
      packs?: Array<{ audienceId: string }>;
    };
    audiencePacksPresent = a.independentAudiencePacksPresent === true && (a.packs?.length ?? 0) >= 2;
  } else {
    const audPath = path.join(sourceDir, "audience-pack-attempt.json");
    if (fs.existsSync(audPath)) {
      const a = JSON.parse(fs.readFileSync(audPath, "utf8")) as { independentAudiencePacksPresent?: boolean };
      audiencePacksPresent = a.independentAudiencePacksPresent === true;
    }
  }

  let eldProductionPairsPresent = false;
  if (fs.existsSync(path.join(sourceDir, "eld-version-pair.json"))) {
    const eld = JSON.parse(fs.readFileSync(path.join(sourceDir, "eld-version-pair.json"), "utf8")) as {
      productionEldVersionPairsPresent?: boolean;
      sentenceReceipts?: unknown[];
    };
    eldProductionPairsPresent =
      eld.productionEldVersionPairsPresent === true && (eld.sentenceReceipts?.length ?? 0) > 0;
  } else {
    const eldPath = path.join(sourceDir, "eld-source-draft-pair-inventory.json");
    if (fs.existsSync(eldPath)) {
      const e = JSON.parse(fs.readFileSync(eldPath, "utf8")) as { productionEldVersionPairsPresent?: boolean };
      eldProductionPairsPresent = e.productionEldVersionPairsPresent === true;
    }
  }

  const corpusDesignByControl: Record<string, boolean> = {};
  const namedCompleteByControl: Record<string, boolean> = {};

  const mark = (id: string, corpus: boolean, named: boolean) => {
    corpusDesignByControl[id] = corpus;
    namedCompleteByControl[id] = named;
  };

  // SRC — OCR/binary receipts are the named prerequisite (source corpus).
  for (const id of [
    "MAA2-SRC-07-REDACTION-DETECT",
    "MAA2-SRC-09-PAGINATION-DISCONTINUITY",
    "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
    "MAA2-SRC-13-PASSWORD-CORRUPT",
    "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
  ]) {
    const designed =
      spec.sourceFacts.ocrHeavy ||
      spec.sourceFacts.attachmentAbsentRef ||
      spec.sourceFacts.passwordCorruptFlag ||
      spec.sourceFacts.redactionMaskPresent;
    mark(id, designed, designed && ocrReceiptsPresent);
  }

  // LSL/CHR/PRC — auditor-testable via independent harness expectations only (not CaseBrain output).
  mark(
    "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
    !!inv?.legalCategoryLabelsPresent,
    specialtyExpectations.legalStateTaxonomy,
  );
  mark(
    "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
    !!inv?.dateOfBirthPresent,
    specialtyExpectations.dobAgeCalcLedger,
  );
  mark(
    "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
    !!inv?.dateOfBirthPresent,
    specialtyExpectations.derivedNumericClaims,
  );
  mark(
    "MAA2-PRC-03-YOUTH-STATE",
    !!inv?.youthCourt,
    specialtyExpectations.proceduralPartyState &&
      isObj((harness?.proceduralPartyState as Record<string, unknown> | undefined)?.youthState),
  );
  mark(
    "MAA2-PRC-04-FITNESS-PARTICIPATION",
    !!inv?.fitnessAllegationPresent,
    specialtyExpectations.proceduralPartyState &&
      isObj((harness?.proceduralPartyState as Record<string, unknown> | undefined)?.fitnessParticipation),
  );
  mark(
    "MAA2-PRC-07-DISCLOSURE-PII-STATE",
    !!inv?.disclosurePiiBoundaryPresent,
    specialtyExpectations.proceduralPartyState &&
      isObj((harness?.proceduralPartyState as Record<string, unknown> | undefined)?.disclosurePiiState),
  );

  // AUD/XPP — require distinct packs; map specific audiences where possible.
  const audPacks = fs.existsSync(audPackPath)
    ? (JSON.parse(fs.readFileSync(audPackPath, "utf8")) as {
        packs?: Array<{ audienceId: string; perspectiveId: string }>;
      })
    : null;
  const hasAud = (id: string) =>
    audiencePacksPresent && !!audPacks?.packs?.some((p) => p.audienceId === id || p.perspectiveId.includes(id));
  mark("MAA2-AUD-02-CLIENT-PLAIN", !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt, hasAud("client"));
  mark("MAA2-AUD-03-COURT-PRECISE", !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt, hasAud("court"));
  mark("MAA2-AUD-04-CPS-SPECIFIC", !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt, hasAud("cps"));
  mark(
    "MAA2-AUD-05-SUPERVISOR-RISK",
    !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt,
    hasAud("supervisor"),
  );
  mark(
    "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE",
    !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt,
    hasAud("defence"),
  );
  mark(
    "MAA2-XPP-02-PROSECUTION-CHALLENGE",
    !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt,
    hasAud("prosecution"),
  );
  mark(
    "MAA2-XPP-03-JUDICIAL-NEUTRALITY",
    !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt,
    hasAud("judicial"),
  );
  mark(
    "MAA2-XPP-04-CLIENT-COMPREHENSION",
    !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt,
    hasAud("client"),
  );
  mark(
    "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE",
    !!inv?.audiencePackAttempt || spec.sourceFacts.audiencePackAttempt,
    hasAud("supervisor"),
  );

  // VDR — harness run receipts with field-level honesty (do not treat empty pins as complete).
  let vdr: Record<string, unknown> | null = null;
  if (vdrReceiptPresent) {
    vdr = JSON.parse(fs.readFileSync(path.join(sourceDir, "vdr-run-receipt.json"), "utf8")) as Record<
      string,
      unknown
    >;
  }
  const vdrBase = !!(vdrReceiptPresent && sixOk && vdr && typeof vdr.sourceBinarySha256 === "string");
  mark("MAA2-VDR-01-SOURCE-CASE-HASHES", true, vdrBase);
  mark(
    "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER",
    true,
    !!(vdrBase && vdr && typeof vdr.membershipSequence === "number"),
  );
  mark(
    "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD",
    true,
    !!(vdrBase && vdr && typeof vdr.appCommit === "string" && vdr.appCommit !== "unknown"),
  );
  mark(
    "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
    true,
    !!(vdrBase && vdr && typeof vdr.corpusSchema === "string" && vdr.detectorRegistryVersion != null),
  );
  mark(
    "MAA2-VDR-05-MODEL-PROMPT-VERSION",
    true,
    !!(vdrBase && vdr && vdr.modelPromptVersion != null),
  );
  mark(
    "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS",
    true,
    !!(vdrBase && vdr && Array.isArray(vdr.findingIds) && (vdr.findingIds as unknown[]).length > 0),
  );
  mark(
    "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS",
    true,
    !!(
      vdrBase &&
      vdr &&
      typeof vdr.producedAt === "string" &&
      Array.isArray(vdr.dispositions) &&
      (vdr.dispositions as unknown[]).length > 0
    ),
  );
  mark(
    "MAA2-VDR-08-BEFORE-AFTER-MAPPING",
    true,
    !!(vdrBase && vdr && isObj(vdr.beforeAfterMapping)),
  );
  mark(
    "MAA2-VDR-09-ADDED-REMOVED-RETAINED",
    true,
    !!(
      vdrBase &&
      vdr &&
      isObj(vdr.beforeAfterMapping) &&
      isObj((vdr.beforeAfterMapping as Record<string, unknown>).delta)
    ),
  );

  // ELD — production version pairs required
  for (const id of [
    "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
    "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES",
    "MAA2-ELD-03-STALE-DRAFT-MARKING",
    "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS",
    "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE",
    "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON",
    "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL",
    "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY",
    "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH",
    "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL",
    "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED",
    "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE",
    "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE",
    "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT",
  ]) {
    mark(id, !!inv?.versionDraftPair || spec.sourceFacts.versionDraftPair, eldProductionPairsPresent);
  }

  return {
    caseId: spec.caseId,
    coverageTag: spec.coverageTag,
    targetedControlIds: spec.targetedControlIds,
    sixProductionExitsComplete: sixOk,
    ocrReceiptsPresent,
    vdrReceiptPresent,
    sourceCapability: inv,
    productionSpecialtyBags,
    audiencePacksPresent,
    eldProductionPairsPresent,
    corpusDesignByControl,
    namedCompleteByControl,
  };
}

export function buildPerControlDenominatorReport(args: {
  repoRoot: string;
  snapshots: CaseCapabilitySnapshot[];
}): ControlCoverageRow[] {
  const unlock = loadUnlockRows(args.repoRoot);
  return unlock.map((u) => {
    const eligible: string[] = [];
    const partial: string[] = [];
    let corpusDesign = 0;
    for (const s of args.snapshots) {
      const designed = s.corpusDesignByControl[u.controlId] === true;
      const named = s.namedCompleteByControl[u.controlId] === true;
      if (designed) corpusDesign += 1;
      if (named) eligible.push(s.caseId);
      else if (designed) partial.push(s.caseId);
    }
    const fam = familyOf(u.controlId);
    const ownership =
      fam === "SRC"
        ? "source_corpus"
        : fam === "VDR" || fam === "LSL" || fam === "CHR" || fam === "PRC"
          ? "capture_materialisation_harness"
          : fam === "AUD" || fam === "XPP" || fam === "ELD"
            ? "production_casebrain"
            : "mixed";

    const independenceUnsafe = u.auditorIndependence?.independenceClass === "TAUTOLOGICAL_UNSAFE";
    const achieved = eligible.length;
    const ready =
      achieved >= u.minimumEligibleDenominator && !independenceUnsafe && u.stage300CasesCanSupplyInput;

    let deferReason: string | null = null;
    let missing: string | null = null;
    if (achieved < u.minimumEligibleDenominator) {
      missing = u.exactMissingInput;
      if (u.productionVsHarnessGapClass === "production_does_not_emit") {
        deferReason = `production_does_not_emit — live product work required; corpusDesignSatisfied=${corpusDesign}`;
      } else if (u.productionVsHarnessGapClass === "production_prose_only_not_structured") {
        deferReason = `production_prose_only_not_structured — structured bag absent; corpusDesignSatisfied=${corpusDesign}`;
      } else if (u.productionVsHarnessGapClass === "source_packets_do_not_contain" && achieved === 0) {
        deferReason = "source OCR/binary receipts not present on enough cases";
      } else {
        deferReason = `named prerequisite incomplete — gapClass=${u.productionVsHarnessGapClass}`;
      }
    }

    return {
      controlId: u.controlId,
      priority: u.priority,
      targetDenominator: u.minimumEligibleDenominator,
      achievedDenominator: achieved,
      genuineEligibleCaseIds: eligible,
      partialOrUnavailableCaseIds: partial,
      corpusDesignSatisfiedCount: corpusDesign,
      exactMissingInputWhereMissed: missing,
      ownership: ownership as ControlCoverageRow["ownership"],
      readyForStage300Calibration: ready,
      deferReason,
    };
  });
}
