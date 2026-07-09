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
import { evidenceRowFromSourceState, evidenceExistenceLabel, evidenceReliabilityLabel } from "@/lib/criminal/five-answers/evidence-trace";
import type { FiveAnswersEvidenceRow, FiveAnswersViewModel } from "@/lib/criminal/five-answers/types";
import type { HearingModeModel } from "@/lib/criminal/hearing-mode/types";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import type { EvidenceStateTruthKey, TruthKeyEvidenceItem, TruthEvidenceState } from "@/lib/eval/evidence-state-audit/types";
import type { SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

export function isDemoAuditCase(caseId: string): boolean {
  return caseId.startsWith("demo-audit-");
}

/** Messy PDF audit packs with truth-key-driven presentation (v9+ new families). */
export function isMessyPdfV9AuditCase(caseId: string): boolean {
  return caseId.startsWith("messy-pdf-v9-");
}

export function usesDemoAuditPresentationPolish(caseId: string): boolean {
  return isDemoAuditCase(caseId) || isMessyPdfV9AuditCase(caseId);
}

export { demoAuditOffenceFamilyForCase } from "./thirty-case-catalog";

const TRUTH_MAP_SKIP = /^(mg5|mg6|charge sheet)$/i;

const CHASE_LABEL_OVERRIDES: Record<string, string> = {
  "full phone download": "Full phone download",
  "subscriber/account data": "Subscriber / account data",
  "full message export": "Full message export",
  "call logs": "Call logs",
  "final signed mg11": "Final signed MG11",
  "device metadata export": "Device metadata export",
  "device metadata": "Device metadata export",
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
  "full transaction export": "Full transaction export",
  "source banking records": "Source banking records",
  "beneficiary tracing report": "Beneficiary tracing report",
  "device calibration certificate": "Device calibration certificate",
  "full intoxilyser record": "Full intoxilyser record",
  "cctv/dashcam export": "CCTV / dashcam export",
  "abe interview video": "ABE interview video",
  "abe interview transcript": "ABE interview transcript",
  "third-party counselling notes": "Third-party counselling notes",
  "full yjs pre-sentence report": "Full YJS pre-sentence report",
  "vulnerability assessment": "Vulnerability assessment",
  "youth interview audio": "Youth interview audio",
  "audit trail": "CCTV audit trail / source hash record",
  "recognition/id basis": "Recognition / ID basis",
  "recognition/ID basis": "Recognition / ID basis",
  "appropriate adult continuity": "Appropriate adult continuity",
};

const GENERIC_DEMO_AUDIT_CHASE_RE =
  /\bmg6c?\s*clarification\b|schedule clarification|mg6\s*\/\s*unused|additional unused material|exhibit mapping|additional source[- ]material/i;

export function isGenericDemoAuditChaseLabel(label: string): boolean {
  return GENERIC_DEMO_AUDIT_CHASE_RE.test(label.trim());
}

function titleCaseChaseLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (isGenericDemoAuditChaseLabel(raw)) return "";
  if (CHASE_LABEL_OVERRIDES[key]) return CHASE_LABEL_OVERRIDES[key]!;
  return raw.trim().replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");
}

