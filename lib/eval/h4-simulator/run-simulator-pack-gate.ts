/**
 * Shared simulator pack gate runner (v1 + v1.1 supplement).
 */
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "@/components/criminal/workflow/buildMatterBrief";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";
import {
  buildBundleTruthLedger,
  formatHearingDisplayFromLedger,
  guardBattleboardOutput,
} from "@/lib/criminal/bundle-truth-ledger";
import { lintExportOutput } from "@/lib/criminal/disclosure-export/export-sanitize";
import { resolveCaseHeaderMetadata } from "@/lib/criminal/resolve-case-header-metadata";
import { buildStrategyBattleboard } from "@/lib/criminal/strategy-battleboard";
import { buildCopySafeResult, inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import type { SimulatorManifestCase } from "./manifest-types";
import type { SimulatorPackEntry } from "./load-simulator-pack";

const GLOBAL_BLOCKING_RES = [
  /\bwe win\b/i,
  /\bcase collapses\b/i,
  /\bask the court to record\b[\s\S]{0,120}\bplease provide\b/i,
] as const;

export type SimulatorGateCaseResult = {
  caseId: string;
  title: string;
  blocking: string[];
  warnings: string[];
  outputsChecked: number;
  chaseItemCount: number;
};

export type SimulatorGateOptions = {
  /** Apply serious legal-aid hard rules (v1.1 supplement). */
  seriousSupplement?: boolean;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function patternHits(text: string, patterns: string[]): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    try {
      if (new RegExp(p, "i").test(text)) hits.push(p);
    } catch {
      if (norm(text).includes(norm(p))) hits.push(p);
    }
  }
  return hits;
}

