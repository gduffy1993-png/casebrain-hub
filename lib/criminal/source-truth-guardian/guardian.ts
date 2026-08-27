import type { DisclosureChaseBrief, DisclosureChaseItem } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterBrief, MatterBriefSection } from "@/components/criminal/workflow/buildMatterBrief";
import { buildSourceTruthFingerprint } from "./fingerprint";
import type {
  GuardianDecision,
  GuardianFlag,
  GuardianSeverity,
  SourceTruthEvidenceCategory,
  SourceTruthEvidenceState,
  SourceTruthGuardianContext,
  SourceTruthGuardianReport,
  SourceTruthSurface,
} from "./types";

const BLOCK: GuardianSeverity = "critical";

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stateAllowsFact(state: SourceTruthEvidenceState | undefined): boolean {
  return state === "served";
}

function stateIsLimited(state: SourceTruthEvidenceState | undefined): boolean {
  return !state || ["absent", "outstanding", "partial", "draft", "unsigned", "referred_only", "unclear"].includes(state);
}

function has(line: string, re: RegExp): boolean {
  return re.test(line);
}

function categoryState(
  ctx: ReturnType<typeof buildSourceTruthFingerprint>,
  category: SourceTruthEvidenceCategory,
): SourceTruthEvidenceState | undefined {
  return ctx.evidence[category];
}

function isChaseOrDisclosureLine(line: string): boolean {
  return /\b(?:outstanding|not\s+served|referred(?:\s+only)?|missing|disclos|chase|(?:ask|asks) the court to record|record that|timetable|please provide|confirm in writing)\b/i.test(
    line,
  );
}

function isSourceMaterialTitle(line: string): boolean {
  return /^[A-Z0-9][A-Za-z0-9 /()&,'-]{2,90}\b(?:report|material|record|transcript|log|data|footage|provenance|schedule|clarification)$/i.test(
    line.trim(),
  );
}

function isSourceSupportedFinalMedicalReportLine(
  line: string,
  fp: ReturnType<typeof buildSourceTruthFingerprint>,
): boolean {
  if (!/\b(?:final\s+)?(?:medical\s*\/\s*forensic|forensic|medical)\s+report\b/i.test(line)) {
    return false;
  }
  const state = categoryState(fp, "medical");
  if (!state || state === "absent") return false;
  return isChaseOrDisclosureLine(line) || isSourceMaterialTitle(line);
}

function criticalReason(line: string, fp: ReturnType<typeof buildSourceTruthFingerprint>): { flag: GuardianFlag; reason: string } | null {
  const lower = line.toLowerCase();

  if (/^In the MG11, the witness states/i.test(line) || /^DEFENCE ACCOUNT:/i.test(line)) {
    return null;
  }
  if (/\bDo not (?:import|state|overstate|rely on|assume)\b/i.test(line)) {
    return null;
  }

  if (
    fp.profile === "digital" &&
    has(lower, /\b(?:bwv|body[-\s]?worn|custody\s+record|drug\s+continuity|lab\s+report)\b/i) &&
    !isChaseOrDisclosureLine(line)
  ) {
    return { flag: "wrong_modality", reason: "Digital fingerprint does not support BWV/custody/drugs modality." };
  }
  if (
    fp.profile === "bwv_custody" &&
    has(lower, /\b(?:phone\s+extraction|device\s+extraction|metadata\s+shows|subscriber\s+data|imei)\b/i) &&
    !fp.evidence.extraction &&
    !isChaseOrDisclosureLine(line)
  ) {
    return { flag: "template_bleed", reason: "Custody/BWV fingerprint does not support digital extraction claims." };
  }
  if (fp.profile !== "sexual" && has(lower, /\babe\b|achieving\s+best\s+evidence/i) && !isChaseOrDisclosureLine(line)) {
    return { flag: "wrong_modality", reason: "ABE wording is not supported by the case fingerprint." };
  }

  if (has(lower, /\bbwv\s+(?:shows|confirms|proves|captures)\b/i) && stateIsLimited(categoryState(fp, "bwv"))) {
    return { flag: "state_contradiction", reason: "BWV is not safely served as a fact source." };
  }
  if (
    has(lower, /\b(?:custody\s+record|custody\s+log).*(?:shows|confirms|proves)|\bsafeguards\s+were\s+followed\b/i) &&
    stateIsLimited(categoryState(fp, "custody"))
  ) {
    return { flag: "state_contradiction", reason: "Custody record is not safely served for affirmative safeguard findings." };
  }
  if (has(lower, /\bmetadata\s+(?:shows|confirms|proves)|\bextraction\s+(?:shows|confirms|proves)\b/i) && stateIsLimited(categoryState(fp, "extraction"))) {
    return { flag: "state_contradiction", reason: "Extraction/metadata is not safely served as a fact source." };
  }
  if (has(lower, /\bmg11\b.*\b(?:confirms|proves|establishes|is consistent)\b/i) && stateIsLimited(categoryState(fp, "mg11"))) {
    return { flag: "state_contradiction", reason: "MG11 is not safely final/served for affirmative witness findings." };
  }

  if (has(lower, /\b(?:he|she|the defendant|client)\s+(?:assaulted|caused the injury|sent the messages|controlled her|controlled him)\b/i)) {
    return { flag: "guilt_assertion", reason: "Guilt or actus assertion surfaced as fact." };
  }
  if (
    has(lower, /\b(?:second cctv angle|additional bwv clip|new witness|forensic report|metadata timeline)\b/i) &&
    !isSourceSupportedFinalMedicalReportLine(line, fp)
  ) {
    return { flag: "invented_evidence", reason: "Line refers to an evidence category/asset not established by fingerprint." };
  }
  if (has(lower, /\binjury\s+consistent\s+with\s+assault\b/i) && !stateAllowsFact(categoryState(fp, "medical"))) {
    return { flag: "off_papers_fact", reason: "Medical causation assertion is not supported by served medical material." };
  }

  return null;
}

