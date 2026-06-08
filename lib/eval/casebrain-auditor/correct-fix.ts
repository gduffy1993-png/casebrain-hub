import { routeTitleForFamily } from "./family-principles";
import type {
  AuditorFamilyProfile,
  AuditorPackId,
  CaseAuditResult,
  FixType,
  GroupedFailure,
} from "./types";

export type { FixType };

export type CorrectFixFields = {
  badOutputSnippet: string;
  whyItIsWrong: string;
  correctFixPrinciple: string;
  suggestedBetterOutput: string;
  fixType: FixType;
  confidence: "high" | "medium" | "low";
  needsHumanReview: boolean;
};

export type CorrectFixContext = {
  pack: AuditorPackId;
  cases: CaseAuditResult[];
};

const ROBBERY_SAFE_RISK =
  "Outstanding identification and CCTV continuity material may affect the Crown's ability to prove participation and attribution if served and consistent.";

const FRAUD_SAFE_RISK =
  "Outstanding bank/device/source material may support the Crown if served and consistent — position remains provisional pending disclosure.";

const PWITS_SAFE_RISK =
  "Phone extraction, search continuity and attribution material may bear on possession/knowledge if served — position remains provisional.";

const VIOLENCE_SAFE_RISK =
  "Complainant account, injury/medical and BWV/999/CAD material may bear on participation and causation if served — position remains provisional.";

function primaryFamilyFromGroup(group: GroupedFailure, cases: CaseAuditResult[]): AuditorFamilyProfile | undefined {
  for (const ex of group.examples) {
    const c = cases.find((x) => x.caseTitle === ex.caseTitle);
    if (c?.auditorFamily) return c.auditorFamily;
  }
  for (const label of group.affectedCases) {
    const id = label.match(/\(([^)]+)\)$/)?.[1];
    const c = cases.find((x) => x.caseId === id);
    if (c?.auditorFamily) return c.auditorFamily;
  }
  return undefined;
}

function hasConfirmedManifest(cases: CaseAuditResult[], group: GroupedFailure): boolean {
  for (const ex of group.examples) {
    const c = cases.find((x) => x.caseTitle === ex.caseTitle);
    if (c?.manifestCertainty === "confirmed") return true;
  }
  return cases.some((c) => c.manifestCertainty === "confirmed" && group.affectedCases.some((a) => a.includes(c.caseId)));
}

function snippetFromGroup(group: GroupedFailure): string {
  const raw = group.examples[0]?.badText?.trim() || group.expectedBehaviour.slice(0, 120);
  return raw.slice(0, 300);
}

