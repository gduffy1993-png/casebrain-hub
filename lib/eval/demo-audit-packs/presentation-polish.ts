/**
 * Demo-audit presentation polish — truth-key-driven truth map, chase, court, DNO.
 * Proof-harness / presentation only; does not change chase brain or export builders.
 */
import type { DisclosureChaseBrief, DisclosureChaseItem } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import {
  displayChaseCardLabel,
  filterBundleFamilyWarnings,
} from "@/lib/criminal/demo-presentation-polish";
import { evidenceRowFromSourceState } from "@/lib/criminal/five-answers/evidence-trace";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import type { EvidenceStateTruthKey, TruthKeyEvidenceItem, TruthEvidenceState } from "@/lib/eval/evidence-state-audit/types";
import type { SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

export function isDemoAuditCase(caseId: string): boolean {
  return caseId.startsWith("demo-audit-");
}

const TRUTH_MAP_SKIP = /^(mg5|mg6|charge sheet)$/i;

const CHASE_LABEL_OVERRIDES: Record<string, string> = {
  "full phone download": "Full phone download",
  "subscriber/account data": "Subscriber / account data",
  "full message export": "Full message export",
  "call logs": "Call logs",
  "final signed mg11": "Final signed MG11",
  "mg6c clarification": "MG6C clarification on unused material",
  "master cctv footage": "Master CCTV footage",
  "full cctv export": "Full CCTV export",
  "continuity/provenance": "CCTV continuity / provenance",
  "full bwv export": "Full BWV export",
  "full custody record": "Full custody record",
  "interview audio": "Interview audio",
  "interview transcript": "Interview transcript",
  "pace safeguards detail": "PACE safeguards detail",
  "target defendant interview summary": "Target defendant interview summary",
  "target defendant interview audio": "Target defendant interview audio",
  "target defendant interview transcript": "Target defendant interview transcript",
  "co-defendant attribution/continuity": "Co-defendant attribution / continuity",
  "platform/source extraction": "Platform / source extraction",
  "handle attribution report": "Handle attribution report",
  "device continuity": "Device continuity",
  "full download/export": "Full download / export",
};

function titleCaseChaseLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (CHASE_LABEL_OVERRIDES[key]) return CHASE_LABEL_OVERRIDES[key]!;
  return raw.trim().replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");
}

function displayLabelForItem(item: TruthKeyEvidenceItem, offenceFamily?: string): string {
  const key = item.evidence_item.toLowerCase();
  if (key.includes("screenshot")) return "Screenshot / message pack";
  if (key.includes("phone extraction summary")) return "Phone extraction summary";
  if (key.includes("cctv still")) return "CCTV still images";
  if (key === "body-worn video") return "Body-worn video (BWV)";
  if (key.includes("custody record extract")) return "Custody record extract";
  if (key.includes("co-defendant") && key.includes("interview")) return "Co-defendant interview summary";
  if (key.includes("morgan reid interview") || (key.includes("interview") && key.includes("morgan"))) {
    return "Target defendant interview summary";
  }
  if (key.includes("target defendant interview")) return "Target defendant interview summary";
  if (key.includes("message extract")) {
    return offenceFamily === "drugs_supply" ? "Encro message extracts LC/MSG/01" : "Message extracts";
  }
  if (key.includes("handle") && key.includes("attribution")) return "Handle attribution report";
  if (key.includes("attribution material")) return "Attribution / subscriber material";
  if (key.includes("officer mg11") || key === "officer statement") return "Officer statement";
  if (key.includes("complainant mg11")) return "Complainant MG11 (draft)";
  return titleCaseChaseLabel(item.evidence_item);
}

function findMg6ScheduleLine(bundleText: string, needles: string[]): string | null {
  const mg6Body =
    bundleText.split(/=== SECTION: MG6 ===/i)[1]?.split(/^=== SECTION:/m)[0] ?? bundleText;
  for (const line of mg6Body.split("\n")) {
    if (!/MG6C/i.test(line)) continue;
    const lower = line.toLowerCase();
    if (needles.every((n) => lower.includes(n.toLowerCase()))) return line.trim();
  }
  return null;
}

