/**
 * Build the full Proof Ledger from emitted lines, gate session, bundle, and truth key.
 */
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { familyDisplayName } from "@/lib/criminal/chase-source-gate";
import {
  evidenceItemInBundle,
  humaniseLedgerLine,
  humaniseMg6cRow,
  isUsefulSummaryBullet,
  parseMg6cScheduleRows,
  sourceLedEvidenceGaps,
  trapMentionsIrrelevantTopic,
} from "./ledger-display";
import { needsGedReviewList, tierLabel } from "./review-tier";
import type { RecordedRewrite, RecordedSuppression } from "./proof-ledger-session";
import { buildSuppressionRecord } from "./proof-ledger-session";
import {
  suppressionFamilyDisplayName,
  truncateAtWord,
  type ExtendedSuppressionFamily,
} from "./suppression-families";
import type {
  EntityPersonLedgerEntry,
  MissingExpectedOutputLedgerEntry,
  ProofLedger,
  ProofLedgerBuildInput,
  ProofLedgerPackCounts,
  ProofLedgerRawModels,
  ProofLedgerSolicitorSummary,
  RewriteDowngradeLedgerEntry,
  SourceConflictLedgerEntry,
  SuppressedCandidateLedgerEntry,
  SurfaceDestination,
  SurfaceSafetyLedgerEntry,
} from "./proof-ledger-types";
import type { LineSourceProofRecord } from "./types";

const VAGUE_MG6_LINE_RE = /\bmg6\s*\/\s*unused schedule clarification\b/i;

function isVagueMg6Line(text: string): boolean {
  return VAGUE_MG6_LINE_RE.test(text);
}

function plainEnglishForEmitted(line: LineSourceProofRecord): string {
  if (line.humanEvidenceLabel && /mg6\/schedule reference only/i.test(line.whyThisIsLimited)) {
    return `Use with caution — ${line.humanEvidenceLabel} — not fully served on current papers.`;
  }
  if (line.reviewTier === "clean_source_backed") {
    return `Safe and source-backed — ${line.whyThisSupportsTheLine.slice(0, 120)}`;
  }
  if (line.reviewTier === "generic_safety_guard") {
    return "Generic safety guard — does not assert bundle facts.";
  }
  if (line.reviewTier === "blocking_review") {
    return `Needs urgent review — ${line.whyThisIsLimited.slice(0, 120)}`;
  }
  if (line.reviewTier === "source_review") {
    return `Source gap or weak anchor — ${line.whyThisIsLimited.slice(0, 120)}`;
  }
  if (line.reviewTier === "solicitor_caution") {
    return `Use with caution — ${line.whyThisIsLimited.slice(0, 120)}`;
  }
  return line.whyThisIsLimited || line.whyThisSupportsTheLine;
}

function plainEnglishForSuppression(s: RecordedSuppression): string {
  const fam = suppressionFamilyDisplayName(s.sourceFamily as ExtendedSuppressionFamily);
  const candidate = s.candidateText.trim();
  const preview = truncateAtWord(candidate, 100);
  if (s.proofStatus === "needs_review_possible_false_suppression") {
    return `CaseBrain did not show this line, but the bundle may mention ${fam}. Would have said: "${preview}". Solicitor should confirm whether a chase line should have appeared.`;
  }
  if (s.proofStatus === "correctly_suppressed_overclaim") {
    return `CaseBrain refused to say this — overclaim or unsafe trap removed. Would have said: "${preview}". ${s.reasonSuppressed}`;
  }
  if (/compound\/template line dropped/i.test(s.reasonSuppressed)) {
    return `CaseBrain refused to say this — compound line gated (${s.reasonSuppressed}). Would have said: "${preview}".`;
  }
  if (s.reasonSuppressed.includes("negates")) {
    return `CaseBrain refused to say this — bundle negates ${fam}. Would have said: "${preview}".`;
  }
  if (/overclaim|trap/i.test(s.reasonSuppressed)) {
    return `CaseBrain refused to say this — overclaim or unsafe trap removed. Would have said: "${preview}". ${s.reasonSuppressed}`;
  }
  if (s.sourceFamily === "unknown_unclassified" && s.unknownReason) {
    return `CaseBrain refused to say this (${fam}). Would have said: "${preview}". ${s.unknownReason}`;
  }
  return `CaseBrain refused to say this — ${fam} not supported on current papers. Would have said: "${preview}".`;
}