function collectOutputSections(
  chase: ReturnType<typeof buildDisclosureChaseBrief>,
  war: ReturnType<typeof buildHearingWarRoomBrief>,
  matter: ReturnType<typeof buildMatterBrief>,
): { cpsAndClient: string; factual: string; courtOnly: string } {
  const cpsAndClient = [
    chase.disclosureSummary,
    ...chase.items.map((i) => i.draftChaseWording),
    ...matter.sections
      .filter((s) => s.id === "client" || s.id === "chase")
      .flatMap((s) => [s.paragraph, ...(s.bullets ?? [])]),
  ]
    .filter(Boolean)
    .join("\n\n");

  const courtOnly = [
    chase.safeCourtLine,
    ...chase.items.map((i) => i.courtLine),
    ...war.askCourtToRecord,
  ]
    .filter(Boolean)
    .join("\n\n");

  const factual = [
    cpsAndClient,
    war.safePositionToday,
    ...war.sayThis,
    ...war.doNotOverstate,
    ...war.collapseRisks,
    ...matter.sections.flatMap((s) => [s.paragraph, ...(s.bullets ?? [])]),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { cpsAndClient, factual, courtOnly };
}

function applySeriousCaseHardRules(
  m: SimulatorManifestCase,
  sections: { cpsAndClient: string; factual: string },
  bundleText: string,
  blocking: string[],
): void {
  const { cpsAndClient, factual } = sections;
  const hasReferredAbe = m.referredOnlyEvidence.some((e) => /abe|interview/i.test(e));
  const hasReferredCctvBwv = m.referredOnlyEvidence.some((e) => /cctv|bwv|body.?worn|footage/i.test(e));
  const hasMissingFullSource = m.missingEvidence.some((e) =>
    /master|full|extraction|download|mapping|abe|mg11/i.test(e),
  );

  if (/\b(handle|encro)\b[\s\S]{0,80}\b(defendant|our client)\b[\s\S]{0,40}\b(proved|confirmed|shows|established)\b/i.test(factual)) {
    blocking.push("simulator.serious:handle_attribution_as_fact");
  }
  if (/\b(phone|handset|line)\b[\s\S]{0,60}\b(proved|confirmed|establishes)\b[\s\S]{0,40}\b(defendant|attribution)\b/i.test(cpsAndClient)) {
    blocking.push("simulator.serious:phone_attribution_as_fact");
  }
  if (/\b(principal|leading role|supplier|runner role|line holder)\b[\s\S]{0,40}\b(proved|established|confirmed)\b/i.test(factual)) {
    blocking.push("simulator.serious:conspiracy_role_overclaim");
  }
  if (/\bco-?defendant\b[\s\S]{0,80}\b(proved|confirms|establishes|supply)\b/i.test(cpsAndClient)) {
    blocking.push("simulator.serious:codefendant_bleed");
  }
  if (hasReferredAbe && /\b(abe confirms|interview proves|abe shows|interview establishes)\b/i.test(factual)) {
    blocking.push("simulator.serious:abe_treated_as_served");
  }
  if ((hasReferredCctvBwv || hasMissingFullSource) && /\b(cctv shows|bwv shows|footage proves|video confirms)\b/i.test(cpsAndClient)) {
    blocking.push("simulator.serious:visual_media_proves_without_source");
  }
  if (/\bjoint enterprise\b[\s\S]{0,40}\b(proved|established|confirmed)\b/i.test(factual)) {
    blocking.push("simulator.serious:joint_enterprise_overclaim");
  }
  if (/\bparticipation\b[\s\S]{0,30}\b(proved|established|confirmed)\b/i.test(factual) && m.profile.includes("multi_hand")) {
    blocking.push("simulator.serious:participation_as_fact");
  }

  if (/co-defendant|co defendant|Okonkwo|Rivers|Wright/i.test(bundleText) && /\bfor this defendant\b[\s\S]{0,40}\bproved\b/i.test(cpsAndClient)) {
    blocking.push("simulator.serious:codefendant_evidence_mapped_as_fact");
  }
}

export function runSimulatorPackGateCase(
  entry: SimulatorPackEntry,
  options: SimulatorGateOptions = {},
): SimulatorGateCaseResult {
  const m = entry.manifest;
  const bundleText = entry.bundleText;
  const blocking: string[] = [];
  const warnings: string[] = [];
  let outputsChecked = 0;

  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: m.missingEvidence,
    allegation: header.allegation,
  });
  const battleboard = guardBattleboardOutput(
    buildStrategyBattleboard({
      case_id: m.caseId,
      bundle_text: bundleText,
      offence_label: header.allegation,
    }),
    { ledger, bundleText },
  );
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;

  const common = {
    caseId: m.caseId,
    caseTitle: m.title,
    clientLabel: header.clientLabel?.trim() || m.fakeDefendant,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Simulator pack",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    briefPlan,
  };

  const chase = buildDisclosureChaseBrief({
    ...common,
    hearingDateIso: ledger.hearing.dateIso,
    snapshotMissing: m.missingEvidence.map((label) => ({ label, status: "outstanding" as const })),
    proceduralOutstanding: m.missingEvidence,
  });
  const war = buildHearingWarRoomBrief({
    ...common,
    readiness: chase.disclosureSummary,
    hasSavedPosition: false,
    chaseItems: m.missingEvidence.length ? m.missingEvidence : m.expectedChaseItems,
  });
  const matter = buildMatterBrief({ warRoom: war, chase, briefPlan });

  for (const item of chase.items) {
    const sourceState = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const cps = buildCopySafeResult({
      text: item.draftChaseWording,
      kind: "cps_chase",
      sourceState,
      sourceLabel: item.source,
    });
    outputsChecked += 1;
    for (const issue of lintExportOutput(cps.textForClipboard)) {
      blocking.push(`export.lint.${issue}:${item.label.slice(0, 32)}`);
    }
    if (cps.sendability === "safe_to_send" && sourceState !== "served") {
      blocking.push(`simulator.false_safe_to_send:${item.label.slice(0, 32)}`);
    }
    if (!cps.canCopy && cps.blockedReason?.includes("Court wording")) {
      blocking.push(`simulator.court_in_cps:${item.label.slice(0, 32)}`);
    }
  }

  const sections = collectOutputSections(chase, war, matter);
  outputsChecked += chase.items.length + matter.sections.length;

  for (const re of GLOBAL_BLOCKING_RES) {
    if (re.test(sections.cpsAndClient)) {
      blocking.push(`simulator.global_block:${re.source.slice(0, 40)}`);
    }
  }

  for (const p of m.blockingFailPatterns) {
    const target =
      /ask the court/i.test(p) || /please provide/i.test(p)
        ? sections.cpsAndClient
        : sections.factual;
    if (patternHits(target, [p]).length) {
      blocking.push(`simulator.blocking_pattern:${p.slice(0, 48)}`);
    }
  }

  for (const p of m.mustNotSay) {
    if (patternHits(sections.factual, [p]).length) {
      blocking.push(`simulator.must_not_say:${p.slice(0, 48)}`);
    }
  }

  if (options.seriousSupplement) {
    applySeriousCaseHardRules(m, sections, bundleText, blocking);
  }

  if (m.expectedChaseItems.length && chase.items.length === 0) {
    warnings.push("simulator.no_chase_items");
  } else {
    for (const expected of m.expectedChaseItems.slice(0, 4)) {
      const hit = chase.items.some((i) => norm(i.label).includes(norm(expected).slice(0, 12)));
      if (!hit) warnings.push(`simulator.chase_item_missing:${expected.slice(0, 32)}`);
    }
  }

  const todayBlob = [war.safePositionToday, ...war.collapseRisks, chase.disclosureSummary].join("\n");
  if (m.expectedTodayIssue && !norm(todayBlob).includes(norm(m.expectedTodayIssue).slice(0, 16))) {
    warnings.push("simulator.today_issue_drift");
  }

  if (m.offenceFamily === "motoring" && /\bfraud account-control\b/i.test(sections.factual)) {
    blocking.push("simulator.family_bleed:fraud_on_motoring");
  }
  if (m.offenceFamily === "harassment" && /\bpwits\b/i.test(sections.factual) && !/harassment/i.test(sections.factual)) {
    blocking.push("simulator.family_bleed:pwits_on_harassment");
  }

  return {
    caseId: m.caseId,
    title: m.title,
    blocking,
    warnings,
    outputsChecked,
    chaseItemCount: chase.items.length,
  };
}