function templateForFingerprint(
  fingerprint: string,
  group: GroupedFailure,
  ctx: CorrectFixContext,
): CorrectFixFields {
  const bad = snippetFromGroup(group);
  const family = primaryFamilyFromGroup(group, ctx.cases);
  const confirmed = hasConfirmedManifest(ctx.cases, group);
  const uncertain = fingerprint.startsWith("manifest.");

  if (uncertain) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Truth manifest or family assignment is not confirmed — strict grading would invent facts.",
      correctFixPrinciple: "Confirm case family and manifest fields before suggesting exact user-facing copy.",
      suggestedBetterOutput: "Review manifest-review-queue.json and promote to confirmed only after bundle/metadata review.",
      fixType: "uncertain_needs_review",
      confidence: "low",
      needsHumanReview: true,
    };
  }

  if (fingerprint === "profile_leakage.robbery_bank_device" || fingerprint === "profile_leakage.robbery_pwits") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong:
        "Robbery/identification must not surface fraud/account-control or PWITS/drug language unless source-backed.",
      correctFixPrinciple:
        "Focus on CCTV continuity, ID procedure, complainant account, clothing/description, unknown male/co-defendant attribution, and conditional 999/CAD timing.",
      suggestedBetterOutput: ROBBERY_SAFE_RISK,
      fixType: "profile_rule_fix",
      confidence: confirmed ? "high" : "medium",
      needsHumanReview: !confirmed,
    };
  }

  if (fingerprint === "profile_leakage.robbery_phone") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Phone evidence must not be the main pressure point in robbery_identification unless source supports it.",
      correctFixPrinciple: "Use witness/ID/association and CCTV/complainant/second-male wording instead of phone attribution.",
      suggestedBetterOutput: ROBBERY_SAFE_RISK,
      fixType: "profile_rule_fix",
      confidence: confirmed ? "high" : "medium",
      needsHumanReview: !confirmed,
    };
  }

  if (fingerprint.startsWith("profile_leakage.fraud_")) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Fraud/account-control profile must not show robbery, PWITS, or CCTV-as-main-route leakage.",
      correctFixPrinciple:
        "Keep bank/export, device/login, mailbox, ownership, accountant/bookkeeper, POCA/source-of-funds and provisional disclosure pressure.",
      suggestedBetterOutput: FRAUD_SAFE_RISK,
      fixType: "profile_rule_fix",
      confidence: confirmed && family === "fraud_account_control" ? "high" : "medium",
      needsHumanReview: !confirmed,
    };
  }

  if (fingerprint.startsWith("profile_leakage.pwits_")) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "PWITS profile must not show robbery ID, fraud bank routes, or unsource-backed DNA/fingerprint/MG11 certainty.",
      correctFixPrinciple:
        "Focus on phone extraction, attribution, search BWV, drug/cash continuity, and co-occupier/shared premises — all conditional on served material.",
      suggestedBetterOutput: PWITS_SAFE_RISK,
      fixType: "profile_rule_fix",
      confidence: confirmed && family === "pwits_phone_attribution" ? "high" : "medium",
      needsHumanReview: !confirmed,
    };
  }

  if (fingerprint.startsWith("profile_leakage.violence_")) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Violence profile must not leak fraud, PWITS, or robbery-ID route language.",
      correctFixPrinciple:
        "Focus on complainant account, injury/medical, BWV/999/CAD where source-backed, self-defence/causation, and safeguarding where relevant.",
      suggestedBetterOutput: VIOLENCE_SAFE_RISK,
      fixType: "profile_rule_fix",
      confidence: "medium",
      needsHumanReview: true,
    };
  }

  if (fingerprint === "source.unsupported_interview_admission") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "No source-backed interview admission supports narrowing the defence route in pilot copy.",
      correctFixPrinciple: "Do not state admissions unless served interview material expressly supports them.",
      suggestedBetterOutput:
        "The interview position should be treated as provisional unless the served interview record confirms any admission.",
      fixType: confirmed ? "source_grounded_fix" : "uncertain_needs_review",
      confidence: confirmed ? "medium" : "low",
      needsHumanReview: true,
    };
  }

  if (fingerprint === "source.overstated_cad999" || fingerprint === "source.overstated_cctv") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "CAD/999/CCTV timing must not be stated as Crown fact when material is missing or partial.",
      correctFixPrinciple: "Use conditional wording: may affect sequence / if served and reconciled.",
      suggestedBetterOutput:
        "CAD/999 timing may affect sequence if served and reconciled. CCTV may support Crown account if served and consistent.",
      fixType: "source_grounded_fix",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  if (fingerprint === "wording.against_extract") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Malformed '/ against extract' internal fragment leaked into user-facing copy.",
      correctFixPrinciple: "Remove the fragment; keep conditional bank/device or route sentence clean.",
      suggestedBetterOutput: "Remove 'against extract' and preserve the surrounding conditional sentence only.",
      fixType: "wording_cleanup",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  if (fingerprint === "wording.duplicate_conditional" || fingerprint === "wording.double_full_stop") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Duplicate conditional phrasing or double punctuation reduces solicitor trust in demo copy.",
      correctFixPrinciple: "Single 'conditional on served material' phrasing; normalise punctuation.",
      suggestedBetterOutput: "conditional on served material",
      fixType: "wording_cleanup",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  if (fingerprint === "strategy.wrong_primary_route" && family) {
    const route = routeTitleForFamily(family);
    return {
      badOutputSnippet: bad,
      whyItIsWrong: `Primary route should match ${family} family pressure, not another profile's concepts.`,
      correctFixPrinciple: `Use profile route: ${route}.`,
      suggestedBetterOutput: route,
      fixType: confirmed ? "exact_truth_fix" : "profile_rule_fix",
      confidence: confirmed ? "high" : "medium",
      needsHumanReview: !confirmed,
    };
  }

  if (fingerprint.startsWith("ui.upload_visible") || fingerprint.startsWith("ui.record_position") || fingerprint.startsWith("ui.mark_chased")) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Non-admin pilot must not see admin upload/record/chase actions.",
      correctFixPrinciple: "Hide actions via pilot-mode flags (isPilotDemoUploadDisabled / chase disabled / read-only HWR).",
      suggestedBetterOutput: "No Upload / Record position / Mark chased controls visible for pilot-non-admin.",
      fixType: "ui_permission_fix",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  if (fingerprint.startsWith("ui.documents")) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Documents tab must use real ?tab=documents view with View/Open — not hash scroll-only.",
      correctFixPrinciple: "PilotCaseDocumentsPanel + CaseFilesList View; buildCaseWorkflowTabHref.",
      suggestedBetterOutput: "Documents tab with visible file row and View/Open button.",
      fixType: "documents_navigation_fix",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  if (fingerprint.startsWith("court_today.")) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Court Today pilot diary must show demo anchor date and three demo matters with expected missing-evidence counts.",
      correctFixPrinciple: "PILOT_COURT_TODAY_ANCHOR + allowlist matters + pilotCourtChaseLabels.",
      suggestedBetterOutput: "Monday, 1 June 2026 — 3 demo matters — 24 missing-evidence items.",
      fixType: "court_today_date_fix",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  if (fingerprint === "wording.thin_bundle_overconfident") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Thin bundle must not use proof/certainty language — routes are provisional only.",
      correctFixPrinciple: "Use conditional phrasing; surface thin_bundle status in HWR/strategy copy.",
      suggestedBetterOutput: "Provisional routes only — position remains conditional on served material.",
      fixType: "wording_cleanup",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  if (fingerprint === "collector.case_timeout") {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Read-only collect exceeded timeout — case skipped to protect batch.",
      correctFixPrinciple: "Investigate bundle size; tune batchCaseTimeoutMs; rerun case in isolation.",
      suggestedBetterOutput: "Case collect completes within timeout with partial surfaces.",
      fixType: "uncertain_needs_review",
      confidence: "low",
      needsHumanReview: true,
    };
  }

  if (fingerprint.startsWith("anchor.")) {
    return {
      badOutputSnippet: bad,
      whyItIsWrong: "Malformed or cut-off evidence anchors must not appear in solicitor-visible lists.",
      correctFixPrinciple: "sanitizePilotEvidenceAnchors / isMalformedPilotEvidenceAnchor filters.",
      suggestedBetterOutput: "Short source-linked chase label (e.g. 'CCTV continuity / export log — outstanding').",
      fixType: "wording_cleanup",
      confidence: "high",
      needsHumanReview: false,
    };
  }

  return {
    badOutputSnippet: bad,
    whyItIsWrong: group.expectedBehaviour || "Visible output does not meet manifest or source-grounding rules.",
    correctFixPrinciple: group.suggestedCursorFix || group.likelySharedCause,
    suggestedBetterOutput: confirmed
      ? "Apply shared filter/rule from fix prompt — do not patch single case."
      : "Confirm manifest and source before exact replacement.",
    fixType: confirmed ? "profile_rule_fix" : "uncertain_needs_review",
    confidence: confirmed ? "medium" : "low",
    needsHumanReview: !confirmed || group.severity === "CRITICAL",
  };
}

export function attachCorrectFixToGroup(group: GroupedFailure, ctx: CorrectFixContext): GroupedFailure {
  const fix = templateForFingerprint(group.fingerprint, group, ctx);
  return { ...group, ...fix };
}

export function attachCorrectFixToGroups(groups: GroupedFailure[], ctx: CorrectFixContext): GroupedFailure[] {
  return groups.map((g) => attachCorrectFixToGroup(g, ctx));
}
