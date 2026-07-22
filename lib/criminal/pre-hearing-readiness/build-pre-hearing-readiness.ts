import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { utcDayDiff } from "@/lib/criminal/solicitor-time-clock";
import { sanitizeReadinessLine } from "./readiness-sanitize";
import type {
  PreHearingReadinessInput,
  PreHearingReadinessLevel,
  PreHearingReadinessOutcome,
  PreHearingReadinessResult,
} from "./readiness-types";

const CORE_MISSING_PATTERNS = [
  /cctv/i,
  /master/i,
  /export/i,
  /cad/i,
  /999/i,
  /interview/i,
  /transcript/i,
  /audio/i,
  /bwv/i,
  /lab/i,
  /medical/i,
  /expert/i,
  /continuity/i,
  /mg6/i,
  /unused/i,
];

function dedupe(lines: string[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizeReadinessLine(line);
    if (!s) continue;
    const key = s.toLowerCase().slice(0, 72);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

function labelForLevel(level: PreHearingReadinessLevel): string {
  switch (level) {
    case "green":
      return "Ready for solicitor review";
    case "amber":
      return "Review before hearing";
    case "red":
      return "Not ready to rely on yet";
  }
}

function isSeriousOffence(charge: string): boolean {
  return /section\s*18|section\s*20|gbh|wounding|robbery|murder|manslaughter|firearm|intent to supply|pwits|class a/i.test(
    charge,
  );
}

function isGenericProvisionalLens(
  reasoning: ReasoningV2ViewModel,
  workflowProfileHint?: string | null,
): boolean {
  if (workflowProfileHint && /generic_provisional|provisional/i.test(workflowProfileHint)) {
    return true;
  }
  const route = `${reasoning.primaryRoute} ${reasoning.whyRouteIsLive}`.toLowerCase();
  if (/provisional|generic|human review/i.test(route)) return true;
  return /pervert.*course of justice|common law.*justice/i.test(reasoning.charge);
}

function isThinBundle(
  reasoning: ReasoningV2ViewModel,
  input: PreHearingReadinessInput,
): boolean {
  if (input.bundleMeta?.thinBundleHint) return true;
  const len = input.bundleMeta?.combinedTextLength ?? 0;
  const docs = input.bundleMeta?.documentCount ?? 0;
  if (len > 0 && len < 12_000) return true;
  if (docs > 0 && docs < 6) return true;
  const evidenceCount =
    reasoning.evidenceHelpingDefence.length + reasoning.evidenceHurtingDefence.length;
  return evidenceCount < 3 || reasoning.missingMaterial.length >= 4;
}

function countCoreMissing(reasoning: ReasoningV2ViewModel): number {
  return reasoning.missingMaterial.filter((m) =>
    CORE_MISSING_PATTERNS.some((p) => p.test(m.label)),
  ).length;
}

function hearingWithinDays(iso: string | null | undefined, days: number, asOf: Date = new Date()): boolean {
  if (!iso) return false;
  const diff = utcDayDiff(asOf, iso.trim().slice(0, 10));
  return diff !== null && diff >= 0 && diff <= days;
}

type ScoreBreakdown = {
  severity: number;
  coreMissing: number;
  thinBundle: boolean;
  genericProvisional: boolean;
  seriousOffence: boolean;
  instructionGaps: number;
  doNotConcedeCount: number;
  hearingSoon: boolean;
};

function scoreReadiness(
  reasoning: ReasoningV2ViewModel,
  clientStress: ClientStressResult | null | undefined,
  input: PreHearingReadinessInput,
): { level: PreHearingReadinessLevel; breakdown: ScoreBreakdown } {
  const coreMissing = countCoreMissing(reasoning);
  const thinBundle = isThinBundle(reasoning, input);
  const genericProvisional = isGenericProvisionalLens(reasoning, input.workflowProfileHint);
  const seriousOffence = isSeriousOffence(reasoning.charge);
  const instructionGaps =
    clientStress?.clientInstructionChecklist.filter((c) => c.provisional).length ??
    (clientStress?.clientInstructionQuestions.length ?? 0);
  const doNotConcedeCount =
    clientStress?.doNotConcedeGuards.length ?? reasoning.warRoom.doNotConcede.length;
  const hearingSoon = hearingWithinDays(input.hearingMeta?.hearingDateIso, 14);

  let severity = 0;
  if (reasoning.humanReviewRequired) severity += 2;
  if (reasoning.warRoom.solicitorReviewRequired) severity += 1;
  if (thinBundle) severity += 1;
  if (genericProvisional) severity += 2;
  if (seriousOffence && thinBundle) severity += 1;
  if (coreMissing >= 3) severity += 3;
  else if (coreMissing >= 1) severity += 2;
  else if (reasoning.missingMaterial.length >= 3) severity += 2;
  else if (reasoning.missingMaterial.length >= 1) severity += 1;
  if (reasoning.contradictions.length >= 2) severity += 2;
  else if (reasoning.contradictions.length >= 1) severity += 1;
  if (instructionGaps >= 3) severity += 1;
  if (doNotConcedeCount >= 5) severity += 1;
  if (hearingSoon && (coreMissing >= 1 || reasoning.humanReviewRequired)) severity += 1;

  const breakdown: ScoreBreakdown = {
    severity,
    coreMissing,
    thinBundle,
    genericProvisional,
    seriousOffence,
    instructionGaps,
    doNotConcedeCount,
    hearingSoon,
  };

  if (
    (genericProvisional && reasoning.humanReviewRequired && thinBundle) ||
    (seriousOffence && thinBundle && coreMissing >= 2 && reasoning.humanReviewRequired) ||
    severity >= 8
  ) {
    return { level: "red", breakdown };
  }
  if (
    severity >= 3 ||
    coreMissing >= 2 ||
    reasoning.humanReviewRequired ||
    reasoning.missingMaterial.length >= 2 ||
    reasoning.contradictions.length >= 1 ||
    instructionGaps >= 2
  ) {
    return { level: "amber", breakdown };
  }
  return { level: "green", breakdown };
}

function buildExplanation(
  level: PreHearingReadinessLevel,
  reasoning: ReasoningV2ViewModel,
  breakdown: ScoreBreakdown,
): string {
  const parts: string[] = [
    "Pre-hearing readiness reflects whether served papers support a safe hearing position — not case strength or plea advice.",
  ];
  if (level === "green") {
    parts.push("No obvious source-blocker flagged on current papers; solicitor review still required before any hearing line is finalised.");
  } else if (level === "amber") {
    parts.push("Outstanding material, instructions, or review flags mean the hearing position should not be finalised yet.");
  } else {
    parts.push("Core source material or review gaps mean it is not safe to rely on this matter for a final hearing position on current papers.");
  }
  if (breakdown.coreMissing >= 1) {
    parts.push(`${breakdown.coreMissing} core disclosure item(s) (CCTV/CAD/interview/lab/medical class) outstanding or partial on served papers.`);
  }
  if (breakdown.genericProvisional) {
    parts.push("Generic/provisional lens — no confident hearing line without solicitor review.");
  }
  if (breakdown.hearingSoon) {
    parts.push("Hearing date is within two weeks — prioritise chase and instructions.");
  }
  if (reasoning.stage) {
    parts.push(`Stage on file: ${reasoning.stage}.`);
  }
  return sanitizeReadinessLine(parts.join(" "));
}

function buildBlockers(
  reasoning: ReasoningV2ViewModel,
  breakdown: ScoreBreakdown,
  clientStress: ClientStressResult | null | undefined,
): string[] {
  const blockers: string[] = [];
  for (const m of reasoning.missingMaterial.slice(0, 5)) {
    blockers.push(`${m.label} — outstanding or partial on served papers (${m.sourceSection}).`);
  }
  for (const c of reasoning.contradictions.slice(0, 3)) {
    blockers.push(`${c.label} — unresolved on papers (${c.sourceSection}).`);
  }
  for (const r of reasoning.humanReviewReasons.slice(0, 3)) {
    blockers.push(r);
  }
  if (breakdown.thinBundle) {
    blockers.push("Thin bundle / limited source snippets on file — comparison remains provisional.");
  }
  if (breakdown.genericProvisional) {
    blockers.push("Serious/provisional offence mapping — solicitor review before fixing route.");
  }
  if (clientStress?.solicitorReviewRequired) {
    blockers.push("Client account stress-test flags solicitor review before aligning account to papers.");
  }
  return dedupe(blockers, 8);
}

export function buildPreHearingReadiness(
  reasoning: ReasoningV2ViewModel | null | undefined,
  clientStress: ClientStressResult | null | undefined,
  input: PreHearingReadinessInput = {},
): PreHearingReadinessOutcome {
  if (!reasoning) {
    return { available: false, reason: "no_reasoning" };
  }

  const { level, breakdown } = scoreReadiness(reasoning, clientStress, input);

  const disclosureChasePriorities = dedupe(
    reasoning.disclosureChasePriorities.map((d) =>
      d.safeAction
        ? `${d.label} — ${d.safeAction}`
        : d.chaseNote
          ? `${d.label} — ${d.chaseNote}`
          : d.label,
    ),
    6,
  );

  const clientInstructionGaps = dedupe(
    [
      ...(clientStress?.clientInstructionChecklist.map((c) => c.questionText) ?? []),
      ...(clientStress?.clientInstructionQuestions ?? []),
      ...(breakdown.instructionGaps === 0 && reasoning.humanReviewRequired
        ? ["Further client instructions may be needed before finalising hearing position."]
        : []),
    ],
    6,
  );

  const doNotConcedeRisks = dedupe(
    [
      ...(clientStress?.doNotConcedeGuards.map((g) => `${g.concessionRiskLabel}: ${g.safeWordingAlternative}`) ??
        []),
      ...reasoning.warRoom.doNotConcede,
      reasoning.doNotOverstateWarning,
      reasoning.warRoom.doNotOverstate,
    ].filter(Boolean) as string[],
    6,
  );

  const safeNextAction = sanitizeReadinessLine(
    reasoning.safeNextAction ||
      reasoning.warRoom.disclosureTimetableRequests[0] ||
      (disclosureChasePriorities[0]
        ? `Chase disclosure: ${disclosureChasePriorities[0]}`
        : "Review served papers and record provisional hearing position after solicitor review."),
  );

  const solicitorReviewRequired =
    level !== "green" ||
    reasoning.humanReviewRequired ||
    reasoning.warRoom.solicitorReviewRequired ||
    breakdown.genericProvisional ||
    breakdown.coreMissing >= 1;

  const result: PreHearingReadinessResult = {
    available: true,
    level,
    label: labelForLevel(level),
    explanation: buildExplanation(level, reasoning, breakdown),
    topBlockers: buildBlockers(reasoning, breakdown, clientStress),
    disclosureChasePriorities,
    clientInstructionGaps,
    doNotConcedeRisks,
    safeNextAction,
    solicitorReviewRequired,
  };

  return result;
}