function plainEnglishForRewrite(r: RecordedRewrite): string {
  const map: Record<string, string> = {
    confirm_none: "Wording changed to ask CPS to confirm none exists — bundle negates the material.",
    overclaim_softened: "Overclaim softened so the line matches what the bundle actually supports.",
    provisional_wording: "Position marked provisional until served material is confirmed.",
    attribution_guard: "Attribution wording guarded — handle or subscriber not equated to defendant without source.",
    mg6_label: "MG6 schedule label humanised for solicitor use.",
    human_label: "Output humanised with a clearer evidence label.",
    other: "Wording adjusted before display to stay source-safe.",
  };
  return map[r.changeType] ?? map.other;
}

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function lineAppearsInEmitted(candidate: string, emitted: LineSourceProofRecord[]): boolean {
  const key = normalizeForMatch(candidate);
  return emitted.some(
    (l) =>
      normalizeForMatch(l.outputLine).includes(key) ||
      key.includes(normalizeForMatch(l.outputLine).slice(0, 40)),
  );
}

function collectRawChaseStrings(chase: DisclosureChaseBrief): Array<{ text: string; surface: string }> {
  const out: Array<{ text: string; surface: string }> = [];
  const addItem = (item: {
    label: string;
    draftChaseWording: string;
    whyItMatters: string;
    courtLine?: string | null;
  }) => {
    out.push({ text: item.label, surface: "disclosure_chase.label" });
    out.push({ text: item.draftChaseWording, surface: "disclosure_chase.cps_chase" });
    out.push({ text: item.whyItMatters, surface: "disclosure_chase.why_it_matters" });
    if (item.courtLine) out.push({ text: item.courtLine, surface: "disclosure_chase.court_note" });
  };
  for (const item of chase.primaryItems ?? []) addItem(item);
  for (const item of chase.additionalItems ?? []) addItem(item);
  for (const item of chase.items ?? []) addItem(item);
  if (chase.safeCourtLine) out.push({ text: chase.safeCourtLine, surface: "disclosure_chase.safe_court_line" });
  if (chase.disclosureSummary) out.push({ text: chase.disclosureSummary, surface: "disclosure_chase.summary" });
  return out;
}

function collectRawWarRoomStrings(warRoom: HearingWarRoomBrief): Array<{ text: string; surface: string }> {
  const out: Array<{ text: string; surface: string }> = [];
  const push = (lines: string[] | undefined, surface: string) => {
    for (const l of lines ?? []) out.push({ text: l, surface });
  };
  if (warRoom.safePositionToday) out.push({ text: warRoom.safePositionToday, surface: "war_room.safe_position" });
  push(warRoom.sayThis, "war_room.say_this");
  push(warRoom.doNotOverstate, "war_room.do_not_overstate");
  push(warRoom.askCourtToRecord, "war_room.ask_court");
  push(warRoom.instructionsNeeded, "war_room.instructions");
  push(warRoom.nextHearingMoves, "war_room.next_moves");
  push(warRoom.collapseRisks, "war_room.collapse_risks");
  push(warRoom.evidenceAnchors, "war_room.evidence_anchors");
  if (warRoom.draftWording) {
    out.push({ text: warRoom.draftWording.disclosureTimetable, surface: "war_room.draft_timetable" });
    out.push({ text: warRoom.draftWording.adjournment, surface: "war_room.draft_adjournment" });
    out.push({ text: warRoom.draftWording.clientExplanation, surface: "war_room.client_explanation" });
  }
  return out;
}

function diffRawCandidates(
  rawStrings: Array<{ text: string; surface: string }>,
  gatedEmitted: LineSourceProofRecord[],
  bundleText: string,
  existing: Map<string, RecordedSuppression>,
): RecordedSuppression[] {
  const added: RecordedSuppression[] = [];
  const seen = new Set<string>();
  for (const { text, surface } of rawStrings) {
    if (!text.trim() || text.trim().length < 8) continue;
    const key = `${surface}::${normalizeForMatch(text)}`;
    if (seen.has(key) || existing.has(key)) continue;
    seen.add(key);
    if (lineAppearsInEmitted(text, gatedEmitted)) continue;
    const rec = buildSuppressionRecord(text, bundleText, surface);
    if (rec.proofStatus.startsWith("correctly_suppressed")) {
      added.push(rec);
    }
  }
  return added;
}

function parseMg6cOutstanding(bundleText: string): string[] {
  return parseMg6cScheduleRows(bundleText)
    .filter((row) => /outstanding|referred|not attached|extract only|summary only|not served/i.test(row))
    .map(humaniseMg6cRow)
    .filter(isUsefulSummaryBullet);
}

