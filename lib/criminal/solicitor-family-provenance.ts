/**
 * Case-family / evidence compatibility for solicitor-visible surfaces.
 * Incompatible evidence is quarantined (non-copyable source context), never left
 * copyable on overview/truth_map/chase/copy/export/API exits.
 */

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

export type MatterFamilyKind =
  | "driver_information"
  | "drink_driving"
  | "drugs"
  | "violence_or_sexual"
  | "other";

export type FamilyCompatibilityIssue =
  | "intoxilyser_on_non_drink_drive"
  | "breath_device_on_non_drink_drive"
  | "calibration_on_non_drink_drive"
  | "drink_drive_evidence_on_non_drink_drive"
  | "cctv_chase_on_driver_information"
  | "medical_chase_on_driver_information"
  | "pwits_on_non_drugs"
  | "abe_on_non_sexual_or_violence"
  | "empty_generic_client_summary"
  | "matter_family_evidence_contradiction";

/** Complete versioned registry of family-compatibility issue codes (machine/audit only). */
export const FAMILY_COMPATIBILITY_ISSUE_CODE_REGISTRY = [
  "intoxilyser_on_non_drink_drive",
  "breath_device_on_non_drink_drive",
  "calibration_on_non_drink_drive",
  "drink_drive_evidence_on_non_drink_drive",
  "cctv_chase_on_driver_information",
  "medical_chase_on_driver_information",
  "pwits_on_non_drugs",
  "abe_on_non_sexual_or_violence",
  "empty_generic_client_summary",
  "matter_family_evidence_contradiction",
] as const satisfies readonly FamilyCompatibilityIssue[];

export type RegisteredFamilyCompatibilityIssueCode =
  (typeof FAMILY_COMPATIBILITY_ISSUE_CODE_REGISTRY)[number];

export type EvidenceFamilySignal =
  | "drink_device"
  | "calibration"
  | "cctv"
  | "medical_expert"
  | "generic";

const INTOX_RE =
  /\b(intoxilyser|breath[-\s/]?device|breathalyzer|breathalyser|specimen\s+of\s+breath|breath\s*\/\s*device)\b/i;
const CALIBRATION_RE = /\b(calibration\s+certificate|device\s+calibration|calibrat(?:e|ion|ed))\b/i;
const DRINK_DEVICE_EVIDENCE_RE =
  /\b(intoxilyser|breath[-\s/]?device|breathalyzer|breathalyser|specimen\s+of\s+breath|breath\s*\/\s*device|device\s+procedure|procedure\s+summary)\b/i;