function rewriteMajor(line: string, fp: ReturnType<typeof buildSourceTruthFingerprint>): { text: string; flag: GuardianFlag; reason: string } | null {
  if (/^DEFENCE ACCOUNT:/i.test(line)) return null;
  if (/\bofficer\s+grabbed\s+(?:first|him|her)\b/i.test(line)) {
    return {
      text: `DEFENCE ACCOUNT: The defendant says ${line.charAt(0).toLowerCase()}${line.slice(1).replace(/\.$/, "")}.`,
      flag: "defence_account_relabelled",
      reason: "Defence account was stated as fact.",
    };
  }
  if (/\bwitness\s+confirms\b/i.test(line)) {
    return {
      text: line.replace(/\bwitness\s+confirms\b/i, "In the MG11, the witness states"),
      flag: "witness_account_softened",
      reason: "Witness account was overstated.",
    };
  }
  if (/\b(?:will|would)\s+(?:prove|confirm|establish)\b/i.test(line)) {
    return {
      text: line.replace(/\b(?:will|would)\s+(?:prove|confirm|establish)\b/gi, "may be relied on to suggest"),
      flag: "overstrong_inference_softened",
      reason: "Future evidential inference was too strong.",
    };
  }
  if (/case\s+is\s+weak\b/i.test(line)) {
    return {
      text: "On the current papers, the defence cannot safely assess the strength of the case.",
      flag: "overstrong_inference_softened",
      reason: "Provisional opinion was too strong.",
    };
  }
  if (/drug\s+continuity/i.test(line) && fp.profile !== "drugs" && !fp.evidence.drugs) {
    return {
      text: "",
      flag: "template_bleed",
      reason: "Drugs continuity wording bled into a non-drugs fingerprint.",
    };
  }
  return null;
}

function isTruncated(line: string): boolean {
  const t = line.trim();
  if (t.length < 60) return false;
  if (/[.!?:;)]$/.test(t)) return false;
  return /\b(?:and|or|the|a|to|with|against|pending|because|if|where)$/i.test(t) || t.length > 220;
}

function decision(
  original: string,
  final: string | null,
  surface: SourceTruthSurface,
  severity: GuardianSeverity,
  flags: GuardianFlag[],
  reason: string,
): GuardianDecision {
  return { original, final, surface, severity, flags, reason };
}