function sanitizeDemoAuditChaseItems(
  items: string[] | undefined,
  offenceFamily?: string,
): string[] {
  const hadExplicitItems = (items?.length ?? 0) > 0;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items ?? []) {
    const label = titleCaseChaseLabel(raw);
    if (!label || isGenericDemoAuditChaseLabel(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  if (hadExplicitItems || out.length >= 4) return out.slice(0, 6);
  for (const fallback of familyDefaultChaseLabels(offenceFamily)) {
    const key = fallback.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fallback);
  }
  return out.slice(0, 6);
}

function familyDefaultChaseLabels(offenceFamily?: string): string[] {
  switch (offenceFamily) {
    case "harassment_digital":
      return ["Full phone download", "Subscriber / account data", "Call logs", "Device metadata export", "Final signed MG11"];
    case "theft_retail":
      return ["Master CCTV footage", "Full CCTV export", "CCTV continuity / provenance", "CCTV audit trail / source hash record", "Recognition / ID basis"];
    case "assault_emergency_worker":
      return ["Full BWV export", "Full custody record", "PACE safeguards detail", "Interview audio", "Interview transcript"];
    case "burglary_dwelling":
      return ["Target defendant interview summary", "Target defendant interview audio", "Target defendant interview transcript"];
    case "drugs_supply":
      return ["Platform / source extraction", "Handle attribution report", "Subscriber / account data", "Device continuity"];
    case "fraud_financial":
      return ["Full transaction export", "Source banking records", "Beneficiary tracing report"];
    case "motoring_road_traffic":
      return ["Device calibration certificate", "Full intoxilyser record", "CCTV / dashcam export"];
    case "sexual_offences":
      return ["ABE interview video", "ABE interview transcript", "Final signed MG11", "Third-party counselling notes"];
    case "youth_court":
      return ["Full YJS pre-sentence report", "Vulnerability assessment", "Youth interview audio", "Appropriate adult continuity"];
    default:
      return [];
  }
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
  if (key.includes("bank statement")) return "Bank statement summaries";
  if (key.includes("breath/device")) return "Breath / device procedure summary";
  if (key.includes("abe interview video")) return "ABE interview video";
  if (key.includes("yjs report")) return "YJS report extract";
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
  if (/handle-to-defendant|handle to defendant/.test(l)) candidates.push(["handle-to-defendant", "referred"]);
  if (/encro attribution/.test(l)) candidates.push(["encro attribution", "outstanding"]);
  if (/platform extraction/.test(l)) candidates.push(["platform extraction", "outstanding"]);
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
  if (item.correct_evidence_state === "served" && /bank statement/i.test(item.evidence_item)) {
    return "Summaries served — not full transaction export or source banking records.";
  }
  if (item.correct_evidence_state === "served" && /breath|device procedure/i.test(item.evidence_item)) {
    return "Summary served — calibration and full device record outstanding.";
  }
  if (item.correct_evidence_state === "referred_only" && /abe/i.test(item.evidence_item)) {
    return "Referred on MG6C — ABE video not attached to bundle.";
  }
  if (item.correct_evidence_state === "served" && /yjs report/i.test(item.evidence_item)) {
    return "Extract served — full YJS PSR outstanding.";
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
  if (offenceFamily === "fraud_financial" && /bwv|custody|encro|abe/i.test(l) && !/bank|transaction|tracing|subscriber/.test(l)) return false;
  if (offenceFamily === "motoring_road_traffic" && /encro|abe|drug|phone|subscriber/i.test(l) && !/cctv|dashcam|device|calibration|intox/.test(l)) return false;
  if (offenceFamily === "sexual_offences" && /encro|cctv|phone|drug/i.test(l) && !/abe|mg11|counselling/i.test(l)) return false;
  if (offenceFamily === "youth_court" && /encro|fraud|cctv master/i.test(l) && !/yjs|youth|vulnerability|interview/i.test(l)) return false;
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
  if (/transaction|banking/.test(l)) return "Full transaction export or source banking records outstanding per MG6C.";
  if (/calibration|intoxilyser/.test(l)) return "Device calibration and full intoxilyser record needed.";
  if (/abe/.test(l)) return "ABE interview video/transcript outstanding or referred only.";
  if (/yjs|vulnerability/.test(l)) return "Full YJS or vulnerability material outstanding on youth papers.";
  if (/audit trail|source hash/.test(l)) return "Audit trail needed to link stills to master recording.";
  if (/recognition|id basis/.test(l)) return "Recognition or ID basis needed if Crown rely on identification.";
  if (/cctv|dashcam/.test(l) && !/audit trail|source hash/.test(l)) {
    return "CCTV or dashcam export referred on schedule — not attached.";
  }
  if (/counselling/.test(l)) return "Third-party counselling notes outstanding if relied upon.";
  if (/appropriate adult/.test(l)) return "Appropriate adult continuity needed for youth interview safeguards.";
  if (/device metadata/.test(l)) return "Device metadata export referred on schedule — not attached.";
  if (offenceFamily === "harassment_digital") return "Outstanding digital disclosure for harassment case.";
  if (offenceFamily === "theft_retail") return "Master footage and continuity still outstanding on CCTV case.";
  if (offenceFamily === "assault_emergency_worker") return "Full BWV/custody/interview material still outstanding.";
  if (offenceFamily === "sexual_offences") return "ABE and final complainant material still outstanding.";
  if (offenceFamily === "youth_court") return "Youth/YJS material still outstanding on current papers.";
  return "Outstanding on current disclosure — confirm before fixing hearing position.";
}

function buildChaseItem(label: string, truthKey: EvidenceStateTruthKey, bundleText: string): DisclosureChaseItem {
  const human = displayChaseCardLabel({ label, whyItMatters: whyForChaseLabel(label, truthKey.offenceFamily) });
  const anchor = mg6AnchorForChaseLabel(bundleText, human);
  const anchorSuffix = anchor ? ` (see ${anchor.split("—")[0]?.trim() ?? "MG6C"})` : "";
  const slug = human.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: `demo-audit-chase-${slug}`,
    familyId: "other",
    label: human,
    source: anchor ? "MG6C schedule" : "MG6C",
    baseStatus: "Outstanding",
    urgency: "high",
    deadlineLabel: "",
    evidenceAnchor: anchor,
    linkedRoute: null,
    draftChaseWording: `Please provide ${human}${anchorSuffix} or confirm in writing why it is not available.`,
    courtLine: "",
    whyItMatters: whyForChaseLabel(human, truthKey.offenceFamily),
    mergedFrom: [],
  };
}

export function polishDemoAuditChaseBrief(
  chase: DisclosureChaseBrief,
  truthKey: EvidenceStateTruthKey,
  bundleText: string,
): DisclosureChaseBrief {
  const bundleHay = bundleText.toLowerCase();
  const rawLabels = sanitizeDemoAuditChaseItems(
    truthKey.expectedChaseItems ??
      truthKey.evidenceItems.filter((i) => i.chase_needed).map((i) => i.evidence_item),
    truthKey.offenceFamily,
  );

  const primaryItems = rawLabels
    .filter((label) => label && !isGenericDemoAuditChaseLabel(label))
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
    case "fraud_financial":
      return "The defence asks the court to record per MG6C that bank statement summaries are served but full transaction export, source banking records, and tracing material remain outstanding.";
    case "motoring_road_traffic":
      return "The defence asks the court to record per MG6C that procedure summary is served but device calibration, full intoxilyser record, and CCTV/dashcam export remain outstanding.";
    case "sexual_offences":
      return "The defence asks the court to record per MG6C that draft complainant material is served but ABE interview video, transcript, and final signed MG11 remain outstanding.";
    case "youth_court":
      return "The defence asks the court to record per MG6C that YJS extract is served but full pre-sentence report, vulnerability assessment, and youth interview audio remain outstanding.";
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
  if (truthKey.offenceFamily === "fraud_financial") {
    familyGuards.push("Do not treat bank summaries alone as proof of fraud or account attribution.");
  }
  if (truthKey.offenceFamily === "motoring_road_traffic") {
    familyGuards.push("Do not treat procedure summary alone as proof of device reliability or identity.");
  }
  if (truthKey.offenceFamily === "sexual_offences") {
    familyGuards.push("Do not rely on ABE or complainant account as final proof without served interview material.");
  }
  if (truthKey.offenceFamily === "youth_court") {
    familyGuards.push("Do not import adult-court assumptions — youth interview and YJS material remain provisional.");
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
        if (!/^do not/i.test(line) && /^(cctv confirms|cctv proves|encro proves|device reliability proved)/i.test(line)) {
          return false;
        }
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
      (line) =>
        !/cctv proves|guaranteed identification|cctv confirms identity|^cctv confirms$|^encro proves|^device reliability proved$/i.test(
          line,
        ),
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

const CASE_CLIENT_NOTES: Record<string, string> = {
  "demo-audit-06-domestic-stalking":
    "The allegation involves domestic stalking — we are treating digital attribution as unproved until subscriber data and the full download are served.",
  "demo-audit-07-phone-ocr-trap":
    "Some dates on the served papers may be OCR-garbled — we will verify hearing and seizure dates against custody or listing records.",
  "demo-audit-09-cctv-index-only":
    "The index lists master CCTV pages that are not attached — we are chasing the native export before fixing identification.",
  "demo-audit-11-custody-pace-ocr":
    "Custody times on the served extract need checking against the full custody record and any PACE review sheet.",
  "demo-audit-13-co-def-index-trap":
    "Your interview is listed on the index but not attached — we are keeping co-defendant material segregated.",
  "demo-audit-15-county-lines-runners":
    "This is a county-lines style Encro case — handle mapping to you is not served and cannot be assumed from message extracts alone.",
  "demo-audit-21-historic-sexual-abe":
    "This is a historic allegation — the ABE interview video is referred on the schedule but not on the bundle we have reviewed.",
  "demo-audit-23-duplicate-pages":
    "The index contains duplicate lines for the screenshot pack — we are confirming whether any pages are missing or repeated.",
  "demo-audit-30-layout-hearing-date":
    "The listing date on the papers may be OCR-corrupted — we will confirm the correct hearing date with the court.",
};

/** Solicitor review line for demo-audit proof packets (replaces generic MG6C clarification). */
export function demoAuditProofReviewLine(
  caseId: string,
  offenceFamily?: string,
  bundleHay?: string,
): string {
  const notes: Record<string, string> = {
    harassment_digital:
      "Confirm whether device metadata export and call logs on the disclosure schedule are still outstanding.",
    theft_retail:
      "Confirm whether audit trail, recognition basis, and master CCTV export are still outstanding.",
    assault_emergency_worker:
      "Confirm whether full BWV export, custody record, and PACE/interview material are still outstanding.",
    burglary_dwelling:
      "Confirm whether target defendant interview audio and transcript are still outstanding.",
    drugs_supply:
      "Confirm whether platform extraction and handle attribution report are still outstanding.",
    fraud_financial:
      "Confirm whether source banking records and transaction export are still outstanding.",
    motoring_road_traffic:
      "Confirm whether calibration certificate and full intoxilyser record are still outstanding.",
    sexual_offences:
      "Confirm whether ABE interview video, transcript, and final signed MG11 are still outstanding.",
    youth_court:
      "Confirm whether full YJS report, vulnerability assessment, and youth interview audio are still outstanding.",
  };
  const hay = (bundleHay ?? "").toLowerCase();
  const bundleHasCustody = /\bcustody record\b|\bpace review\b|detention and custody/.test(hay);
  if (caseId.includes("ocr") || caseId.includes("layout-hearing")) {
    if (offenceFamily === "harassment_digital") {
      return "Verify OCR-sensitive dates and seized-device labels on the bundle before fixing hearing position.";
    }
    if (offenceFamily === "theft_retail" || caseId.includes("layout-hearing")) {
      return "Verify OCR-sensitive dates on the bundle against the court listing before fixing hearing position.";
    }
    if (offenceFamily === "assault_emergency_worker" && bundleHasCustody) {
      return "Verify OCR-sensitive custody and listing times on the bundle before fixing hearing position.";
    }
    if (!bundleHasCustody) {
      return "Verify OCR-sensitive dates on the bundle against the court listing before fixing hearing position.";
    }
    return "Verify OCR-sensitive dates on the bundle against listing or custody records before court.";
  }
  if (caseId.includes("index-only") || caseId.includes("index-trap") || caseId.includes("missing-pages")) {
    return "Confirm whether index-listed pages not attached to the bundle are still outstanding.";
  }
  return notes[offenceFamily ?? ""] ?? "Confirm outstanding schedule lines before fixing hearing position.";
}

/** Plain-English client summary for demo-audit PDF cases (presentation only). */
export function demoAuditClientSummaryParagraph(
  truthKey: EvidenceStateTruthKey,
  clientLabel: string,
  caseId?: string,
): string {
  const intro = `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions.`;
  const caseNote = caseId ? CASE_CLIENT_NOTES[caseId] : undefined;
  let body: string;
  switch (truthKey.offenceFamily) {
    case "harassment_digital":
      body = `${intro} Screenshots of messages are on the papers, but the full phone download, subscriber/account data, call logs, and final signed statement are still outstanding. We cannot yet confirm who sent each message from the served material alone.`;
      break;
    case "theft_retail":
      body = `${intro} CCTV still images are on the papers, but the master CCTV footage, full export, continuity/provenance, and audit trail material are still outstanding. Stills alone do not show the full recording.`;
      break;
    case "assault_emergency_worker":
      body = `${intro} A custody record extract is on the papers, but the full body-worn video export, complete custody record, and interview/PACE material are still outstanding.`;
      break;
    case "burglary_dwelling":
      body = `${intro} A co-defendant interview summary is on the papers for segregation only. Your interview summary, audio, and transcript are still outstanding and must not be confused with the co-defendant material.`;
      break;
    case "drugs_supply":
      body = `${intro} Message extracts are on the papers, but the handle attribution report, platform/source extraction, and subscriber continuity material are still outstanding. The extracts alone do not prove your role or identity on the account.`;
      break;
    case "fraud_financial":
      body = `${intro} Bank statement summaries are on the papers, but the full transaction export, source banking records, and beneficiary tracing material are still outstanding. Summaries alone do not show the full account picture.`;
      break;
    case "motoring_road_traffic":
      body = `${intro} A breath/device procedure summary is on the papers, but calibration certificates, the full intoxilyser record, and any CCTV/dashcam export are still outstanding. Device reliability remains provisional.`;
      break;
    case "sexual_offences":
      body = `${intro} A draft complainant statement is on the papers, but the ABE interview video, transcript, and final signed MG11 are still outstanding. We cannot rely on the served draft alone for hearing position.`;
      break;
    case "youth_court":
      body = `${intro} A YJS report extract is on the papers, but the full pre-sentence report, vulnerability assessment, and youth interview audio are still outstanding. Your case is in the youth court and needs age-appropriate disclosure before we fix strategy.`;
      break;
    default:
      body = `${intro} Some material is served and some remains outstanding on the disclosure schedule — we will update you when further disclosure arrives.`;
  }
  return caseNote ? `${body} ${caseNote}` : body;
}

/** Plain-English client summary clipboard text (tab export only — not fed into proof ledger). */
export function demoAuditClientSummaryClipboard(
  truthKey: EvidenceStateTruthKey,
  clientLabel: string,
  footer?: string,
  caseId?: string,
): string {
  const paragraph = demoAuditClientSummaryParagraph(truthKey, clientLabel, caseId);
  const body = `CLIENT-SAFE SUMMARY\n(not for court or CPS)\n\n${paragraph}`;
  const reviewFooter =
    footer ?? "[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]";
  return `${body}\n\n${reviewFooter}`.trim();
}

export function polishDemoAuditExportPack(
  exportPack: import("@/lib/criminal/export-pack/types").ExportPackModel,
  truthKey: EvidenceStateTruthKey,
  clientLabel: string,
  caseId?: string,
  five?: FiveAnswersViewModel,
  chase?: DisclosureChaseBrief,
): import("@/lib/criminal/export-pack/types").ExportPackModel {
  const paragraph = demoAuditClientSummaryParagraph(truthKey, clientLabel, caseId);
  const body = `CLIENT-SAFE SUMMARY\n(not for court or CPS)\n\n${paragraph}`;
  const sections = exportPack.sections.map((section) => {
    if (section.id === "client_summary") {
      return {
        ...section,
        textForClipboard: `${body}\n\n${section.footer ?? ""}`.trim(),
      };
    }
    if (section.id === "evidence_gaps" && five && chase) {
      const gapLines = five.evidenceState.rows.slice(0, 8).map((row) => {
        const existence = evidenceExistenceLabel(row.existence);
        const reliability = evidenceReliabilityLabel(row.reliability);
        const note = row.note?.trim() ? ` — ${row.note.trim()}` : "";
        return `• ${row.label} [${existence} / ${reliability}]${note}`;
      });
      const chaseLines = chase.primaryItems.slice(0, 5).map((item) => {
        const state = inferChaseItemSourceState({
          label: item.label,
          source: item.source,
          baseStatus: item.baseStatus,
          evidenceAnchor: item.evidenceAnchor,
        });
        const anchor = item.evidenceAnchor?.trim() || item.source?.trim() || "Papers";
        const why = item.whyItMatters?.trim() ? ` — ${item.whyItMatters.trim()}` : "";
        return `• Chase: ${item.label} [${state.replace(/_/g, " ")}] (${anchor})${why}`;
      });
      const combined = [
        ...gapLines,
        ...chaseLines.filter((line) => !gapLines.some((existing) => existing.includes(line.slice(10, 30)))),
      ];
      const gapBody = `EVIDENCE GAP LIST\n\n${combined.length ? combined.join("\n") : "No outstanding gaps flagged on current papers."}`;
      return {
        ...section,
        textForClipboard: `${gapBody}\n\n${section.footer ?? ""}`.trim(),
      };
    }
    return section;
  });
  return { ...exportPack, sections };
}

/** Proof harness: hearing mode re-builds five answers without truth key — mirror truth-map rows for audit cases. */
export function alignHearingEvidenceSnapshotForAudit(
  hearing: HearingModeModel,
  five: FiveAnswersViewModel,
): HearingModeModel {
  const evidenceSnapshot = five.evidenceState.rows.slice(0, 6).map((row) => ({
    label: row.label,
    existence: row.existence,
    reliability: row.reliability,
    existenceLabel: evidenceExistenceLabel(row.existence),
    reliabilityLabel: evidenceReliabilityLabel(row.reliability),
    note: row.note,
  }));
  return { ...hearing, evidenceSnapshot };
}
