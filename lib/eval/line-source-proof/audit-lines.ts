import { lintBadOutputMemory } from "@/lib/criminal/trust/bad-output-memory";
import type { H5CaseModels } from "./build-case-models";
import {
  assignReviewTier,
  isGenericSafetyGuardLine,
  isPositiveSourceBackedFinding,
  refineAfterTier,
} from "./review-tier";
import {
  bundleHasFullAbeRecording,
  bundleHasFullPhoneDownload,
  bundleHasMasterCctvServed,
  bundleMentionsPhoneOrExtraction,
  claimsAbeFullyServed,
  claimsEncroProves,
  claimsFullPhoneServed,
  claimsGenericExtractionOutstanding,
  claimsHandleIsDefendant,
  claimsStillsAsFullCctvProof,
  isCoDefendantSafetyLine,
  isMisplacedFamilyChaseLine,
  treatsOtherDefendantAsThisEvidence,
} from "./case-shape-anchors";
import { resolveHumanEvidenceLabel } from "./present-labels";
import { humaniseLedgerLine } from "./ledger-display";
import {
  inferSupportFromEvidenceState,
  isDerivedWorkflowStatus,
  isMeaningfulEvidenceCategory,
  matchSourceForLine,
  requiresLineLevelProof,
} from "./source-match";
import type {
  LineCategory,
  LineSourceProofRecord,
  LineSupportStatus,
  LineUsefulnessVerdict,
  LineVerdict,
  ReviewTier,
} from "./types";

let seq = 0;

function id(): string {
  seq += 1;
  return `line-${seq}`;
}

type DraftLine = {
  outputSurface: string;
  outputLine: string;
  lineCategory: LineCategory;
  evidenceItem?: string | null;
  claimType?: string | null;
  evidenceState?: string | null;
  reliabilityState?: string | null;
  evidenceAnchor?: string | null;
  solicitorReviewRequired?: boolean;
  derivationNote?: string | null;
};

function push(out: DraftLine[], line: DraftLine): void {
  const text = line.outputLine?.trim();
  if (!text || text.length < 3) return;
  if (/^(copy|download|export|overview|court prep)$/i.test(text)) return;
  out.push(line);
}