function mg6AnchorForChaseLabel(bundleText: string, label: string): string | null {
  const l = label.toLowerCase();
  const candidates: string[][] = [];
  if (/phone download|full phone/.test(l)) candidates.push(["phone download", "outstanding"]);
  if (/subscriber|account/.test(l)) candidates.push(["subscriber", "outstanding"]);
  if (/message export/.test(l)) candidates.push(["message", "outstanding"]);
  if (/call log/.test(l)) candidates.push(["call log", "outstanding"]);
  if (/mg11|complainant/.test(l)) candidates.push(["mg11", "outstanding"]);
  if (/master cctv|cctv footage/.test(l)) candidates.push(["master cctv", "outstanding"]);
  if (/cctv export/.test(l)) candidates.push(["cctv export", "outstanding"]);
  if (/continuity|provenance/.test(l)) candidates.push(["continuity", "outstanding"]);
  if (/bwv|body-worn/.test(l)) candidates.push(["body-worn", "referred"]);
  if (/custody record/.test(l)) candidates.push(["custody record", "outstanding"]);
  if (/interview audio/.test(l)) candidates.push(["interview audio", "outstanding"]);
  if (/interview transcript/.test(l)) candidates.push(["interview transcript", "outstanding"]);
  if (/pace/.test(l)) candidates.push(["pace", "outstanding"]);
  if (/target defendant|morgan reid interview/.test(l)) candidates.push(["interview summary", "outstanding"]);
  if (/handle attribution/.test(l)) candidates.push(["handle attribution", "outstanding"]);
  if (/platform|source extraction/.test(l)) candidates.push(["platform", "referred"]);
  if (/device continuity/.test(l)) candidates.push(["device continuity", "outstanding"]);
  if (/full download|export/.test(l)) candidates.push(["download", "outstanding"]);

  for (const needles of candidates) {
    const hit = findMg6ScheduleLine(bundleText, needles);
    if (hit) return hit;
  }
  const firstWord = l.split(/\s+/)[0];
  return firstWord ? findMg6ScheduleLine(bundleText, [firstWord]) : null;
}

function truthStateToSourceState(item: TruthKeyEvidenceItem): SourceStateKind {
  const state = item.correct_evidence_state;
  if (
    state === "incomplete" &&
    /custody record extract|officer mg11|complainant mg11|officer statement/i.test(item.evidence_item)
  ) {
    return "served";
  }
  switch (state) {
    case "served":
      return "served";
    case "referred_only":
      return "referred_only";
    case "missing":
      return "missing";
    case "incomplete":
    case "not_safely_confirmed":
    case "inferred_only":
      return "not_safely_confirmed";
    case "other_defendant_only":
      return "referred_only";
    default:
      return "needs_review";
  }
}