export function guardSourceTruthLines(
  lines: string[],
  ctx: SourceTruthGuardianContext,
  fallback?: string,
): { lines: string[]; report: SourceTruthGuardianReport } {
  const fp = buildSourceTruthFingerprint({ bundleText: ctx.bundleText, ledger: ctx.ledger });
  const out: string[] = [];
  const seen = new Set<string>();
  const decisions: GuardianDecision[] = [];

  for (const raw of lines) {
    const line = compact(raw);
    if (!line) continue;

    const critical = criticalReason(line, fp);
    if (critical) {
      decisions.push(decision(line, null, ctx.surface, BLOCK, [critical.flag], critical.reason));
      continue;
    }

    if (/\bMG6C?:?\s*(?:Unused Material Schedule|Disclosure Schedule)\b/i.test(line)) {
      decisions.push(decision(line, null, ctx.surface, "minor", ["mg6c_header_removed"], "MG6C heading is not a chase/content item."));
      continue;
    }

    const major = rewriteMajor(line, fp);
    if (major?.text === "") {
      decisions.push(decision(line, null, ctx.surface, "major", [major.flag], major.reason));
      continue;
    }

    let final = major?.text ? compact(major.text) : line;
    if (major) {
      decisions.push(decision(line, final, ctx.surface, "major", [major.flag], major.reason));
    }

    if (isTruncated(final)) {
      decisions.push(decision(line, null, ctx.surface, "minor", ["truncated"], "Line appears truncated."));
      continue;
    }

    const key = final.toLowerCase();
    if (seen.has(key)) {
      decisions.push(decision(line, null, ctx.surface, "minor", ["duplicate"], "Duplicate solicitor-facing line."));
      continue;
    }
    seen.add(key);
    out.push(final);
  }

  if (out.length === 0 && fallback) {
    out.push(fallback);
    decisions.push(decision("", fallback, ctx.surface, "fallback", ["fallback_applied"], "Surface would otherwise be empty."));
  }

  return { lines: out, report: buildReport(fp, decisions) };
}

function mergeReports(...reports: SourceTruthGuardianReport[]): SourceTruthGuardianReport {
  const first = reports[0];
  if (!first) {
    return buildReport(buildSourceTruthFingerprint({}), []);
  }
  const decisions = reports.flatMap((r) => r.decisions);
  const flags = [...new Set(decisions.flatMap((d) => d.flags))];
  return {
    fingerprint: first.fingerprint,
    decisions,
    flags,
    blockedCount: decisions.filter((d) => d.final === null).length,
    rewrittenCount: decisions.filter((d) => d.final !== null && d.severity === "major").length,
    fallbackCount: decisions.filter((d) => d.flags.includes("fallback_applied")).length,
  };
}

function toDecisionSummary(decision: GuardianDecision): SourceTruthGuardianReport["decisions"][number] {
  const { original: _original, ...summary } = decision;
  return summary;
}

function buildReport(
  fingerprint: ReturnType<typeof buildSourceTruthFingerprint>,
  decisions: GuardianDecision[],
): SourceTruthGuardianReport {
  const flags = [...new Set(decisions.flatMap((d) => d.flags))];
  return {
    fingerprint,
    decisions: decisions.map(toDecisionSummary),
    flags,
    blockedCount: decisions.filter((d) => d.final === null).length,
    rewrittenCount: decisions.filter((d) => d.final !== null && d.original !== d.final).length,
    fallbackCount: decisions.filter((d) => d.flags.includes("fallback_applied")).length,
  };
}

export function guardHearingWarRoomBrief(
  brief: HearingWarRoomBrief,
  ctx: Omit<SourceTruthGuardianContext, "surface">,
): HearingWarRoomBrief {
  const base = { ...ctx, surface: "today" as const };
  const safe = guardSourceTruthLines(
    [brief.safePositionToday],
    base,
    "On the current papers, the defence cannot safely advance a final position. Key material is outstanding. The court is asked to record this and set a timetable.",
  );
  const say = guardSourceTruthLines(brief.sayThis, base, safe.lines[0]);
  const over = guardSourceTruthLines(brief.doNotOverstate, base);
  const record = guardSourceTruthLines(brief.askCourtToRecord, base);
  const instructions = guardSourceTruthLines(brief.instructionsNeeded, base);
  const moves = guardSourceTruthLines(brief.nextHearingMoves, base);
  const anchors = guardSourceTruthLines(brief.evidenceAnchors, base);
  const risks = guardSourceTruthLines(brief.collapseRisks, base);
  const disclosureTimetable = guardSourceTruthLines([brief.draftWording.disclosureTimetable], base);
  const adjournment = guardSourceTruthLines([brief.draftWording.adjournment], base);
  const clientExplanation = guardSourceTruthLines([brief.draftWording.clientExplanation], base);
  const report = mergeReports(
    safe.report,
    say.report,
    over.report,
    record.report,
    instructions.report,
    moves.report,
    anchors.report,
    risks.report,
    disclosureTimetable.report,
    adjournment.report,
    clientExplanation.report,
  );

  return {
    ...brief,
    safePositionToday: safe.lines[0] ?? brief.safePositionToday,
    sayThis: say.lines,
    doNotOverstate: over.lines,
    askCourtToRecord: record.lines,
    instructionsNeeded: instructions.lines,
    nextHearingMoves: moves.lines,
    evidenceAnchors: anchors.lines,
    collapseRisks: risks.lines,
    draftWording: {
      disclosureTimetable: disclosureTimetable.lines[0] ?? brief.draftWording.disclosureTimetable,
      adjournment: adjournment.lines[0] ?? brief.draftWording.adjournment,
      clientExplanation: clientExplanation.lines[0] ?? brief.draftWording.clientExplanation,
    },
    sourceTruthGuardian: report,
  } as HearingWarRoomBrief;
}