export function collectMeaningfulLines(models: H5CaseModels): DraftLine[] {
  seq = 0;
  const lines: DraftLine[] = [];
  const { five, chase, warRoom, hearing, exportPack, matterConfidence, matterBrief, decisionBoard } = models;

  push(lines, {
    outputSurface: "overview / five_answers",
    outputLine: `Allegation: ${five.caseSaying.allegation}`,
    lineCategory: "evidence_claim",
    claimType: "fact",
  });
  push(lines, {
    outputSurface: "overview / five_answers",
    outputLine: five.caseSaying.mainIssue,
    lineCategory: "strategic_review",
    claimType: "inference",
    derivationNote: "Derived from matter confidence / disclosure summary builders.",
  });
  push(lines, {
    outputSurface: "overview / five_answers",
    outputLine: `Next action: ${five.caseSaying.nextAction}`,
    lineCategory: "confidence_status",
    claimType: "warning",
    derivationNote: "Derived from matter confidence nextBestAction field.",
  });

  for (const row of five.evidenceState.rows) {
    push(lines, {
      outputSurface: "evidence_truth_map / evidence_trace",
      outputLine: `${row.label} — ${row.existence}${row.note ? ` — ${row.note}` : ""}`,
      lineCategory: "evidence_state",
      evidenceItem: row.label,
      evidenceState: row.existence,
      reliabilityState: row.reliability,
      claimType: "fact",
    });
  }

  for (const row of five.evidenceTrace?.rows ?? []) {
    const isGuard = row.section === "do_not_overstate" || /^do not\b/i.test(row.claim.trim());
    push(lines, {
      outputSurface: isGuard ? "five_answers / do_not_overstate" : "evidence_truth_map / evidence_trace",
      outputLine: `${row.claim}: ${row.existence} / ${row.reliability}`,
      lineCategory: isGuard ? "safety_warning" : "evidence_state",
      evidenceItem: row.claim,
      evidenceState: row.existence,
      reliabilityState: row.reliability,
      evidenceAnchor: row.sourceAnchor ?? null,
      claimType: isGuard ? "do_not_overstate" : undefined,
    });
  }

  for (const item of chase.primaryItems) {
    push(lines, {
      outputSurface: "chase",
      outputLine: item.label,
      lineCategory: "chase_request",
      evidenceItem: item.label,
      evidenceState: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    if (item.draftChaseWording?.trim()) {
      push(lines, {
        outputSurface: "chase / CPS",
        outputLine: item.draftChaseWording,
        lineCategory: "chase_request",
        evidenceItem: item.label,
        evidenceAnchor: item.evidenceAnchor,
      });
    }
    if (item.courtLine?.trim()) {
      push(lines, {
        outputSurface: "chase / court_line",
        outputLine: item.courtLine,
        lineCategory: "court_note",
        evidenceItem: item.label,
        evidenceAnchor: item.evidenceAnchor,
      });
    }
  }

  if (chase.safeCourtLine?.trim()) {
    push(lines, {
      outputSurface: "court_note",
      outputLine: chase.safeCourtLine,
      lineCategory: "court_note",
      claimType: "court_note",
    });
  }

  if (five.courtNote.text?.trim()) {
    push(lines, {
      outputSurface: "five_answers / court_note",
      outputLine: five.courtNote.text,
      lineCategory: "court_note",
      claimType: "court_note",
      solicitorReviewRequired: !five.courtNote.canCopy,
    });
  }

  for (const row of five.chase) {
    if (row.copySuggestion?.trim()) {
      push(lines, {
        outputSurface: "five_answers / chase",
        outputLine: row.copySuggestion,
        lineCategory: "chase_request",
        evidenceItem: row.label,
        evidenceState: row.existence,
      });
    }
  }

  for (const w of five.mustNotOverstate) {
    push(lines, {
      outputSurface: "five_answers / do_not_overstate",
      outputLine: w,
      lineCategory: "safety_warning",
      claimType: "do_not_overstate",
    });
  }

  for (const r of five.evidenceState.hardRules) {
    push(lines, {
      outputSurface: "evidence_truth_rules",
      outputLine: r,
      lineCategory: "safety_warning",
    });
  }

  for (const c of five.contradictions) {
    push(lines, {
      outputSurface: "five_answers / contradictions",
      outputLine: `${c.label}: ${c.summary}`,
      lineCategory: "contradiction_or_risk",
      claimType: "contradiction",
    });
  }

  push(lines, {
    outputSurface: "hearing_mode / court_prep",
    outputLine: hearing.caseInOneMinute.prosecutionTheory,
    lineCategory: "strategic_review",
    derivationNote: "Derived from brief plan / chase disclosure summary.",
  });
  push(lines, {
    outputSurface: "hearing_mode / court_prep",
    outputLine: `Main issue: ${hearing.caseInOneMinute.mainIssue}`,
    lineCategory: "strategic_review",
    derivationNote: "Derived from Five Answers main issue field.",
  });
  push(lines, {
    outputSurface: "hearing_mode / court_prep",
    outputLine: `Next action: ${hearing.nextAction.label} — ${hearing.nextAction.detail}`,
    lineCategory: "confidence_status",
    derivationNote: "Derived from hearing mode next-action resolver.",
  });

  for (const row of hearing.evidenceSnapshot) {
    push(lines, {
      outputSurface: "hearing_mode / court_prep",
      outputLine: `${row.label}: ${row.existenceLabel} / ${row.reliabilityLabel}${row.note ? ` — ${row.note}` : ""}`,
      lineCategory: "evidence_state",
      evidenceItem: row.label,
      evidenceState: row.existence,
      reliabilityState: row.reliability,
    });
  }

  for (const item of hearing.topChaseItems) {
    push(lines, {
      outputSurface: "hearing_mode / court_prep",
      outputLine: `${item.label}: ${item.existenceLabel} — ${item.cpsChaseWording}`,
      lineCategory: "chase_request",
      evidenceItem: item.label,
    });
  }

  if (warRoom.safePositionToday?.trim()) {
    push(lines, {
      outputSurface: "today / summary",
      outputLine: warRoom.safePositionToday,
      lineCategory: "strategic_review",
      derivationNote: "Derived from war room safe position builder.",
    });
  }
  for (const line of warRoom.sayThis ?? []) {
    push(lines, {
      outputSurface: "today",
      outputLine: line,
      lineCategory: "strategic_review",
      derivationNote: "Derived from war room sayThis prompts.",
    });
  }
  for (const line of warRoom.doNotOverstate ?? []) {
    push(lines, {
      outputSurface: "today / warnings",
      outputLine: line,
      lineCategory: "safety_warning",
    });
  }

  for (const section of matterBrief.sections) {
    if (section.paragraph?.trim()) {
      push(lines, {
        outputSurface: `summary / ${section.id}`,
        outputLine: section.paragraph,
        lineCategory: section.id === "client" ? "client_summary" : "strategic_review",
        derivationNote: section.id === "client" ? undefined : "Derived from matter brief section builder.",
      });
    }
    for (const b of section.bullets ?? []) {
      push(lines, {
        outputSurface: `summary / ${section.id}`,
        outputLine: b,
        lineCategory: section.id === "client" ? "client_summary" : "strategic_review",
        derivationNote: section.id === "client" ? undefined : "Derived from matter brief bullets.",
      });
    }
  }
  if (matterBrief.courtDayNote?.trim()) {
    push(lines, {
      outputSurface: "summary / court_day",
      outputLine: matterBrief.courtDayNote,
      lineCategory: "court_note",
    });
  }

  push(lines, {
    outputSurface: "confidence_dashboard",
    outputLine: `Confidence: ${matterConfidence.label} — ${matterConfidence.doNotRelyYetReason ?? "review before relying"}`,
    lineCategory: "confidence_status",
    evidenceState: matterConfidence.level,
    derivationNote: "Derived from matter confidence builder.",
  });
  push(lines, {
    outputSurface: "confidence_dashboard",
    outputLine: `Chase sendability: ${matterConfidence.chaseSendability}; Summary sendability: ${matterConfidence.summarySendability}`,
    lineCategory: "confidence_status",
    derivationNote: "Derived from matter confidence sendability fields.",
  });

  for (const opt of decisionBoard.options) {
    push(lines, {
      outputSurface: "decision_board",
      outputLine: `${opt.title}: ${opt.whyItMatters}`,
      lineCategory: "strategic_review",
      claimType: "inference",
      derivationNote: "Derived from decision board option builder.",
    });
    if (opt.riskCaution?.trim()) {
      push(lines, {
        outputSurface: "decision_board",
        outputLine: opt.riskCaution,
        lineCategory: "strategic_review",
        derivationNote: "Derived from decision board risk caution.",
      });
    }
    if (opt.nextAction?.trim()) {
      push(lines, {
        outputSurface: "decision_board",
        outputLine: opt.nextAction,
        lineCategory: "strategic_review",
        derivationNote: "Derived from decision board next action.",
      });
    }
  }

  for (const sig of hearing.reviewPrompts ?? []) {
    push(lines, {
      outputSurface: "advice_change_radar",
      outputLine: `${sig.summary} — Review: ${sig.reviewNeeded}`,
      lineCategory: "contradiction_or_risk",
      claimType: "warning",
      derivationNote: "Derived from advice change radar prompts.",
    });
  }

  for (const section of exportPack.sections) {
    if (section.id === "full_pack") continue;
    const preview = section.textForClipboard?.trim();
    if (!preview) continue;
    const chunks = preview.split(/\n\n+/).filter((c) => c.trim().length > 20);
    for (const chunk of chunks.slice(0, 4)) {
      push(lines, {
        outputSurface: `export_pack / ${section.id}`,
        outputLine: chunk.slice(0, 400),
        lineCategory: "export_line",
        claimType: section.id,
        solicitorReviewRequired: section.sendability !== "safe_to_send",
      });
    }
  }

  return lines;
}

const UNSAFE_RE =
  /\b(case collapses|guaranteed|we win|prosecution fails|must be dismissed|clearly proves|obviously)\b/i;
const OVERSTATE_RE = /\b(bwv shows|bwv confirms|bwv proves|custody confirms|pace confirms|extraction proves|cctv shows|cctv proves)\b/i;

function buildGedReviewReasons(
  draft: DraftLine,
  source: ReturnType<typeof matchSourceForLine>,
  support: LineSupportStatus,
  solicitorReviewRequired: boolean,
): string[] {
  if (isGenericSafetyGuardLine({
    outputLine: draft.outputLine,
    lineCategory: draft.lineCategory,
    claimType: draft.claimType ?? null,
    outputSurface: draft.outputSurface,
  })) {
    return [];
  }

  const reasons: string[] = [];
  if (!source.sourceSnippet) reasons.push("source_unavailable");
  if (source.genericSourceOnly) reasons.push("generic_source_only");
  if (source.adjacentMismatch) reasons.push("adjacent_source_mismatch");
  if (!source.evidenceItemInSnippet && draft.evidenceItem && requiresLineLevelProof(draft.lineCategory)) {
    reasons.push("evidence_item_not_in_snippet");
  }
  if (source.reviewReason === "bundle_does_not_mention_cctv") reasons.push("bundle_does_not_mention_cctv");
  if (source.reviewReason === "bundle_does_not_mention_cad") reasons.push("bundle_does_not_mention_cad");
  if (source.reviewReason === "bundle_does_not_mention_phone_extraction") {
    reasons.push("bundle_does_not_mention_phone_extraction");
  }
  if (source.reviewReason === "full_extraction_overclaim") reasons.push("full_extraction_overclaim");
  if (source.reviewReason === "handle_attribution_overclaim") reasons.push("handle_attribution_overclaim");
  if (source.reviewReason === "encro_overclaim") reasons.push("encro_overclaim");
  if (source.reviewReason === "abe_overclaim") reasons.push("abe_overclaim");
  if (source.reviewReason === "cctv_stills_overclaim") reasons.push("cctv_stills_overclaim");
  if (source.reviewReason === "other_defendant_bleed") reasons.push("other_defendant_bleed");
  if (
    isMeaningfulEvidenceCategory(draft.lineCategory) &&
    support === "source_unavailable" &&
    !source.sourceSnippet
  ) {
    reasons.push("meaningful_line_without_anchor");
  }
  if (solicitorReviewRequired && reasons.length > 0) reasons.push("solicitor_review_required");
  return [...new Set(reasons)];
}

export function auditLine(draft: DraftLine, models: H5CaseModels): LineSourceProofRecord {
  let source = matchSourceForLine(
    models.bundleText,
    draft.outputLine,
    draft.evidenceItem ?? null,
    draft.evidenceAnchor ?? null,
    draft.lineCategory,
  );

  if (claimsFullPhoneServed(draft.outputLine) && !bundleHasFullPhoneDownload(models.bundleText)) {
    source = {
      ...source,
      sourceSnippet: null,
      sourceStrength: "no_anchor",
      adjacentMismatch: false,
      evidenceItemInSnippet: false,
      reviewReason: "full_extraction_overclaim",
    };
  }

  if (claimsGenericExtractionOutstanding(draft.outputLine) && (!source.sourceSnippet || source.adjacentMismatch)) {
    source = {
      ...source,
      sourceSnippet: null,
      sourceStrength: "no_anchor",
      adjacentMismatch: false,
      evidenceItemInSnippet: false,
      reviewReason: "bundle_does_not_mention_phone_extraction",
    };
  } else if (
    claimsGenericExtractionOutstanding(draft.outputLine) &&
    !bundleMentionsPhoneOrExtraction(models.bundleText)
  ) {
    source = {
      ...source,
      sourceSnippet: null,
      sourceStrength: "no_anchor",
      adjacentMismatch: false,
      evidenceItemInSnippet: false,
      reviewReason: "bundle_does_not_mention_phone_extraction",
    };
  }

  if (claimsHandleIsDefendant(draft.outputLine)) {
    source = {
      ...source,
      sourceSnippet: null,
      sourceStrength: "no_anchor",
      reviewReason: "handle_attribution_overclaim",
      adjacentMismatch: true,
      evidenceItemInSnippet: false,
    };
  }

  if (claimsEncroProves(draft.outputLine)) {
    source = {
      ...source,
      reviewReason: "encro_overclaim",
      adjacentMismatch: true,
      evidenceItemInSnippet: false,
    };
  }

  if (claimsAbeFullyServed(draft.outputLine) && !bundleHasFullAbeRecording(models.bundleText)) {
    source = {
      ...source,
      sourceSnippet: null,
      sourceStrength: "no_anchor",
      reviewReason: "abe_overclaim",
      evidenceItemInSnippet: false,
    };
  }

  if (claimsStillsAsFullCctvProof(draft.outputLine) && !bundleHasMasterCctvServed(models.bundleText)) {
    source = {
      ...source,
      reviewReason: "cctv_stills_overclaim",
      adjacentMismatch: true,
      evidenceItemInSnippet: false,
    };
  }

  if (treatsOtherDefendantAsThisEvidence(draft.outputLine, draft.evidenceState ?? null)) {
    source = {
      ...source,
      reviewReason: "other_defendant_bleed",
      adjacentMismatch: true,
      evidenceItemInSnippet: false,
    };
  }

  if (isCoDefendantSafetyLine(draft.outputLine)) {
    draft = { ...draft, lineCategory: draft.lineCategory === "strategic_review" ? "safety_warning" : draft.lineCategory };
  }

  let supportStatus = inferSupportFromEvidenceState(
    draft.evidenceState ?? null,
    source,
    draft.outputLine,
    draft.lineCategory,
  );

  const bom = lintBadOutputMemory({
    text: draft.outputLine,
    surface:
      draft.lineCategory === "chase_request"
        ? "cps"
        : draft.lineCategory === "court_note"
          ? "court"
          : draft.lineCategory === "client_summary"
            ? "client"
            : "summary",
    offenceContext: {
      profile: models.truthKey.profile,
      offenceFamily: models.truthKey.offenceFamily,
      allegation: models.allegation,
    },
  });

  let blockedWording: string | null = null;
  if (OVERSTATE_RE.test(draft.outputLine)) blockedWording = draft.outputLine.match(OVERSTATE_RE)?.[0] ?? null;
  if (UNSAFE_RE.test(draft.outputLine)) blockedWording = draft.outputLine.match(UNSAFE_RE)?.[0] ?? null;
  if (bom.blocking.length > 0) blockedWording = bom.blocking[0]?.ruleId ?? "bad_output_memory";
  if (bom.blocking.length > 0) supportStatus = "blocked";

  let solicitorReviewRequired = computeSolicitorReviewRequired(draft, source, supportStatus, bom.blocking.length > 0);

  let whySupports = buildWhySupports(draft, source, supportStatus, draft.derivationNote);
  let whyLimited = buildWhyLimited(draft, source, supportStatus, solicitorReviewRequired);
  let safeWording = suggestSafeWording(draft, supportStatus);
  let usefulness = scoreUsefulness(draft, source, supportStatus, solicitorReviewRequired, blockedWording);
  let verdict = scoreVerdict(draft, source, supportStatus, blockedWording, solicitorReviewRequired, bom.blocking.length > 0);

  const gedReviewReasons = buildGedReviewReasons(draft, source, supportStatus, solicitorReviewRequired);

  const finalized = enforceConsistency({
    draft,
    source,
    supportStatus,
    solicitorReviewRequired,
    usefulness,
    verdict,
    whySupports,
    whyLimited,
    gedReviewReasons,
  });

  const tierInput = {
    outputLine: draft.outputLine,
    outputSurface: draft.outputSurface,
    lineCategory: draft.lineCategory,
    claimType: draft.claimType ?? null,
    evidenceItem: draft.evidenceItem ?? null,
    source,
    supportStatus: finalized.supportStatus,
    solicitorReviewRequired: finalized.solicitorReviewRequired,
    usefulnessVerdict: finalized.usefulness,
    verdict: finalized.verdict,
    gedReviewReasons: finalized.gedReviewReasons,
    derivationNote: draft.derivationNote,
  };

  let reviewTier = assignReviewTier(tierInput);
  const refined = refineAfterTier(tierInput, reviewTier);

  if (
    reviewTier !== "generic_safety_guard" &&
    isPositiveSourceBackedFinding({ ...tierInput, ...refined, reviewTier: "clean_source_backed" } as typeof tierInput & { reviewTier: ReviewTier })
  ) {
    reviewTier = "clean_source_backed";
    const cleanRefined = refineAfterTier(tierInput, reviewTier);
    Object.assign(refined, cleanRefined);
  }

  const humanEvidenceLabel = resolveHumanEvidenceLabel({
    evidenceItem: draft.evidenceItem ?? null,
    outputLine: draft.outputLine,
    sourceSnippet: source.sourceSnippet,
    bundleText: models.bundleText,
    lineCategory: draft.lineCategory,
  });
  const humanOutputLine = humaniseLedgerLine(draft.outputLine, models.bundleText, humanEvidenceLabel, draft.lineCategory);

  let usefulnessVerdict = refined.usefulnessVerdict;
  let finalVerdict = refined.verdict;
  if (shouldExcludeWrongFamilyTemplate(draft, source, models.bundleText)) {
    usefulnessVerdict = "excluded";
    finalVerdict = "PASS";
  }

  return {
    id: id(),
    outputSurface: draft.outputSurface,
    outputLine: draft.outputLine,
    humanEvidenceLabel,
    humanOutputLine,
    lineCategory: draft.lineCategory,
    evidenceItem: draft.evidenceItem ?? null,
    claimType: draft.claimType ?? null,
    evidenceState: draft.evidenceState ?? null,
    reliabilityState: draft.reliabilityState ?? null,
    sourceAnchor: source.sourceAnchor,
    sourcePage: source.sourcePage,
    sourceSection: source.sourceSection,
    sourceSnippet: source.sourceSnippet,
    sourceStrength: source.sourceStrength,
    supportStatus: finalized.supportStatus,
    whyThisSupportsTheLine: finalized.whySupports,
    whyThisIsLimited: finalized.whyLimited,
    safeWording,
    blockedWording,
    solicitorReviewRequired: refined.solicitorReviewRequired,
    usefulnessVerdict,
    verdict: finalVerdict,
    reviewTier,
    gedReviewReasons: refined.gedReviewReasons,
  };
}

function computeSolicitorReviewRequired(
  draft: DraftLine,
  source: ReturnType<typeof matchSourceForLine>,
  support: LineSupportStatus,
  bomBlocked: boolean,
): boolean {
  if (draft.lineCategory === "non_evidence_ui") return false;
  if (isGenericSafetyGuardLine({
    outputLine: draft.outputLine,
    lineCategory: draft.lineCategory,
    claimType: draft.claimType ?? null,
    outputSurface: draft.outputSurface,
  })) {
    return false;
  }

  if (bomBlocked || support === "blocked" || support === "unsupported") return true;

  if (isMeaningfulEvidenceCategory(draft.lineCategory)) {
    if (!source.sourceSnippet || source.sourceStrength === "no_anchor") return true;
    if (support === "source_unavailable") return true;
    if (source.genericSourceOnly && requiresLineLevelProof(draft.lineCategory)) return true;
    if (source.adjacentMismatch) return true;
    if (!source.evidenceItemInSnippet && requiresLineLevelProof(draft.lineCategory)) return true;
  }

  if (draft.solicitorReviewRequired === true) return true;
  if (/solicitor review|solicitor to confirm/i.test(draft.outputLine)) return true;
  return false;
}

function buildWhySupports(
  draft: DraftLine,
  source: ReturnType<typeof matchSourceForLine>,
  support: LineSupportStatus,
  derivationNote?: string | null,
): string {
  if (draft.lineCategory === "safety_warning") {
    return "Safety warning surface — explains caution rather than alleging a proved fact.";
  }
  if (isDerivedWorkflowStatus(draft) && derivationNote) {
    return derivationNote;
  }
  if (!source.sourceSnippet) {
    if (source.reviewReason === "bundle_does_not_mention_cctv") {
      return "Jordan bundle does not mention CCTV — cannot source-support a CCTV output line from BWV/custody text.";
    }
    if (source.reviewReason === "bundle_does_not_mention_cad") {
      return "Bundle does not mention CAD/999 — cannot source-support a CAD/999 output line from unrelated material.";
    }
    if (source.reviewReason === "cctv_stills_overclaim") {
      return "Bundle has CCTV stills only — output must not treat stills as master identification proof.";
    }
    if (source.reviewReason === "abe_overclaim") {
      return "Bundle has ABE fragment/referred material only — full ABE recording must not be treated as served.";
    }
    if (source.reviewReason === "handle_attribution_overclaim") {
      return "Handle mapping certificate not served — handle cannot be stated as defendant on current papers.";
    }
    if (source.reviewReason === "encro_overclaim") {
      return "Encro extracts do not safely prove supply without served mapping/extraction context.";
    }
    if (source.reviewReason === "full_extraction_overclaim") {
      return "Bundle only has phone extraction summary / outstanding download — output overclaims full served extraction.";
    }
    if (source.reviewReason === "other_defendant_bleed") {
      return "Output appears to treat another defendant's material as this defendant's evidence.";
    }
    return "No direct bundle snippet located for this line.";
  }
  if (source.adjacentMismatch) {
    return "Rejected adjacent source — snippet does not mention the evidence item for this line.";
  }
  if (support === "referred_only") {
    return `Bundle mentions the material but does not serve it: "${source.sourceSnippet.slice(0, 140)}".`;
  }
  if (support === "missing") {
    return `Bundle shows material outstanding or not attached: "${source.sourceSnippet.slice(0, 140)}".`;
  }
  if (support === "incomplete") {
    return `Bundle shows partial/extract only: "${source.sourceSnippet.slice(0, 140)}".`;
  }
  if (support === "supported") {
    return `Source text supports the line: "${source.sourceSnippet.slice(0, 140)}".`;
  }
  if (source.genericSourceOnly) {
    return `Only generic schedule/index wording found — needs line-level snippet review: "${source.sourceSnippet.slice(0, 140)}".`;
  }
  return `Partial bundle support: "${source.sourceSnippet.slice(0, 140)}".`;
}

function buildWhyLimited(
  draft: DraftLine,
  source: ReturnType<typeof matchSourceForLine>,
  support: LineSupportStatus,
  reviewRequired: boolean,
): string {
  if (source.reviewReason === "bundle_does_not_mention_cctv") {
    return "Bundle has no CCTV reference — output line should not borrow BWV/custody narrative.";
  }
  if (source.reviewReason === "bundle_does_not_mention_cad") {
    return "Bundle has no CAD/999 reference — output should not assume served timing material.";
  }
  if (source.reviewReason === "bundle_does_not_mention_phone_extraction") {
    return "Bundle has no phone/extraction material — generic extraction chase line is misplaced on this file.";
  }
  if (source.reviewReason === "full_extraction_overclaim") {
    return "Only summary/partial phone material on bundle — full download must not be treated as served.";
  }
  if (source.reviewReason === "other_defendant_bleed") {
    return "Co-defendant / other-account material must stay segregated from this defendant's proof.";
  }
  if (source.reviewReason === "handle_attribution_overclaim") {
    return "Handle mapping certificate not served — handle cannot be stated as defendant.";
  }
  if (source.reviewReason === "encro_overclaim") {
    return "Encro message extracts alone do not safely prove supply without mapping/extraction.";
  }
  if (source.reviewReason === "abe_overclaim") {
    return "ABE recording not served — fragment/referred material only on bundle.";
  }
  if (source.reviewReason === "cctv_stills_overclaim") {
    return "CCTV stills served — master footage/timeline must not be treated as identification proof.";
  }
  if (source.adjacentMismatch) return "Source snippet is for a different evidence topic.";
  if (source.genericSourceOnly && requiresLineLevelProof(draft.lineCategory)) {
    return "Generic MG6/schedule label without line-level served/referred snippet.";
  }
  if (support === "referred_only") return "Referred on schedule or in narrative — not safely served as proof.";
  if (support === "missing") return "Material expected or mentioned but not on bundle.";
  if (support === "incomplete") return "Only extract/partial material present.";
  if (support === "unsupported") return "Output exceeds what bundle source supports.";
  if (source.sourceStrength === "schedule_only") return "MG6/schedule reference only — export not served.";
  if (source.sourceStrength === "index_only") return "Index lists item — document not safely confirmed on bundle.";
  if (support === "source_unavailable") return "No usable source anchor — solicitor must verify.";
  if (reviewRequired) return "Provisional or solicitor-review sendability.";
  if (draft.lineCategory === "strategic_review") return "Strategic review line — not a source-backed fact.";
  return "none";
}

function suggestSafeWording(draft: DraftLine, support: LineSupportStatus): string | null {
  if (draft.lineCategory !== "evidence_state" && draft.lineCategory !== "evidence_claim") return null;
  if (support === "unsupported" || support === "source_unavailable") {
    return "Not safely confirmed on current papers — solicitor review required.";
  }
  if (support === "referred_only") return "Referred to in the papers but not safely served.";
  if (support === "missing") return "Outstanding on current bundle — chase if disclosure-relevant.";
  if (support === "incomplete") return "Partial material only — full record not safely confirmed.";
  return null;
}

function shouldExcludeWrongFamilyTemplate(
  draft: DraftLine,
  source: ReturnType<typeof matchSourceForLine>,
  bundleText: string,
): boolean {
  if (source.reviewReason !== "bundle_does_not_mention_cctv" && source.reviewReason !== "bundle_does_not_mention_cad") {
    // fall through — other exclusion rules below
  } else if (draft.lineCategory === "strategic_review" || /decision_board/i.test(draft.outputSurface)) {
    return true;
  } else if (/^Missing BWV \/ CCTV issue:/i.test(draft.outputLine)) {
    return true;
  }

  if (
    /\bcad\b|\b999\b|control-room material/i.test(draft.outputLine) &&
    !source.sourceSnippet &&
    (source.reviewReason === "adjacent_source_mismatch" ||
      source.reviewReason === "bundle_does_not_mention_cad" ||
      source.reviewReason === "no_line_level_snippet")
  ) {
    return true;
  }

  if (source.reviewReason === "bundle_does_not_mention_cctv" || source.reviewReason === "bundle_does_not_mention_cad") {
    if (draft.lineCategory === "strategic_review" || /decision_board/i.test(draft.outputSurface)) return true;
    if (/^Missing BWV \/ CCTV issue:/i.test(draft.outputLine)) return true;
  }

  return false;
}

function scoreUsefulness(
  draft: DraftLine,
  source: ReturnType<typeof matchSourceForLine>,
  support: LineSupportStatus,
  reviewRequired: boolean,
  blocked: string | null,
): LineUsefulnessVerdict {
  if (draft.lineCategory === "non_evidence_ui") return "excluded";
  if (blocked || support === "blocked") return "blocked";
  if (support === "unsupported") return "wrong_or_overstated";
  if (isGenericSafetyGuardLine({
    outputLine: draft.outputLine,
    lineCategory: draft.lineCategory,
    claimType: draft.claimType ?? null,
    outputSurface: draft.outputSurface,
  })) {
    return "correct_and_useful";
  }

  const positiveInput = {
    outputLine: draft.outputLine,
    outputSurface: draft.outputSurface,
    lineCategory: draft.lineCategory,
    claimType: draft.claimType ?? null,
    evidenceItem: draft.evidenceItem ?? null,
    source,
    supportStatus: support,
    solicitorReviewRequired: reviewRequired,
    usefulnessVerdict: "correct_and_useful" as const,
    verdict: "PASS" as const,
    gedReviewReasons: [],
  };
  if (isPositiveSourceBackedFinding(positiveInput)) return "correct_and_useful";

  if (!source.sourceSnippet || source.sourceStrength === "no_anchor") {
    if (isMeaningfulEvidenceCategory(draft.lineCategory)) return "solicitor_review_required";
  }

  if (reviewRequired && (support === "source_unavailable" || source.genericSourceOnly)) {
    return "solicitor_review_required";
  }

  if (
    draft.lineCategory === "chase_request" &&
    /please provide/i.test(draft.outputLine) &&
    source.sourceSnippet &&
    !source.genericSourceOnly &&
    source.evidenceItemInSnippet
  ) {
    return "correct_and_useful";
  }

  if (draft.outputLine.length < 35) return "correct_but_too_vague";

  if (
    support === "supported" &&
    source.sourceSnippet &&
    source.evidenceItemInSnippet &&
    !reviewRequired
  ) {
    return "correct_and_useful";
  }

  if (
    (support === "partially_supported" || support === "referred_only" || support === "missing" || support === "incomplete") &&
    isMeaningfulEvidenceCategory(draft.lineCategory) &&
    source.sourceSnippet &&
    source.evidenceItemInSnippet
  ) {
    return "safe_but_not_actionable";
  }

  if (draft.lineCategory === "strategic_review" || draft.lineCategory === "contradiction_or_risk") {
    return "safe_but_not_actionable";
  }

  return "solicitor_review_required";
}

function scoreVerdict(
  draft: DraftLine,
  source: ReturnType<typeof matchSourceForLine>,
  support: LineSupportStatus,
  blocked: string | null,
  reviewRequired: boolean,
  bomBlocked: boolean,
): LineVerdict {
  if (draft.lineCategory === "non_evidence_ui") return "PASS";
  if (isGenericSafetyGuardLine({
    outputLine: draft.outputLine,
    lineCategory: draft.lineCategory,
    claimType: draft.claimType ?? null,
    outputSurface: draft.outputSurface,
  })) {
    return "PASS";
  }

  const positiveInput = {
    outputLine: draft.outputLine,
    outputSurface: draft.outputSurface,
    lineCategory: draft.lineCategory,
    claimType: draft.claimType ?? null,
    evidenceItem: draft.evidenceItem ?? null,
    source,
    supportStatus: support,
    solicitorReviewRequired: reviewRequired,
    usefulnessVerdict: "correct_and_useful" as const,
    verdict: "PASS" as const,
    gedReviewReasons: [],
  };
  if (isPositiveSourceBackedFinding(positiveInput)) return "PASS";

  if (blocked || bomBlocked || support === "blocked") return "FAIL";
  if (support === "unsupported") return "FAIL";
  if (source.reviewReason === "bundle_does_not_mention_cctv") {
    if (isMisplacedFamilyChaseLine(draft.outputLine, draft.lineCategory)) return "WARNING";
    return "FAIL";
  }
  if (source.reviewReason === "bundle_does_not_mention_cad") {
    if (isMisplacedFamilyChaseLine(draft.outputLine, draft.lineCategory)) return "WARNING";
    return "FAIL";
  }
  if (source.reviewReason === "bundle_does_not_mention_phone_extraction") return "WARNING";
  if (source.reviewReason === "full_extraction_overclaim") return "FAIL";
  if (source.reviewReason === "handle_attribution_overclaim") return "FAIL";
  if (source.reviewReason === "encro_overclaim") return "FAIL";
  if (source.reviewReason === "abe_overclaim") return "FAIL";
  if (source.reviewReason === "cctv_stills_overclaim") return "FAIL";
  if (source.reviewReason === "other_defendant_bleed") return "FAIL";
  if (
    draft.lineCategory === "chase_request" &&
    /the defence asks the court/i.test(draft.outputLine)
  ) {
    return "FAIL";
  }
  if (OVERSTATE_RE.test(draft.outputLine)) return "FAIL";

  if (draft.lineCategory === "strategic_review" || draft.lineCategory === "contradiction_or_risk") {
    if (source.adjacentMismatch || support === "source_unavailable") return "WARNING";
    return "WARNING";
  }

  if (isMeaningfulEvidenceCategory(draft.lineCategory)) {
    if (!source.sourceSnippet || source.sourceStrength === "no_anchor") return "WARNING";
    if (support === "source_unavailable") return "WARNING";
    if (source.genericSourceOnly && requiresLineLevelProof(draft.lineCategory)) return "WARNING";
    if (source.adjacentMismatch) return "FAIL";
    if (!source.evidenceItemInSnippet && requiresLineLevelProof(draft.lineCategory)) return "WARNING";
  }

  if (reviewRequired && support === "source_unavailable") return "WARNING";
  if (source.genericSourceOnly && requiresLineLevelProof(draft.lineCategory)) return "WARNING";
  if (source.adjacentMismatch) return "FAIL";

  if (isDerivedWorkflowStatus(draft)) return "WARNING";

  return "PASS";
}

function enforceConsistency(input: {
  draft: DraftLine;
  source: ReturnType<typeof matchSourceForLine>;
  supportStatus: LineSupportStatus;
  solicitorReviewRequired: boolean;
  usefulness: LineUsefulnessVerdict;
  verdict: LineVerdict;
  whySupports: string;
  whyLimited: string;
  gedReviewReasons: string[];
}): {
  supportStatus: LineSupportStatus;
  solicitorReviewRequired: boolean;
  usefulness: LineUsefulnessVerdict;
  verdict: LineVerdict;
  whySupports: string;
  whyLimited: string;
  gedReviewReasons: string[];
} {
  let {
    supportStatus,
    solicitorReviewRequired,
    usefulness,
    verdict,
    whySupports,
    whyLimited,
    gedReviewReasons,
  } = input;

  const meaningful = isMeaningfulEvidenceCategory(input.draft.lineCategory);
  const noSource =
    !input.source.sourceSnippet ||
    input.source.sourceStrength === "no_anchor" ||
    supportStatus === "source_unavailable";

  if (meaningful && noSource) {
    solicitorReviewRequired = true;
    if (verdict === "PASS") verdict = "WARNING";
    if (usefulness === "correct_and_useful") usefulness = "solicitor_review_required";
    if (!gedReviewReasons.includes("meaningful_line_without_anchor")) {
      gedReviewReasons.push("meaningful_line_without_anchor");
    }
  }

  if (supportStatus === "source_unavailable" && !solicitorReviewRequired && meaningful) {
    solicitorReviewRequired = true;
    verdict = verdict === "PASS" ? "WARNING" : verdict;
  }

  if (input.source.sourceStrength === "no_anchor" && usefulness === "correct_and_useful") {
    usefulness = "solicitor_review_required";
    verdict = verdict === "PASS" ? "WARNING" : verdict;
    solicitorReviewRequired = true;
  }

  if (solicitorReviewRequired && verdict === "PASS" && !isGenericSafetyGuardLine({
    outputLine: input.draft.outputLine,
    lineCategory: input.draft.lineCategory,
    claimType: input.draft.claimType ?? null,
    outputSurface: input.draft.outputSurface,
  })) {
    verdict = "WARNING";
  }

  if (input.source.sourceStrength === "schedule_only" && requiresLineLevelProof(input.draft.lineCategory)) {
    if (!isPositiveSourceBackedFinding({
      outputLine: input.draft.outputLine,
      outputSurface: input.draft.outputSurface,
      lineCategory: input.draft.lineCategory,
      claimType: input.draft.claimType ?? null,
      evidenceItem: input.draft.evidenceItem ?? null,
      source: input.source,
      supportStatus,
      solicitorReviewRequired,
      usefulness,
      verdict,
      gedReviewReasons,
    })) {
      solicitorReviewRequired = true;
      if (verdict === "PASS") verdict = "WARNING";
    }
  }

  if (usefulness === "solicitor_review_required" && verdict === "PASS") {
    verdict = "WARNING";
    solicitorReviewRequired = true;
  }

  if (
    input.source.genericSourceOnly &&
    requiresLineLevelProof(input.draft.lineCategory) &&
    verdict === "PASS"
  ) {
    verdict = "WARNING";
    solicitorReviewRequired = true;
  }

  return {
    supportStatus,
    solicitorReviewRequired,
    usefulness,
    verdict,
    whySupports,
    whyLimited,
    gedReviewReasons: [...new Set(gedReviewReasons)],
  };
}

export function auditAllLines(models: H5CaseModels): LineSourceProofRecord[] {
  return collectMeaningfulLines(models).map((d) => auditLine(d, models));
}