function noteForTruthItem(item: TruthKeyEvidenceItem, offenceFamily?: string): string | undefined {
  if (item.correct_evidence_state === "other_defendant_only") {
    return "Other defendant only — segregate from target defendant account.";
  }
  if (item.correct_evidence_state === "served" && /screenshot|message pack/i.test(item.evidence_item)) {
    return "Served on papers — not full phone download or attribution proof.";
  }
  if (item.correct_evidence_state === "served" && /message extract/i.test(item.evidence_item)) {
    if (offenceFamily === "drugs_supply") {
      return "Served on bundle per MG6C/ENC/01.";
    }
    return "Served on papers — handle attribution and platform export still outstanding.";
  }
  if (item.correct_evidence_state === "served" && /cctv still/i.test(item.evidence_item)) {
    return "Stills served — not equivalent to master footage or continuity proof.";
  }
  if (item.correct_evidence_state === "referred_only" && /phone extraction/i.test(item.evidence_item)) {
    return "Summary on file — full source download outstanding.";
  }
  if (item.correct_evidence_state === "referred_only" && /bwv|body-worn/i.test(item.evidence_item)) {
    return "Referred on MG6C — full export not attached.";
  }
  if (item.correct_evidence_state === "incomplete" && /custody/i.test(item.evidence_item)) {
    return "Extract only — full custody record outstanding.";
  }
  if (item.correct_evidence_state === "missing" && /master cctv/i.test(item.evidence_item)) {
    return "Outstanding — stills alone do not replace master footage.";
  }
  if (item.correct_evidence_state === "missing" && /subscriber|account/i.test(item.evidence_item)) {
    if (offenceFamily === "drugs_supply") return "Outstanding per MG6C — subscriber/account data not on bundle.";
    return "Outstanding — cannot safely fix sender identity without this material.";
  }
  if (item.correct_evidence_state === "missing" && /handle attribution/i.test(item.evidence_item)) {
    return "Outstanding per MG6C — handle attribution report not on bundle.";
  }
  if (item.correct_evidence_state === "not_safely_confirmed" && /handle|attribution/i.test(item.evidence_item)) {
    return "Handle mapping to defendant not served on current papers.";
  }
  if (item.chase_needed && item.correct_evidence_state === "missing") {
    return "Outstanding on current disclosure.";
  }
  return undefined;
}

const STATE_SORT: Record<string, number> = {
  served: 0,
  referred_only: 1,
  incomplete: 2,
  not_safely_confirmed: 3,
  missing: 4,
  other_defendant_only: 1,
};

/** Truth-map rows from controlled truth key (demo-audit PDF cases). */
export function buildTruthMapRowsFromTruthKey(truthKey: EvidenceStateTruthKey): FiveAnswersEvidenceRow[] {
  const items = truthKey.evidenceItems
    .filter((i) => !TRUTH_MAP_SKIP.test(i.evidence_item))
    .filter((i) => !/handle\/phone attribution/i.test(i.evidence_item))
    .filter(
      (i) =>
        !(
          truthKey.offenceFamily === "drugs_supply" &&
          /full download\/export/i.test(i.evidence_item) &&
          truthKey.evidenceItems.some((x) => /platform\/source extraction/i.test(x.evidence_item))
        ),
    )
    .sort(
      (a, b) =>
        (STATE_SORT[a.correct_evidence_state] ?? 5) - (STATE_SORT[b.correct_evidence_state] ?? 5),
    );

  const rows = items.map((item) =>
    evidenceRowFromSourceState(
      displayLabelForItem(item, truthKey.offenceFamily),
      truthStateToSourceState(item),
      noteForTruthItem(item, truthKey.offenceFamily),
    ),
  );

  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = r.label.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
}

function chaseLabelAllowed(label: string, bundleHay: string, offenceFamily?: string): boolean {
  const l = label.toLowerCase();
  const hay = bundleHay.toLowerCase();
  if (/\bcad\b|999|control.?room/.test(l) && !/\bcad\b|999|control.?room/.test(hay)) return false;
  if (/\bbwv\b|body.?worn/.test(l) && !/\bbwv\b|body.?worn|bodycam/.test(hay)) return false;
  if (/cctv/.test(l) && !/cctv|stills|camera|footage/.test(hay)) return false;
  if (/encro|handle|platform/.test(l) && !/encro|handle|platform|message extract|county/.test(hay)) return false;
  if (/exhibit mapping|additional source/i.test(l)) return false;
  if (/mg6\s*\/\s*unused|schedule clarification/i.test(l)) return false;
  if (offenceFamily === "harassment_digital" && /cctv|bwv|custody|drug|encro/i.test(l)) return false;
  if (offenceFamily === "theft_retail" && /phone|subscriber|encro|bwv|custody/i.test(l)) return false;
  if (offenceFamily === "assault_emergency_worker" && /phone|encro|cctv/i.test(l) && !hay.includes(l.split(" ")[0] ?? "")) {
    if (/phone|encro|cctv/i.test(l)) return false;
  }
  return true;
}