function guardChaseItem(
  item: DisclosureChaseItem,
  ctx: Omit<SourceTruthGuardianContext, "surface">,
): { item: DisclosureChaseItem | null; report: SourceTruthGuardianReport } {
  const base = { ...ctx, surface: "chase" as const };
  const modalityHay = [
    ctx.bundleText ?? "",
    item.evidenceAnchor ?? "",
    item.whyItMatters ?? "",
    item.draftChaseWording ?? "",
    ...(item.mergedFrom ?? []),
  ].join("\n");
  const sourceCorrectedItem =
    item.familyId === "interview" &&
    /\binterview\s+recording\b/i.test(item.label) &&
    (/\bmaterial\s+still\s+needed\s*:?.{0,160}\b(?:interview\s+)?transcript\b/i.test(modalityHay) ||
      /\b(?:interview\s+)?transcript\b.{0,100}\b(?:not\s+in\s+this\s+section|not\s+(?:served|included|attached|provided|on\s+file)|missing|outstanding)\b/i.test(
        modalityHay,
      )) &&
    !/\binterview\s+recording\s*\/\s*transcript\b|\binterview\s+recording\b.{0,100}\b(?:not\s+(?:served|included|attached|provided)|missing|outstanding)\b/i.test(
      modalityHay,
    )
      ? {
          ...item,
          label: "Interview transcript",
          draftChaseWording:
            item.baseStatus === "Not safely confirmed"
              ? "Please confirm the current status of the interview transcript before it is relied on."
              : "Please provide the interview transcript, or confirm in writing why it is not available.",
        }
      : item;
  const label = guardSourceTruthLines([sourceCorrectedItem.label], base);
  if (!label.lines[0]) return { item: null, report: label.report };
  const why = guardSourceTruthLines([sourceCorrectedItem.whyItMatters], base);
  const draft = guardSourceTruthLines([sourceCorrectedItem.draftChaseWording], base);
  const courtFallback =
    sourceCorrectedItem.baseStatus === "Not safely confirmed"
      ? "The defence asks the court to record that this material needs confirmation before it is relied on."
      : "The defence asks the court to record this material as outstanding.";
  const court = guardSourceTruthLines(
    [sourceCorrectedItem.courtLine],
    base,
    courtFallback,
  );
  const guardedCourtLine = court.lines[0] ?? courtFallback;
  const courtLine =
    sourceCorrectedItem.baseStatus === "Not safely confirmed" &&
    /\b(?:appears|remain(?:s)?|is|are)\s+(?:missing|outstanding|overdue)\b|\bdue\s+soon\b|\boverdue\b|\bdisclosed\s+on\s+a\s+timetable\b/i.test(
      guardedCourtLine,
    )
      ? courtFallback
      : guardedCourtLine;
  const anchor = sourceCorrectedItem.evidenceAnchor ? guardSourceTruthLines([sourceCorrectedItem.evidenceAnchor], base) : null;
  return {
    item: {
      ...sourceCorrectedItem,
      label: label.lines[0],
      whyItMatters: why.lines[0] ?? sourceCorrectedItem.whyItMatters,
      draftChaseWording: draft.lines[0] ?? sourceCorrectedItem.draftChaseWording,
      courtLine,
      evidenceAnchor: anchor ? anchor.lines[0] ?? null : sourceCorrectedItem.evidenceAnchor,
    },
    report: mergeReports(label.report, why.report, draft.report, court.report, ...(anchor ? [anchor.report] : [])),
  };
}

function guardedChaseSummary(primaryCount: number, totalCount: number): string {
  if (primaryCount > 0) {
    return `${primaryCount} priority chase item${primaryCount === 1 ? "" : "s"} — source-material review`;
  }
  if (totalCount === 0) return "No source-material chase items safely detected";
  if (totalCount === 1) return "1 grouped chase item — provisional";
  return `${totalCount} grouped chase items — provisional`;
}