const S172_RE =
  /\b(section\s*172|s\.?\s*172|driver(?:'s)?\s+details|fail(?:ure|ing)?\s+to\s+provide\s+(?:driver|owner)\s+details|RTA\s*s\.?\s*172)\b/i;
const DRINK_DRIVE_RE =
  /\b(drink[-\s]?driv|excess\s+alcohol|driving\s+with\s+excess|driving\s+under\s+the\s+influence|road\s+traffic.*?alcohol|fail(?:ure|ing)?\s+to\s+provide\s+(?:a\s+)?specimen|breath[-\s]?specimen|motoring-breath|intoxilyser)\b/i;
const PWITS_RE =
  /\b(PWITS|possession\s+with\s+intent\s+to\s+supply|concerned\s+in\s+(?:the\s+)?supply)\b/i;
const DRUGS_RE = /\b(controlled\s+drug|misuse\s+of\s+drugs|cocaine|heroin|cannabis|class\s+[ABC])\b/i;
const ABE_RE = /\bABE\b/;
const SEXUAL_OR_VIOLENCE_RE = /\b(sexual|rape|ABE|assault|ABH|GBH|s\.?\s*18|s\.?\s*20|violence)\b/i;
const CCTV_RE = /\b(CCTV|dashcam|dash\s*cam|camera\s+footage)\b/i;
const MEDICAL_RE = /\b(medical|expert\s+(?:report|source)|injury\s+report|hospital\s+notes)\b/i;

export function classifyMatterFamily(input: {
  allegation?: string | null;
  auditFamily?: string | null;
}): MatterFamilyKind {
  const hay = `${input.allegation ?? ""} ${input.auditFamily ?? ""}`;
  if (DRINK_DRIVE_RE.test(hay)) return "drink_driving";
  if (S172_RE.test(hay) || /\bdriver_information\b/i.test(hay)) return "driver_information";
  if (DRUGS_RE.test(hay) || PWITS_RE.test(hay)) return "drugs";
  if (SEXUAL_OR_VIOLENCE_RE.test(hay)) return "violence_or_sexual";
  return "other";
}

export function evidenceFamilySignals(labelOrProse: string): EvidenceFamilySignal[] {
  const t = labelOrProse ?? "";
  const out: EvidenceFamilySignal[] = [];
  if (DRINK_DEVICE_EVIDENCE_RE.test(t) || INTOX_RE.test(t)) out.push("drink_device");
  if (CALIBRATION_RE.test(t)) out.push("calibration");
  if (CCTV_RE.test(t)) out.push("cctv");
  if (MEDICAL_RE.test(t)) out.push("medical_expert");
  return out.length ? out : ["generic"];
}

/** Drink-drive / device wording that must never be copyable on non-drink-driving matters. */
export function containsDrinkDriveDeviceWording(text: string | null | undefined): boolean {
  const t = text ?? "";
  return INTOX_RE.test(t) || CALIBRATION_RE.test(t) || DRINK_DEVICE_EVIDENCE_RE.test(t);
}

export function assessFamilyEvidenceCompatibility(input: {
  allegation?: string | null;
  auditFamily?: string | null;
  prose: string;
}): { ok: boolean; issues: FamilyCompatibilityIssue[]; matterFamily: MatterFamilyKind } {
  const matterFamily = classifyMatterFamily(input);
  const prose = input.prose ?? "";
  const issues: FamilyCompatibilityIssue[] = [];

  if (matterFamily !== "drink_driving" && containsDrinkDriveDeviceWording(prose)) {
    if (INTOX_RE.test(prose)) issues.push("intoxilyser_on_non_drink_drive");
    if (CALIBRATION_RE.test(prose) || /breath/i.test(prose)) issues.push("breath_device_on_non_drink_drive");
    if (CALIBRATION_RE.test(prose)) issues.push("calibration_on_non_drink_drive");
    issues.push("drink_drive_evidence_on_non_drink_drive");
  }

  if (matterFamily === "driver_information") {
    if (CCTV_RE.test(prose)) issues.push("cctv_chase_on_driver_information");
    if (MEDICAL_RE.test(prose)) issues.push("medical_chase_on_driver_information");
  }

  if (PWITS_RE.test(prose) && matterFamily !== "drugs") {
    issues.push("pwits_on_non_drugs");
  }
  if (ABE_RE.test(prose) && matterFamily !== "violence_or_sexual") {
    issues.push("abe_on_non_sexual_or_violence");
  }

  if (
    /we are reviewing the papers/i.test(prose) &&
    prose.replace(/\s+/g, " ").trim().length < 220 &&
    !/outstanding|still|missing|referred|chase|disclosure/i.test(prose)
  ) {
    issues.push("empty_generic_client_summary");
  }

  return { ok: issues.length === 0, issues: [...new Set(issues)], matterFamily };
}

export type MatterFamilyContradiction = {
  allegationFamily: MatterFamilyKind;
  evidenceFamily: string;
  status: "review_required";
  summary: string;
  quarantinedLabels: string[];
};

export type EvidenceFamilyPartition = {
  matterFamily: MatterFamilyKind;
  compatible: FiveAnswersEvidenceRow[];
  quarantined: FiveAnswersEvidenceRow[];
  contradiction: MatterFamilyContradiction | null;
};

/**
 * Partition evidence rows: incompatible rows are quarantined for non-copyable
 * source context only — they must not drive copyable truth_map / overview counts.
 */
export function partitionEvidenceForSolicitorDisplay(input: {
  allegation?: string | null;
  auditFamily?: string | null;
  evidenceRows: FiveAnswersEvidenceRow[];
}): EvidenceFamilyPartition {
  const matterFamily = classifyMatterFamily(input);
  const compatible: FiveAnswersEvidenceRow[] = [];
  const quarantined: FiveAnswersEvidenceRow[] = [];

  for (const row of input.evidenceRows ?? []) {
    const signals = evidenceFamilySignals(row.label);
    const drinkSignal = signals.includes("drink_device") || signals.includes("calibration");
    const driverInfoIncompatible =
      matterFamily === "driver_information" &&
      (drinkSignal || signals.includes("cctv") || signals.includes("medical_expert"));

    if (matterFamily !== "drink_driving" && drinkSignal) {
      quarantined.push(row);
      continue;
    }
    if (driverInfoIncompatible) {
      quarantined.push(row);
      continue;
    }
    compatible.push(row);
  }

  let contradiction: MatterFamilyContradiction | null = null;
  if (quarantined.length && matterFamily === "driver_information") {
    const evidenceFamily = quarantined.some((r) =>
      evidenceFamilySignals(r.label).some((s) => s === "drink_device" || s === "calibration"),
    )
      ? "drink-driving/device"
      : "incompatible_evidence";
    contradiction = {
      allegationFamily: "driver_information",
      evidenceFamily,
      status: "review_required",
      summary:
        "Matter-level family contradiction: allegation family is driver-information (s172), but source evidence includes drink-driving/device (or other incompatible) material. Review required. Incompatible evidence and chase wording are not available for copy.",
      quarantinedLabels: quarantined.map((r) => r.label),
    };
  } else if (quarantined.length && matterFamily !== "drink_driving") {
    contradiction = {
      allegationFamily: matterFamily,
      evidenceFamily: "drink-driving/device",
      status: "review_required",
      summary:
        "Matter-level family contradiction: drink-driving/device evidence appears on a non-drink-driving matter. Review required. Incompatible rows are quarantined and not copyable.",
      quarantinedLabels: quarantined.map((r) => r.label),
    };
  }

  return { matterFamily, compatible, quarantined, contradiction };
}

/**
 * Chase / procedural labels must be compatible with the allegation family.
 * Source chaseLabels alone do not authorise copyable chase wording.
 */
export function assessChaseLabelFamilyCompatibility(input: {
  allegation?: string | null;
  auditFamily?: string | null;
  label: string;
}): {
  ok: boolean;
  issues: FamilyCompatibilityIssue[];
  unresolvedSourceContradiction: boolean;
  reason: string | null;
} {
  const matterFamily = classifyMatterFamily(input);
  const label = input.label ?? "";
  const issues: FamilyCompatibilityIssue[] = [];

  if (matterFamily !== "drink_driving" && containsDrinkDriveDeviceWording(label)) {
    issues.push("drink_drive_evidence_on_non_drink_drive");
  }
  if (matterFamily === "driver_information") {
    if (CCTV_RE.test(label)) issues.push("cctv_chase_on_driver_information");
    if (MEDICAL_RE.test(label)) issues.push("medical_chase_on_driver_information");
  }

  if (!issues.length) {
    return { ok: true, issues: [], unresolvedSourceContradiction: false, reason: null };
  }
  return {
    ok: false,
    issues: [...new Set(issues)],
    unresolvedSourceContradiction: true,
    reason:
      "Chase item is incompatible with the allegation/matter family. Treat as an unresolved source contradiction — not available for copy.",
  };
}

/**
 * Outstanding / chase / court assertions must link to a displayed (compatible)
 * evidence label or be explicitly labelled as a procedural request that is also
 * family-compatible.
 */
export function assessProvenanceCoherence(input: {
  prose: string;
  evidenceLabels: string[];
}): { ok: boolean; orphanMentions: string[] } {
  const labels = input.evidenceLabels.map((l) => l.toLowerCase());
  const orphans: string[] = [];
  const probes: Array<{ re: RegExp; key: string }> = [
    { re: /\bCCTV\b/i, key: "cctv" },
    { re: /\bCAD\b|\b999\b/i, key: "cad" },
    { re: /\bmedical\b|\binjury\b/i, key: "medical" },
    { re: /\bmessage(?:s)?\b|\bscreenshots?\b/i, key: "message" },
    { re: /\bBWV\b|body-worn/i, key: "bwv" },
    { re: /\bMG11\b/i, key: "mg11" },
  ];
  for (const { re, key } of probes) {
    if (!re.test(input.prose)) continue;
    const has = labels.some(
      (l) => l.includes(key) || (key === "cad" && (l.includes("999") || l.includes("cad"))),
    );
    const procedural = /\bprocedural\s+request\b|\bschedule\b|\bMG6\b/i.test(input.prose);
    if (!has && !procedural) orphans.push(key);
  }
  return { ok: orphans.length === 0, orphanMentions: orphans };
}

/** All-exit invariant helper for non-drink-driving matters. */
export function violatesDrinkDriveCopyInvariant(input: {
  allegation?: string | null;
  auditFamily?: string | null;
  text: string;
  canCopy: boolean;
}): boolean {
  if (!input.canCopy) return false;
  if (classifyMatterFamily(input) === "drink_driving") return false;
  return containsDrinkDriveDeviceWording(input.text);
}

export type FamilyBlockAudience = "client" | "court" | "export" | "default";

/**
 * Protected machine/audit metadata for family-compatibility blocks.
 * Never place `issueCodes` into solicitor-visible / copyable / exportable text.
 */
export type FamilyCompatibilityProtectedMetadata = {
  familyCompatibilityIssues: FamilyCompatibilityIssue[];
  matterFamily?: MatterFamilyKind;
  blockedAt: "family_compatibility";
};

const FAMILY_ISSUE_PROSE: Record<FamilyCompatibilityIssue, string> = {
  intoxilyser_on_non_drink_drive:
    "breath/device (intoxilyser) material that does not match the recorded allegation family",
  breath_device_on_non_drink_drive:
    "breath-device procedure wording that does not match the recorded allegation family",
  calibration_on_non_drink_drive:
    "device-calibration material that does not match the recorded allegation family",
  drink_drive_evidence_on_non_drink_drive:
    "drink-drive evidence wording that does not match the recorded allegation family",
  cctv_chase_on_driver_information:
    "CCTV/dashcam chase wording that does not match a driver-information allegation",
  medical_chase_on_driver_information:
    "medical/expert chase wording that does not match a driver-information allegation",
  pwits_on_non_drugs: "supply (PWITS) wording that does not match the recorded allegation family",
  abe_on_non_sexual_or_violence:
    "ABE wording that does not match the recorded allegation family",
  empty_generic_client_summary: "an over-generic client summary without safe source support",
  matter_family_evidence_contradiction:
    "evidence that conflicts with the recorded allegation family",
};

/**
 * Professional solicitor-visible reason for a family-compatibility block.
 * Internal snake_case issue codes must never appear in the returned string.
 */
export function describeFamilyCompatibilityForSolicitor(input: {
  issues: FamilyCompatibilityIssue[];
  audience?: FamilyBlockAudience;
}): string {
  const audience = input.audience ?? "default";
  const issues = [...new Set(input.issues)];
  if (!issues.length) {
    return "This wording is unavailable pending solicitor review of the source bundle.";
  }

  const what =
    issues.length === 1
      ? FAMILY_ISSUE_PROSE[issues[0]!] ?? "source material that appears inconsistent with the recorded allegation"
      : "source material that appears inconsistent with the recorded allegation";

  if (audience === "client") {
    return [
      `Some papers look inconsistent with the recorded allegation, so this client wording has been withheld for now.`,
      `A solicitor should check the source bundle before this is relied on or sent.`,
      `Next: ask your solicitor to review the withheld material against the charge before any client update.`,
    ].join(" ");
  }
  if (audience === "court") {
    return [
      `Court-facing wording has been withheld because ${what} was detected in the draft line.`,
      `The position requires solicitor review before any court note is used.`,
      `Next: check the source bundle and re-draft a family-compatible court line before filing or handing up.`,
    ].join(" ");
  }
  if (audience === "export") {
    return [
      `Export wording has been withheld because some source material appears inconsistent with the recorded allegation.`,
      `Review the source bundle, confirm the operative allegation, and regenerate the export using only compatible material.`,
      `Next: check the papers against the charge before any export or send.`,
    ].join(" ");
  }
  return [
    `Some source material appears inconsistent with the recorded allegation and has been withheld from this output pending solicitor review.`,
    `Check the source bundle before relying on or sending this wording.`,
    `Next: confirm the operative allegation and only then re-issue compatible copy.`,
  ].join(" ");
}

export function buildFamilyCompatibilityProtectedMetadata(input: {
  issues: FamilyCompatibilityIssue[];
  matterFamily?: MatterFamilyKind;
}): FamilyCompatibilityProtectedMetadata {
  return {
    familyCompatibilityIssues: [...new Set(input.issues)],
    matterFamily: input.matterFamily,
    blockedAt: "family_compatibility",
  };
}

/** Escape a registry code for safe use inside a RegExp word-boundary pattern. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cached regex derived from the complete issue-code registry (never a hand-maintained parallel list). */
let _familyIssueCodeLeakRe: RegExp | null = null;
function familyIssueCodeLeakRegExp(): RegExp {
  if (!_familyIssueCodeLeakRe) {
    const alts = FAMILY_COMPATIBILITY_ISSUE_CODE_REGISTRY.map(escapeRegExp).join("|");
    _familyIssueCodeLeakRe = new RegExp(`\\b(?:${alts})\\b`, "i");
  }
  return _familyIssueCodeLeakRe;
}

/** True when solicitor-visible text still contains raw family-compatibility issue codes. */
export function solicitorVisibleTextContainsFamilyIssueCodes(text: string | null | undefined): boolean {
  const t = text ?? "";
  if (!t) return false;
  return familyIssueCodeLeakRegExp().test(t);
}

/**
 * Internal/system language that must never appear on any solicitor-visible surface
 * (including blocked / non-copyable banners). Ordinary professional words are not matched.
 */
export const SOLICITOR_VISIBLE_SYSTEM_LANGUAGE_RE =
  /\b(?:internal\s+detector(?:\s+codes?)?|detector\s+codes?|protected\s*audit(?:\s+metadata)?|protectedAudit|machine\s+metadata|materialisation|materialization|harness|control\s*IDs?|registry\s*IDs?|audit\s+engines?|pipelines?|MAA2?-[A-Z0-9-]+|FIND-[A-Z0-9-]+)\b/i;

export type SolicitorVisibleInternalLanguageHit = {
  kind: "family_issue_code" | "system_language" | "legacy_forbidden";
  matched: string;
};

/**
 * Boundary scan for ALL solicitor-visible surfaces (copyable or blocked).
 * Blocked status does not authorise internal language leakage.
 */
export function scanSolicitorVisibleInternalLanguageBoundary(
  text: string | null | undefined,
): SolicitorVisibleInternalLanguageHit[] {
  const t = text ?? "";
  if (!t.trim()) return [];
  const hits: SolicitorVisibleInternalLanguageHit[] = [];
  const codeMatch = t.match(familyIssueCodeLeakRegExp());
  if (codeMatch?.[0]) hits.push({ kind: "family_issue_code", matched: codeMatch[0] });
  const sysMatch = t.match(SOLICITOR_VISIBLE_SYSTEM_LANGUAGE_RE);
  if (sysMatch?.[0]) hits.push({ kind: "system_language", matched: sysMatch[0] });
  return hits;
}

export function solicitorVisibleTextContainsInternalSystemLanguage(
  text: string | null | undefined,
): boolean {
  return scanSolicitorVisibleInternalLanguageBoundary(text).length > 0;
}