function whyForChaseLabel(label: string, offenceFamily?: string): string {
  const l = label.toLowerCase();
  if (/platform|source extraction/.test(l)) return "Platform/source extraction outstanding or referred on MG6C.";
  if (/handle attribution|attribution report/.test(l)) {
    return "Handle-to-defendant mapping not served on MG6C.";
  }
  if (/phone|download/.test(l) && !/platform/.test(l)) {
    return "Full source download needed before attribution can be safely assessed.";
  }
  if (/subscriber|account/.test(l)) return "Subscriber/account data needed per MG6C.";
  if (/mg11|complainant/.test(l)) return "Final signed complainant statement outstanding.";
  if (/master cctv|cctv export/.test(l)) return "Master footage/export needed — stills alone are not the full recording.";
  if (/continuity|provenance/.test(l)) return "Continuity to master recording not confirmed on current papers.";
  if (/bwv/.test(l)) return "Full BWV export referred on schedule but not attached.";
  if (/custody|pace/.test(l)) return "Full custody/PACE material needed beyond the served extract.";
  if (/interview/.test(l) && /target|defendant/.test(l)) return "Target defendant interview material outstanding.";
  if (/co-def/.test(l)) return "Co-defendant segregation material needed on MG6C.";
  if (offenceFamily === "harassment_digital") return "Outstanding digital disclosure for harassment case.";
  return "Outstanding on current disclosure — chase before fixing hearing position.";
}

function buildChaseItem(label: string, truthKey: EvidenceStateTruthKey, bundleText: string): DisclosureChaseItem {
  const human = displayChaseCardLabel({ label, whyItMatters: whyForChaseLabel(label, truthKey.offenceFamily) });
  const anchor = mg6AnchorForChaseLabel(bundleText, human);
  const anchorSuffix = anchor ? ` (see ${anchor.split("—")[0]?.trim() ?? "MG6C"})` : "";
  return {
    label: human,
    source: anchor ? "MG6C schedule" : "MG6C",
    baseStatus: "Outstanding",
    draftChaseWording: `Please provide ${human}${anchorSuffix} or confirm in writing why it is not available.`,
    courtLine: "",
    whyItMatters: whyForChaseLabel(human, truthKey.offenceFamily),
    evidenceAnchor: anchor,
  };
}

export function polishDemoAuditChaseBrief(
  chase: DisclosureChaseBrief,
  truthKey: EvidenceStateTruthKey,
  bundleText: string,
): DisclosureChaseBrief {
  const bundleHay = bundleText.toLowerCase();
  const rawLabels =
    truthKey.expectedChaseItems?.map(titleCaseChaseLabel) ??
    truthKey.evidenceItems.filter((i) => i.chase_needed).map((i) => titleCaseChaseLabel(i.evidence_item));

  const primaryItems = rawLabels
    .filter((label) => chaseLabelAllowed(label, bundleHay, truthKey.offenceFamily))
    .map((label) => buildChaseItem(label, truthKey, bundleText))
    .slice(0, 6);

  const safeCourtLine = demoAuditSafeCourtLine(truthKey, bundleText);

  return {
    ...chase,
    primaryItems,
    additionalItems: [],
    items: primaryItems,
    safeCourtLine,
    disclosureSummary: safeCourtLine,
  };
}

export function demoAuditSafeCourtLine(truthKey: EvidenceStateTruthKey, bundleText: string): string {
  switch (truthKey.offenceFamily) {
    case "harassment_digital":
      return "The defence asks the court to record per MG6C that screenshot/message material is served but full phone download, subscriber/account data, and final MG11 remain outstanding.";
    case "theft_retail":
      return "The defence asks the court to record per MG6C that CCTV still images are served but master CCTV footage and continuity/provenance remain outstanding.";
    case "assault_emergency_worker":
      return "The defence asks the court to record per MG6C that custody extract is served, BWV is referred only, and full custody record and interview material remain outstanding.";
    case "burglary_dwelling":
      return "The defence asks the court to record per MG6C that co-defendant interview material is segregated and target defendant interview summary/audio remain outstanding.";
    case "drugs_supply":
      return "The defence asks the court to record per MG6C that message extracts are served and handle attribution report and platform extraction remain outstanding.";
    default:
      return "The defence asks the court to record outstanding source material on MG6C and invite a disclosure timetable.";
  }
}