function guardedChaseCounters(items: DisclosureChaseItem[]): DisclosureChaseBrief["counters"] {
  const counters: DisclosureChaseBrief["counters"] = {
    total: items.length,
    overdue: 0,
    dueSoon: 0,
    chased: 0,
    received: 0,
    notStarted: 0,
  };
  for (const item of items) {
    if (item.baseStatus === "Overdue") counters.overdue += 1;
    else if (item.baseStatus === "Due soon") counters.dueSoon += 1;
    else if (item.baseStatus === "Chased") counters.chased += 1;
    else if (item.baseStatus === "Received") counters.received += 1;
    else counters.notStarted += 1;
  }
  return counters;
}

export function guardDisclosureChaseBrief(
  brief: DisclosureChaseBrief,
  ctx: Omit<SourceTruthGuardianContext, "surface">,
): DisclosureChaseBrief {
  const safeCourt = guardSourceTruthLines([brief.safeCourtLine], { ...ctx, surface: "chase" });
  const guarded = brief.items.map((item) => guardChaseItem(item, ctx));
  const items = guarded.map((g) => g.item).filter((item): item is DisclosureChaseItem => Boolean(item));
  const primaryIds = new Set(brief.primaryItems.map((i) => i.id));
  const primaryItems = items.filter((i) => primaryIds.has(i.id));
  const additionalItems = items.filter((i) => !primaryIds.has(i.id));
  const fallback = items.length === 0
    ? guardSourceTruthLines(["MG6C / disclosure schedule clarification"], { ...ctx, surface: "chase" }, "MG6C / disclosure schedule clarification")
    : null;
  const report = mergeReports(safeCourt.report, ...guarded.map((g) => g.report), ...(fallback ? [fallback.report] : []));

  return {
    ...brief,
    safeCourtLine: safeCourt.lines[0] ?? brief.safeCourtLine,
    items,
    primaryItems,
    additionalItems,
    disclosureSummary: guardedChaseSummary(primaryItems.length, items.length),
    counters: guardedChaseCounters(items),
    sourceTruthGuardian: report,
  } as DisclosureChaseBrief;
}

function guardSection(section: MatterBriefSection, ctx: Omit<SourceTruthGuardianContext, "surface">): {
  section: MatterBriefSection;
  report: SourceTruthGuardianReport;
} {
  const base = { ...ctx, surface: "summary" as const };
  const paragraph = section.paragraph ? guardSourceTruthLines([section.paragraph], base) : null;
  const bullets = section.bullets ? guardSourceTruthLines(section.bullets, base) : null;
  return {
    section: {
      ...section,
      paragraph: paragraph ? paragraph.lines[0] : section.paragraph,
      bullets: bullets ? bullets.lines : section.bullets,
    },
    report: mergeReports(...[paragraph?.report, bullets?.report].filter((r): r is SourceTruthGuardianReport => Boolean(r))),
  };
}

export function guardMatterBrief(
  brief: MatterBrief,
  ctx: Omit<SourceTruthGuardianContext, "surface">,
): MatterBrief {
  const guardedSections = brief.sections.map((section) => guardSection(section, ctx));
  const courtDay = guardSourceTruthLines([brief.courtDayNote], { ...ctx, surface: "summary" });
  const sections = guardedSections.map((g) => g.section);
  const plainText = [
    ...sections.map((s) => [s.title, s.paragraph ?? "", ...(s.bullets?.map((b) => `• ${b}`) ?? [])].filter(Boolean).join("\n")),
    courtDay.lines[0] ?? brief.courtDayNote,
  ].join("\n\n");

  return {
    ...brief,
    sections,
    courtDayNote: courtDay.lines[0] ?? brief.courtDayNote,
    plainText,
    sourceTruthGuardian: mergeReports(...guardedSections.map((g) => g.report), courtDay.report),
  } as MatterBrief;
}

export function lintSourceTruthSurfaceText(input: {
  text: string;
  bundleText?: string | null;
  surface?: SourceTruthSurface;
}): SourceTruthGuardianReport["decisions"] {
  return guardSourceTruthLines(input.text.split(/\n+/), {
    bundleText: input.bundleText,
    surface: input.surface ?? "unknown",
  }).report.decisions.filter((d) => d.severity === "critical" && d.final === null);
}