function bundleExplicitOutstanding(bundleText: string): string[] {
  return parseMg6cOutstanding(bundleText);
}

function buildMissingExpected(
  input: ProofLedgerBuildInput,
  emitted: LineSourceProofRecord[],
): MissingExpectedOutputLedgerEntry[] {
  const out: MissingExpectedOutputLedgerEntry[] = [];
  const emittedText = emitted.map((l) => l.outputLine.toLowerCase()).join("\n");

  for (const item of input.truthKey.evidenceItems.filter((i) => i.chase_needed)) {
    const label = item.evidence_item;
    if (!evidenceItemInBundle(label, input.bundleText)) continue;
    const key = label.toLowerCase().slice(0, 20);
    if (!emittedText.includes(key) && !emittedText.includes(label.toLowerCase().split(" ")[0] ?? "")) {
      out.push({
        expectedItem: label,
        sourceBasis: "truth-key chase_needed",
        reasonMissing: `Truth key marks "${label}" as chase_needed but no matching chase line found in output.`,
        severity: "warning",
        plainEnglishNote: `Bundle/truth key expects chase on ${label} — verify whether CaseBrain surfaced it.`,
      });
    }
  }

  for (const expected of input.truthKey.expectedChaseItems ?? []) {
    if (!evidenceItemInBundle(expected, input.bundleText)) continue;
    const key = expected.toLowerCase().slice(0, 15);
    if (!emittedText.includes(key)) {
      out.push({
        expectedItem: expected,
        sourceBasis: "truth-key expectedChaseItems",
        reasonMissing: `Expected chase item "${expected}" not clearly visible in emitted output.`,
        severity: "warning",
        plainEnglishNote: `Source-led expectation: ${expected} should be chased or explicitly addressed.`,
      });
    }
  }

  for (const row of parseMg6cOutstanding(input.bundleText)) {
    const key = row.toLowerCase().slice(0, 20);
    if (!emittedText.includes(key.slice(0, 12))) {
      out.push({
        expectedItem: row,
        sourceBasis: "MG6C schedule row",
        reasonMissing: "MG6C marks material referred/outstanding — check output reflects this.",
        severity: "info",
        plainEnglishNote: `Schedule indicates: ${row.slice(0, 100)}`,
      });
    }
  }

  for (const trap of input.truthKey.mustNotSayGlobal ?? []) {
    if (trapMentionsIrrelevantTopic(trap, input.bundleText)) continue;
    const trapKey = trap.replace(/do not import /i, "").slice(0, 30).toLowerCase();
    const hasWarning = emitted.some(
      (l) =>
        l.lineCategory === "safety_warning" ||
        l.outputLine.toLowerCase().includes("do not") ||
        l.outputLine.toLowerCase().includes(trapKey.slice(0, 15)),
    );
    if (!hasWarning) {
      out.push({
        expectedItem: trap,
        sourceBasis: "mustNotSay trap",
        reasonMissing: "Must-not-say trap may need visible warning in output.",
        severity: "info",
        plainEnglishNote: `Truth key requires caution: ${trap}`,
      });
    }
  }

  const attributionPatterns = [
    { re: /\bhandle mapping\b/i, label: "Encro handle mapping" },
    { re: /\bsubscriber\b/i, label: "phone subscriber" },
    { re: /\bco-?defendant\b/i, label: "co-defendant material" },
    { re: /\bowner[-\s]driver\b|\bregistered keeper\b/i, label: "owner/driver attribution" },
  ];
  for (const { re, label } of attributionPatterns) {
    if (re.test(input.bundleText) && !emittedText.includes(label.toLowerCase().split(" ")[0] ?? "")) {
      out.push({
        expectedItem: label,
        sourceBasis: "bundle attribution pattern",
        reasonMissing: `Bundle mentions ${label} — verify attribution handling in output.`,
        severity: "info",
        plainEnglishNote: `Source mentions ${label}; solicitor should confirm segregation and safe wording.`,
      });
    }
  }

  const deduped = new Map<string, MissingExpectedOutputLedgerEntry>();
  for (const e of out) {
    deduped.set(`${e.sourceBasis}::${e.expectedItem.slice(0, 60)}`, e);
  }
  return [...deduped.values()].slice(0, 30);
}