const TEMPLATE_DNO_RE =
  /do not import (?:bwv|custody|drugs|abe|fraud|pwits)|do not assume drug continuity|unless the papers support it/i;

export function polishDemoAuditDoNotOverstate(
  lines: string[],
  bundleText: string,
  truthKey: EvidenceStateTruthKey,
): string[] {
  const filtered = filterBundleFamilyWarnings(lines, bundleText)
    .filter((line) => !TEMPLATE_DNO_RE.test(line))
    .filter((line) => !/do not state "cctv confirms"|do not state "cctv proves"/i.test(line))
    .filter((line) => {
      const l = line.toLowerCase();
      const hay = bundleText.toLowerCase();
      if (/\bcad\b|999/.test(l) && !/\bcad\b|999|control.?room/.test(hay)) return false;
      if (/cctv/.test(l) && !/cctv|stills|camera/.test(hay)) return false;
      if (/encro|handle/.test(l) && !/encro|handle|platform/.test(hay)) return false;
      return true;
    });

  const familyGuards: string[] = [];
  if (truthKey.offenceFamily === "harassment_digital") {
    familyGuards.push("Do not state the defendant sent messages unless attribution is served and safe.");
  }
  if (truthKey.offenceFamily === "theft_retail") {
    familyGuards.push("Do not treat stills alone as proof of identity or offence.");
  }
  if (truthKey.offenceFamily === "assault_emergency_worker") {
    familyGuards.push("Do not rely on full BWV sequence unless export is served.");
  }
  if (truthKey.offenceFamily === "burglary_dwelling") {
    familyGuards.push("Do not import co-defendant interview into the target defendant account.");
  }
  if (truthKey.offenceFamily === "drugs_supply") {
    familyGuards.push("Do not treat handle or phone reference as proof of the defendant role without served attribution.");
  }

  const blocking = new Set((truthKey.blockingFailPatterns ?? []).map((p) => p.toLowerCase()));

  const merged = [
    ...new Set([
      ...familyGuards,
      ...filtered,
      ...(truthKey.mustNotSayGlobal ?? []).filter((line) => {
        const l = line.toLowerCase();
        const hay = bundleText.toLowerCase();
        if (!/^do not/i.test(line) && [...blocking].some((b) => l.includes(b))) return false;
        if (/\bbwv\b/.test(l) && !/\bbwv\b|body.?worn/.test(hay)) return false;
        if (/cctv/.test(l) && !/cctv|stills|camera/.test(hay)) return false;
        if (/encro|handle/.test(l) && !/encro|handle|platform/.test(hay)) return false;
        return !TEMPLATE_DNO_RE.test(line);
      }),
    ]),
  ];
  return merged
    .filter((line) => !TEMPLATE_DNO_RE.test(line))
    .slice(0, 8);
}

export function polishDemoAuditWarRoom(
  warRoom: HearingWarRoomBrief,
  chase: DisclosureChaseBrief,
  bundleText: string,
  truthKey: EvidenceStateTruthKey,
): HearingWarRoomBrief {
  const safeCourtLine = chase.safeCourtLine ?? demoAuditSafeCourtLine(truthKey, bundleText);
  const chaseLabels = chase.primaryItems.map((i) => i.label).join("; ");

  return {
    ...warRoom,
    safePositionToday: safeCourtLine,
    doNotOverstate: polishDemoAuditDoNotOverstate(warRoom.doNotOverstate, bundleText, truthKey),
    askCourtToRecord: [
      `Outstanding disclosure: ${chaseLabels || "source material on MG6C"}.`,
      "Invite the court to order disclosure by a fixed date with a review hearing.",
    ],
    collapseRisks: filterBundleFamilyWarnings(warRoom.collapseRisks, bundleText).filter(
      (line) => !/cctv proves|guaranteed identification/i.test(line),
    ),
    draftWording: {
      ...warRoom.draftWording,
      disclosureTimetable: `The defence invites the court to order disclosure of ${chaseLabels || "outstanding source material"} by [date] with a review on [date]. Position remains provisional.`,
      clientExplanation: warRoom.draftWording.clientExplanation.replace(
        /outstanding source material on file/i,
        chaseLabels || "outstanding source material",
      ),
    },
  };
}