function buildSourceConflicts(bundleText: string): SourceConflictLedgerEntry[] {
  const conflicts: SourceConflictLedgerEntry[] = [];
  const mg5 = bundleText.match(/MG5[\s\S]*?(?=\n#{1,3}\s|\nMG6|$)/i)?.[0] ?? "";
  const mg6c = bundleText.match(/MG6C[\s\S]*?(?=\n#{1,3}\s|\nMG\d|$)/i)?.[0] ?? "";

  const checks: Array<{ item: string; mg5Re: RegExp; mg6Re: RegExp; resolution: string }> = [
    {
      item: "BWV",
      mg5Re: /\bbwv\b|body[-\s]?worn/i,
      mg6Re: /\bbwv\b.*(?:not attached|outstanding|referred)|not attached.*\bbwv\b/i,
      resolution: "BWV referred to but not safely served — chase service, continuity, and activation.",
    },
    {
      item: "CCTV",
      mg5Re: /\bcctv\b/i,
      mg6Re: /\bcctv\b.*(?:not attached|outstanding|stills only|summary)|not attached.*\bcctv\b/i,
      resolution: "CCTV referred to but full master/footage not safely confirmed on papers.",
    },
    {
      item: "custody record",
      mg5Re: /custody record|pace/i,
      mg6Re: /custody.*(?:extract only|summary only|outstanding)|pace.*(?:not attached|outstanding)/i,
      resolution: "Custody/PACE material referred — extract or summary only; full record may be outstanding.",
    },
  ];

  for (const { item, mg5Re, mg6Re, resolution } of checks) {
    if (mg5Re.test(mg5) && mg6Re.test(mg6c)) {
      conflicts.push({
        sourceA: `MG5 narrative references ${item}`,
        sourceB: `MG6C schedule indicates ${item} not attached / outstanding`,
        conflictType: "mg5_vs_mg6c_schedule",
        safeResolution: resolution,
        solicitorReviewRequired: true,
      });
    }
  }

  if (/\bno cctv\b/i.test(bundleText) && /\bchase.*cctv|cctv.*outstanding/i.test(bundleText)) {
    conflicts.push({
      sourceA: "Bundle negates CCTV availability",
      sourceB: "Elsewhere bundle or schedule references CCTV chase",
      conflictType: "negation_vs_reference",
      safeResolution: "Treat CCTV as absent unless schedule row confirms referred material — do not overstate.",
      solicitorReviewRequired: true,
    });
  }

  return conflicts;
}

function buildEntityRisks(bundleText: string, emitted: LineSourceProofRecord[]): EntityPersonLedgerEntry[] {
  const risks: EntityPersonLedgerEntry[] = [];
  const defendant =
    bundleText.match(/Defendant:\s*(.+)/i)?.[1]?.trim() ??
    bundleText.match(/R v\s+([^\n(]+)/i)?.[1]?.trim() ??
    "";

  const coDefRe = /\bco-?defendant[s]?\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  const coDefs = [...bundleText.matchAll(coDefRe)].map((m) => m[1]).filter(Boolean);

  for (const line of emitted) {
    const text = line.outputLine;
    for (const co of coDefs) {
      if (defendant && text.includes(co) && !text.toLowerCase().includes(defendant.toLowerCase().split(" ")[0] ?? "")) {
        risks.push({
          entityLabel: co,
          role: "co_defendant",
          riskType: "co_def_bleed",
          outputReference: text.slice(0, 120),
          sourceReference: `Co-defendant ${co} in bundle`,
          plainEnglishNote: `Output references co-defendant ${co} — verify material is segregated from defendant ${defendant}.`,
          solicitorReviewRequired: true,
        });
      }
    }

    if (
      /\bhandle is (the )?defendant|defendant (is|operated) shadow|shadow-\d+/i.test(text) &&
      !/\battribution\b.*\bconfirmed\b/i.test(bundleText)
    ) {
      risks.push({
        entityLabel: "Encro handle",
        role: "encro_handle",
        riskType: "handle_treated_as_defendant",
        outputReference: text.slice(0, 120),
        sourceReference: bundleText.match(/handle mapping[^\n]{0,80}/i)?.[0] ?? null,
        plainEnglishNote: "Handle attribution must not equate Encro handle to defendant without served mapping.",
        solicitorReviewRequired: true,
      });
    }

    if (/\bsubscriber\b.*\b(user|defendant)\b|\buser\b.*\bsubscriber\b/i.test(text) && /\bsubscriber\b/i.test(bundleText)) {
      risks.push({
        entityLabel: "phone subscriber",
        role: "phone_subscriber",
        riskType: "subscriber_treated_as_user",
        outputReference: text.slice(0, 120),
        sourceReference: bundleText.match(/subscriber[^\n]{0,80}/i)?.[0] ?? null,
        plainEnglishNote: "Subscriber identity does not prove handset user — confirm attribution chain.",
        solicitorReviewRequired: true,
      });
    }

    if (/\bowner\b.*\bdriver\b|\bregistered keeper\b.*\bdrove\b/i.test(text)) {
      risks.push({
        entityLabel: "vehicle owner/driver",
        role: "vehicle_owner",
        riskType: "owner_treated_as_driver",
        outputReference: text.slice(0, 120),
        sourceReference: null,
        plainEnglishNote: "Owner/keeper is not automatically the driver — verify attribution.",
        solicitorReviewRequired: true,
      });
    }
  }

  const seen = new Set<string>();
  return risks.filter((r) => {
    const k = `${r.riskType}::${r.entityLabel}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function mapSurface(surface: string): SurfaceDestination {
  if (/cps|chase|draft_chase/i.test(surface)) return "cps_chase";
  if (/court/i.test(surface)) return "court_note";
  if (/client/i.test(surface)) return "client_summary";
  if (/export/i.test(surface)) return "export_pack";
  if (/war_room/i.test(surface)) return "war_room";
  if (/proof|audit/i.test(surface)) return "proof_report";
  return "other";
}

function buildSurfaceSafety(emitted: LineSourceProofRecord[]): SurfaceSafetyLedgerEntry[] {
  const issues: SurfaceSafetyLedgerEntry[] = [];
  const courtPhrases = /\b(?:your honour|my learned friend|the court should|submission|we submit)\b/i;
  const overstatePhrases = /\bproves?\b|\bconfirms?\b|\bguarantee\b|\bcase collapses\b/i;

  for (const line of emitted) {
    const dest = mapSurface(line.outputSurface);
    if (dest === "cps_chase" && courtPhrases.test(line.outputLine)) {
      issues.push({
        surface: dest,
        outputLine: line.outputLine.slice(0, 150),
        issue: "Court-style submission wording in CPS chase draft.",
        safeAlternative: "Use neutral chase request — what is required, why it matters, by when.",
        severity: "warning",
      });
    }
    if (dest === "client_summary" && overstatePhrases.test(line.outputLine) && line.supportStatus !== "supported") {
      issues.push({
        surface: dest,
        outputLine: line.outputLine.slice(0, 150),
        issue: "Client-facing line may overstate proof strength.",
        safeAlternative: "Mark provisional — explain what is served vs outstanding.",
        severity: "warning",
      });
    }
    if (dest === "cps_chase" && /\bwe win\b|\bguilty\b|\binnocent\b/i.test(line.outputLine)) {
      issues.push({
        surface: dest,
        outputLine: line.outputLine.slice(0, 150),
        issue: "Outcome language in chase — inappropriate for CPS correspondence.",
        safeAlternative: "Focus on disclosure obligations and material gaps only.",
        severity: "warning",
      });
    }
  }
  return issues;
}

function buildSolicitorSummary(
  input: ProofLedgerBuildInput,
  emitted: LineSourceProofRecord[],
  suppressed: SuppressedCandidateLedgerEntry[],
  rewrites: RewriteDowngradeLedgerEntry[],
  missing: MissingExpectedOutputLedgerEntry[],
): ProofLedgerSolicitorSummary {
  const meaningful = emitted.filter((l) => l.usefulnessVerdict !== "excluded");
  const hasFail = meaningful.some((l) => l.verdict === "FAIL");
  const hasWarnings = meaningful.some((l) => l.verdict === "WARNING") || missing.some((m) => m.severity === "warning");
  const verdict: ProofLedgerSolicitorSummary["verdict"] = hasFail
    ? "blocked"
    : hasWarnings
      ? "pass_with_warnings"
      : "pass";
  const caseShape =
    input.truthKey.profile ??
    input.truthKey.offenceFamily ??
    input.allegation.slice(0, 80);

  const positives = meaningful
    .filter((l) => {
      if (trapMentionsIrrelevantTopic(l.outputLine, input.bundleText)) return false;
      if (l.lineCategory === "export_line" && l.claimType === "do_not_overstate") return false;
      if (l.reviewTier === "generic_safety_guard") return false;
      if (l.reviewTier !== "clean_source_backed" && l.lineCategory !== "chase_request" && l.lineCategory !== "missing_material") {
        return false;
      }
      return l.verdict === "PASS" || l.reviewTier === "clean_source_backed";
    })
    .slice(0, 6)
    .map((l) =>
      humaniseLedgerLine(l.humanOutputLine ?? l.outputLine, input.bundleText, l.humanEvidenceLabel, l.lineCategory),
    )
    .filter(isUsefulSummaryBullet)
    .filter((v) => !isVagueMg6Line(v))
    .filter((v, i, arr) => arr.findIndex((x) => x.slice(0, 50) === v.slice(0, 50)) === i);
  const refused = suppressed
    .filter((s) => s.proofStatus !== "needs_review_possible_false_suppression")
    .filter((s) => !trapMentionsIrrelevantTopic(s.candidateText, input.bundleText))
    .map((s) => s.plainEnglishNote)
    .filter(isUsefulSummaryBullet)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 8);
  const rewritten = rewrites
    .slice(0, 6)
    .map((r) => {
      const line = humaniseLedgerLine(r.finalOutput, input.bundleText);
      const note = r.solicitorFriendlyExplanation || plainEnglishForRewrite(r);
      return `${line} — ${note}`;
    })
    .filter(isUsefulSummaryBullet)
    .filter((v, i, arr) => arr.findIndex((x) => x.slice(0, 55) === v.slice(0, 55)) === i);
  const review = meaningful
    .filter((l) => needsGedReviewList(l.reviewTier))
    .slice(0, 6)
    .map((l) =>
      humaniseLedgerLine(
        `${l.outputSurface}: ${l.humanOutputLine ?? l.outputLine}`,
        input.bundleText,
        l.humanEvidenceLabel,
        l.lineCategory,
      ),
    )
    .filter(isUsefulSummaryBullet);

  const gaps = sourceLedEvidenceGaps(input.bundleText, input.truthKey);

  const keySourceAnchors = meaningful
    .filter((l) => l.reviewTier === "clean_source_backed" && l.sourceSnippet)
    .slice(0, 6)
    .map((l) => {
      const label = l.humanEvidenceLabel ?? l.lineCategory.replace(/_/g, " ");
      return `${label}: ${truncateAtWord(l.sourceSnippet!, 70)}`;
    });

  const groupedWarnings: Record<string, string[]> = {};
  for (const l of meaningful.filter((x) => x.verdict === "WARNING")) {
    const bucket = tierLabel(l.reviewTier);
    const text = truncateAtWord(humaniseLedgerLine(l.humanOutputLine ?? l.outputLine, input.bundleText), 100);
    groupedWarnings[bucket] = groupedWarnings[bucket] ?? [];
    if (groupedWarnings[bucket]!.length < 5) groupedWarnings[bucket]!.push(text);
  }
  for (const m of missing.filter((x) => x.severity === "warning").slice(0, 4)) {
    const bucket = "Missing expected (source-led)";
    groupedWarnings[bucket] = groupedWarnings[bucket] ?? [];
    groupedWarnings[bucket]!.push(truncateAtWord(m.expectedItem, 90));
  }

  return {
    verdict,
    caseShape,
    whatCaseIsAbout: `${input.defendant} — ${input.allegation}`,
    mainEvidenceGaps: gaps.length ? gaps : ["No source-led evidence gaps flagged on current papers."],
    whatCaseBrainGotRight: positives.length ? positives : ["No clean source-backed lines flagged — review emitted ledger."],
    whatCaseBrainRefusedToSay: refused.length ? refused : ["No material-family suppressions recorded."],
    whatWasRewrittenSafely: rewritten.length ? rewritten : ["No presentation rewrites recorded."],
    whatMayBeMissing: missing
      .filter((m) => m.severity === "warning")
      .filter((m) => evidenceItemInBundle(m.expectedItem, input.bundleText))
      .map((m) => humaniseLedgerLine(m.expectedItem, input.bundleText))
      .filter(isUsefulSummaryBullet)
      .slice(0, 8),
    whatStillNeedsSolicitorReview: review.length ? review : ["No tiered review queue items."],
    keySourceAnchors: keySourceAnchors.length ? keySourceAnchors : ["No clean source anchors flagged — see emitted ledger."],
    groupedWarnings,
    proofMode: input.proofChainAppendix.caseProofMode === "pdf_and_text" ? "pdf_backed" : "text_only",
  };
}

function buildCounts(
  emitted: LineSourceProofRecord[],
  suppressed: SuppressedCandidateLedgerEntry[],
  rewrites: RewriteDowngradeLedgerEntry[],
  missing: MissingExpectedOutputLedgerEntry[],
  conflicts: SourceConflictLedgerEntry[],
  entities: EntityPersonLedgerEntry[],
  surface: SurfaceSafetyLedgerEntry[],
): ProofLedgerPackCounts {
  const meaningful = emitted.filter((l) => l.usefulnessVerdict !== "excluded");
  const emittedUnsupported = meaningful.filter((l) => l.proofChainStatus === "output_unsupported").length;
  return {
    emittedLines: meaningful.length,
    suppressedCandidates: suppressed.length,
    rewritesDowngrades: rewrites.length,
    missingExpectedOutputs: missing.length,
    sourceConflicts: conflicts.length,
    entityRisks: entities.length,
    surfaceSafetyIssues: surface.length,
    positiveCorrect: meaningful.filter((l) => l.usefulnessVerdict === "correct_and_useful").length,
    cleanSourceBacked: meaningful.filter((l) => l.reviewTier === "clean_source_backed").length,
    possibleFalseSuppressions: suppressed.filter((s) => s.proofStatus === "needs_review_possible_false_suppression")
      .length,
    pdfAndTextSupported: meaningful.filter((l) => l.proofChainStatus === "pdf_and_text_support_output").length,
    textOnlySupported: meaningful.filter(
      (l) =>
        l.proofChainStatus === "text_supports_but_pdf_unchecked" ||
        (l.proofChainStatus !== "pdf_and_text_support_output" && l.supportStatus === "supported"),
    ).length,
    emittedUnsupported,
    suppressedUnsupported: suppressed.filter(
      (s) =>
        s.proofStatus === "correctly_suppressed_no_source" ||
        s.proofStatus === "correctly_suppressed_overclaim",
    ).length,
    outputUnsupportedAfterGate: emittedUnsupported,
  };
}

export function buildProofLedger(
  input: ProofLedgerBuildInput,
  rawModels?: ProofLedgerRawModels,
): ProofLedger {
  const meaningful = input.emittedLines.filter((l) => l.usefulnessVerdict !== "excluded");

  const sessionMap = new Map<string, RecordedSuppression>();
  for (const s of input.sessionSuppressions) {
    sessionMap.set(`${s.surface}::${normalizeForMatch(s.candidateText)}`, s);
  }

  let allSuppressions = [...input.sessionSuppressions];
  if (rawModels) {
    const rawStrings = [
      ...collectRawChaseStrings(rawModels.chase),
      ...collectRawWarRoomStrings(rawModels.warRoom),
      ...rawModels.doNotOverstate.map((t) => ({ text: t, surface: "do_not_overstate" })),
    ];
    const diffed = diffRawCandidates(rawStrings, meaningful, input.bundleText, sessionMap);
    allSuppressions = [...allSuppressions, ...diffed];
  }

  for (const line of input.emittedLines) {
    if (line.usefulnessVerdict !== "excluded") continue;
    const isCadTemplate = /\bcad\b|\b999\b|control-room material/i.test(line.outputLine);
    if (
      !isCadTemplate &&
      !line.gedReviewReasons.includes("bundle_does_not_mention_cctv") &&
      !line.gedReviewReasons.includes("bundle_does_not_mention_cad")
    ) {
      continue;
    }
    allSuppressions.push({
      candidateText: line.outputLine,
      sourceFamily: isCadTemplate ? "cad_999" : line.gedReviewReasons.includes("bundle_does_not_mention_cctv") ? "cctv" : "cad_999",
      surface: line.outputSurface,
      reasonSuppressed: "Wrong-family strategic template — not emitted on current papers.",
      searchedTerms: [],
      matchedTerms: [],
      supportingSourceFound: false,
      proofStatus: "correctly_suppressed_no_source",
    });
  }

  const suppressedDedup = new Map<string, SuppressedCandidateLedgerEntry>();
  for (const s of allSuppressions) {
    const key = `${s.surface}::${normalizeForMatch(s.candidateText)}`;
    if (!suppressedDedup.has(key)) {
      suppressedDedup.set(key, {
        ...s,
        plainEnglishNote: plainEnglishForSuppression(s),
        unknownReason: s.unknownReason,
      });
    }
  }
  const suppressedCandidates = [...suppressedDedup.values()];

  const rewriteDedup = new Map<string, RewriteDowngradeLedgerEntry>();
  for (const r of input.sessionRewrites) {
    const key = `${r.surface}::${normalizeForMatch(r.originalCandidate)}`;
    rewriteDedup.set(key, {
      ...r,
      sourceSupport: "bundle presentation gate",
      beforeAfterWording: `Before: ${truncateAtWord(r.originalCandidate, 120)} | After: ${truncateAtWord(r.finalOutput, 120)}`,
      solicitorFriendlyExplanation: plainEnglishForRewrite(r),
    });
  }
  for (const line of meaningful) {
    if (line.humanOutputLine && line.humanOutputLine !== line.outputLine) {
      const key = `audit::${normalizeForMatch(line.outputLine)}`;
      rewriteDedup.set(key, {
        originalCandidate: line.outputLine,
        finalOutput: line.humanOutputLine,
        changeType: "human_label",
        reason: "Human-readable label applied for solicitor review.",
        sourceSupport: line.sourceSnippet?.slice(0, 80) ?? "audit layer",
        beforeAfterWording: `Before: ${line.outputLine.slice(0, 100)} | After: ${line.humanOutputLine.slice(0, 100)}`,
        solicitorFriendlyExplanation: line.humanEvidenceLabel
          ? `Evidence label: ${line.humanEvidenceLabel}`
          : "Output humanised for clarity.",
        surface: line.outputSurface,
      });
    }
  }
  const rewritesDowngrades = [...rewriteDedup.values()];

  const missingExpectedOutputs = buildMissingExpected(input, meaningful);
  const sourceConflicts = buildSourceConflicts(input.bundleText);
  const entityRisks = buildEntityRisks(input.bundleText, meaningful);
  const surfaceSafety = buildSurfaceSafety(meaningful);

  const emittedLines = meaningful.map((line) => ({
    outputLine: humaniseLedgerLine(line.humanOutputLine ?? line.outputLine, input.bundleText, line.humanEvidenceLabel, line.lineCategory),
    surface: line.outputSurface,
    category: line.lineCategory,
    sourceSnippet: line.sourceSnippet,
    evidenceState: line.evidenceState,
    proofChainStatus: line.proofChainStatus,
    verdict: line.verdict,
    reviewTier: line.reviewTier,
    plainEnglishExplanation: plainEnglishForEmitted(line),
  }));

  const pdfTextProofChain = meaningful.map((line) => ({
    outputLine: line.humanOutputLine ?? line.outputLine,
    surface: line.outputSurface,
    pdfPageAvailable: line.pdfPageAvailable,
    extractedSnippet: line.extractedSnippet,
    pageNumber: line.sourcePageNumber,
    proofChainStatus: line.proofChainStatus,
    extractionIssue: line.extractionIssue,
    plainEnglishNote:
      line.proofChainStatus === "pdf_and_text_support_output"
        ? "PDF page and extracted text both support this line."
        : line.proofChainStatus === "text_supports_but_pdf_unchecked"
          ? "Text supports line; PDF page not verified in this pass."
          : line.proofChainStatus === "output_unsupported"
            ? "Output not supported by source — solicitor review required."
            : line.whyThisIsLimited.slice(0, 120),
  }));

  const hotReviewQueue = [
    ...meaningful
      .filter((l) => needsGedReviewList(l.reviewTier))
      .map((l) => ({
        tier: l.reviewTier,
        surface: l.outputSurface,
        outputLine: humaniseLedgerLine(
          l.humanOutputLine ?? l.outputLine,
          input.bundleText,
          l.humanEvidenceLabel,
          l.lineCategory,
        ).slice(0, 150),
        reason: l.gedReviewReasons.join(", ") || plainEnglishForEmitted(l),
      })),
    ...suppressedCandidates
      .filter((s) => s.proofStatus === "needs_review_possible_false_suppression")
      .map((s) => ({
        tier: "solicitor_caution" as const,
        surface: s.surface,
        outputLine: humaniseLedgerLine(s.candidateText, input.bundleText).slice(0, 150),
        reason: `WARNING — possible false suppression: ${s.plainEnglishNote}`,
      })),
  ];

  const solicitorSummary = buildSolicitorSummary(
    input,
    meaningful,
    suppressedCandidates,
    rewritesDowngrades,
    missingExpectedOutputs,
  );

  const counts = buildCounts(
    input.emittedLines,
    suppressedCandidates,
    rewritesDowngrades,
    missingExpectedOutputs,
    sourceConflicts,
    entityRisks,
    surfaceSafety,
  );

  return {
    solicitorSummary,
    hotReviewQueue,
    emittedLines,
    suppressedCandidates,
    rewritesDowngrades,
    missingExpectedOutputs,
    sourceConflicts,
    entityRisks,
    surfaceSafety,
    pdfTextProofChain,
    counts,
  };
}