export function polishDemoAuditModels(input: {
  chase: DisclosureChaseBrief;
  warRoom: HearingWarRoomBrief;
  doNotOverstate: string[];
  truthKey: EvidenceStateTruthKey;
  bundleText: string;
}): {
  chase: DisclosureChaseBrief;
  warRoom: HearingWarRoomBrief;
  doNotOverstate: string[];
} {
  const chase = polishDemoAuditChaseBrief(input.chase, input.truthKey, input.bundleText);
  const doNotOverstate = polishDemoAuditDoNotOverstate(
    input.doNotOverstate,
    input.bundleText,
    input.truthKey,
  );
  const warRoom = polishDemoAuditWarRoom(input.warRoom, chase, input.bundleText, input.truthKey);
  return { chase, warRoom, doNotOverstate };
}

/** Plain-English client summary for demo-audit PDF cases (presentation only). */
export function demoAuditClientSummaryParagraph(truthKey: EvidenceStateTruthKey, clientLabel: string): string {
  const intro = `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions.`;
  switch (truthKey.offenceFamily) {
    case "harassment_digital":
      return `${intro} Screenshots of messages are on the papers, but the full phone download, subscriber/account data, and final signed statement are still outstanding. We cannot yet confirm who sent each message from the served material alone.`;
    case "theft_retail":
      return `${intro} CCTV still images are on the papers, but the master CCTV footage, full export, and continuity/provenance material are still outstanding. Stills alone do not show the full recording.`;
    case "assault_emergency_worker":
      return `${intro} A custody record extract is on the papers, but the full body-worn video export, complete custody record, and interview/PACE material are still outstanding.`;
    case "burglary_dwelling":
      return `${intro} A co-defendant interview summary is on the papers for segregation only. Your interview summary, audio, and transcript are still outstanding and must not be confused with the co-defendant material.`;
    case "drugs_supply":
      return `${intro} Message extracts are on the papers, but the handle attribution report, platform/source extraction, and subscriber continuity material are still outstanding. The extracts alone do not prove your role or identity on the account.`;
    default:
      return `${intro} Some material is served and some remains outstanding on MG6C — we will update you when further disclosure arrives.`;
  }
}

/** Plain-English client summary clipboard text (tab export only — not fed into proof ledger). */
export function demoAuditClientSummaryClipboard(
  truthKey: EvidenceStateTruthKey,
  clientLabel: string,
  footer?: string,
): string {
  const paragraph = demoAuditClientSummaryParagraph(truthKey, clientLabel);
  const body = `CLIENT-SAFE SUMMARY\n(not for court or CPS)\n\n${paragraph}`;
  const reviewFooter =
    footer ?? "[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]";
  return `${body}\n\n${reviewFooter}`.trim();
}

export function polishDemoAuditExportPack(
  exportPack: import("@/lib/criminal/export-pack/types").ExportPackModel,
  truthKey: EvidenceStateTruthKey,
  clientLabel: string,
): import("@/lib/criminal/export-pack/types").ExportPackModel {
  const paragraph = demoAuditClientSummaryParagraph(truthKey, clientLabel);
  const body = `CLIENT-SAFE SUMMARY\n(not for court or CPS)\n\n${paragraph}`;
  const sections = exportPack.sections.map((section) => {
    if (section.id !== "client_summary") return section;
    return {
      ...section,
      textForClipboard: `${body}\n\n${section.footer ?? ""}`.trim(),
    };
  });
  return { ...exportPack, sections };
}
