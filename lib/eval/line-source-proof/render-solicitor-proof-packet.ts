/**
 * Solicitor-grade proof packet.
 *
 * This is the human-facing layer. The full line-by-line ledger remains in
 * line-by-line-proof.md / proof-ledger.json; this packet only surfaces the
 * clearest proof story a solicitor can scan quickly.
 */
import { isUsefulSummaryBullet, polishProductCasing, trapMentionsIrrelevantTopic } from "./ledger-display";
import {
  demoAuditOffenceFamilyForCase,
  demoAuditProofReviewLine,
  isDemoAuditCase,
  isGenericDemoAuditChaseLabel,
} from "../demo-audit-packs/presentation-polish";
import type {
  RewriteDowngradeLedgerEntry,
  SuppressedCandidateLedgerEntry,
} from "./proof-ledger-types";
import type { LineSourceProofRecord, LineSourceProofReport } from "./types";

const PACKET_LIMIT = 5;

type PacketVerdict = "PASS" | "PASS WITH WARNINGS" | "BLOCKED";

export type SolicitorProofPacketItem = {
  text: string;
  source?: string;
  safeResult?: string;
  reason?: string;
  raw?: string;
  final?: string;
};

export type SolicitorProofPacketModel = {
  caseId: string;
  caseName: string;
  caseShape: string;
  verdict: PacketVerdict;
  proofMode: "PDF-backed" | "Text-only controlled bundle";
  bottomLine: string;
  gotRight: SolicitorProofPacketItem[];
  refused: SolicitorProofPacketItem[];
  softened: SolicitorProofPacketItem[];
  missing: SolicitorProofPacketItem[];
  review: SolicitorProofPacketItem[];
  fullLedgerFile: string;
  machineLedgerFile: string;
};

const GENERIC_TOP_LINE_RE =
  /^(?:disclosure completeness and outstanding source material|chase outstanding disclosure|record provisional hearing position|mg6\s*\/\s*unused schedule clarification|exhibit mapping\s*\/\s*provenance)$/i;

const DEV_NOTE_RE =
  /\b(?:source_unavailable|meaningful_line_without_anchor|evidence_item_not_in_snippet|generic_source_only|generic source only|no source anchor found|no line-level source anchor|solicitor_review_required|solicitor review required|needs_review|not_safely_confirmed|referred_only\s*\/\s*weak)\b/i;
const CLIPPED_COURT_RE =
  /\bthe court is asked\b(?![^.]*\.)|\bthe defence cannot safely advance\b(?![^.]*\.)|\bmy learned friend\b|\byour honour\b/i;
const MATERIAL_TOPIC_RE =
  /\bbwv\b|body[-\s]?worn|custody|pace|\bcctv\b|stills|footage|\bcad\b|999|phone|subscriber|extraction|download|encro|handle|platform|mg11|abe|first account|medical|forensic|bank|account|interview|continuity/i;
const PACKET_INTERNAL_LINE_RE =
  /MG6\s*\/?\s*unused schedule clarification|check MG6\s*\/?\s*unused|please provide MG6\s*\/?\s*unused|ask the court to record that MG6|^ask the court to record\b|^the defence asks the court to record\b|^chase CPS\b|^keep the position provisional\b|^the defence position remains provisional\b|statement of offence|contrary to section/i;

const ROBOTIC_LINE_RE =
  /Main issue:\.?|The case turns on relationship context|The case turns on identity, procedure|review served MG5\/MG6 before fixing trial|Assumed position may conflict|Referred only — Please provide|Strategic review line/i;

const GENERIC_REVIEW_REASON_RE =
  /^use with caution\b.*(?:material expected|not on bundle|referred on schedule|export not served|bundle support is limited)/i;

function bundleTopics(bundleHay: string): Set<string> {
  const hay = bundleHay.toLowerCase();
  const topics = new Set<string>();
  if (/\bbwv\b|body[-\s]?worn|bodycam/.test(hay)) topics.add("bwv");
  if (/\bcustody\b|\bpace\b|detention|custody record/.test(hay)) topics.add("custody");
  if (/\bcctv\b|stills|footage|camera|master cctv/.test(hay)) topics.add("cctv");
  if (/\bcad\b|999|control.?room/.test(hay)) topics.add("cad");
  if (/phone|subscriber|extraction|download|handset|screenshot|message pack|whatsapp|sms/.test(hay)) topics.add("phone");
  if (/encro|handle|platform|county.?lines/.test(hay)) topics.add("encro");
  if (/mg11|abe|complainant|counselling/.test(hay)) topics.add("mg11_abe");
  if (/bank|transaction|fraud|beneficiary/.test(hay)) topics.add("finance");
  if (/intoxilyser|calibration|breath|motoring|sjp|device certificate/.test(hay)) topics.add("motoring");
  if (/yjs|youth|vulnerability|appropriate adult/.test(hay)) topics.add("youth");
  if (/interview|mg15/.test(hay)) topics.add("interview");
  return topics;
}

function isOffFamilyForBundle(text: string, reason: string, bundleHay: string): boolean {
  const topics = bundleTopics(bundleHay);
  const combined = `${text} ${reason}`.toLowerCase();
  if (/^(?:verify|confirm whether)/i.test(text.trim())) {
    if (/custody|pace/.test(combined) && !topics.has("custody")) return true;
    return false;
  }
  if (/\bbwv\b|body[-\s]?worn/.test(combined) && !topics.has("bwv")) return true;
  if (/custody|pace/.test(combined) && !topics.has("custody")) return true;
  if (/\bcctv\b|master footage|stills|recognition/.test(combined) && !topics.has("cctv")) return true;
  if (/\bcad\b|999/.test(combined) && !topics.has("cad")) return true;
  if (/phone|subscriber|extraction|download|message export|handset/.test(combined) && !topics.has("phone")) return true;
  if (/encro|handle|platform/.test(combined) && !topics.has("encro")) return true;
  if (/abe|counselling/.test(combined) && !topics.has("mg11_abe")) return true;
  if (/bank|transaction|beneficiary/.test(combined) && !topics.has("finance")) return true;
  if (/intoxilyser|calibration|dashcam/.test(combined) && !topics.has("motoring") && !topics.has("cctv")) return true;
  if (/yjs|vulnerability|appropriate adult/.test(combined) && !topics.has("youth")) return true;
  return false;
}

function sentenceCaseLabel(input: string): string {
  const text = cleanText(input);
  if (!text) return text;
  const acronyms = new Map<string, string>([
    ["cctv", "CCTV"],
    ["bwv", "BWV"],
    ["pace", "PACE"],
    ["abe", "ABE"],
    ["mg11", "MG11"],
    ["yjs", "YJS"],
    ["ocr", "OCR"],
    ["cad", "CAD"],
    ["encro", "Encro"],
    ["mg6c", "MG6C"],
    ["sjp", "SJP"],
  ]);
  let out = text.charAt(0).toUpperCase() + text.slice(1);
  for (const [lower, upper] of acronyms) {
    out = out.replace(new RegExp(`\\b${lower}\\b`, "gi"), upper);
  }
  return out;
}

function reviewDisplayLabel(cleaned: string): string {
  if (/^(?:verify|confirm whether|output references|test attribution|relationship context|screenshots may)/i.test(cleaned)) {
    return sentenceCaseLabel(cleaned);
  }
  return sentenceCaseLabel(simplifyEvidenceLabel(cleaned));
}

function polishReviewReason(text: string, reason: string): string {
  let r = cleanReason(reason);
  if (/^use with caution\b/i.test(r)) {
    if (/phone extraction summary only|full source download outstanding/i.test(r)) {
      return "Screenshots and extraction summary alone do not prove sender identity.";
    }
    if (/only extract\/partial material/i.test(r)) {
      return "Served screenshots may be incomplete or lack full attribution context.";
    }
    if (/material expected or mentioned but not on bundle/i.test(r)) {
      return "Material is listed on the schedule but not safely served on the bundle.";
    }
    if (/referred on schedule/i.test(r)) {
      return "Referred on the disclosure schedule — not attached as proof.";
    }
  }
  if (r === text && /^(?:verify|confirm whether)/i.test(text.trim())) {
    return "Check before fixing hearing position.";
  }
  if (r === text && /verify ocr|confirm whether|subscriber identity does not prove|segregat|co-defendant|handle mapping/i.test(r)) {
    return r;
  }
  return r;
}

function strategicReviewTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/relationship context|course of conduct|test attribution|screenshots may be incomplete/.test(t)) return "strategic_phone";
  if (/driver identity|procedure, timing/.test(t)) return "strategic_motoring";
  return null;
}

function reviewTopicForItem(text: string): string {
  if (/^confirm whether/i.test(text.trim())) return "family_confirm";
  if (/^verify ocr/i.test(text.trim())) return "ocr_verify";
  return strategicReviewTopic(text) ?? topicKey(text);
}

function reviewAddsDistinctRisk(text: string, reason: string): boolean {
  const combined = `${text} ${reason}`.toLowerCase();
  if (ROBOTIC_LINE_RE.test(combined)) return false;
  if (/subscriber identity does not prove|attribution chain|segregat|co-defendant|handle mapping|do not equate|verify ocr|relationship context|course of conduct|driver identity|role or identity|not safely proved|cannot assume|before fixing hearing|index-listed pages/.test(combined)) {
    return true;
  }
  if (GENERIC_REVIEW_REASON_RE.test(reason)) return false;
  if (/^use with caution\b/i.test(reason) && !/attribution|segregat|verify|handle|subscriber identity|co-def/.test(combined)) {
    return false;
  }
  return /verify|segregat|attribution|handle|subscriber|co-defendant|confirm whether|ocr|relationship|identity|do not equate/i.test(combined);
}

function cleanText(input: string): string {
  return polishProductCasing(input)
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:Allegation|Next action):\s*/i, "")
    .replace(/\s+\.\s*$/g, ".")
    .replace(/\bMG6\/schedule reference only\b/gi, "Disclosure schedule reference only")
    .trim();
}

function humanizeReviewLine(text: string): string {
  return cleanText(text)
    .replace(/^Unknown\s*[—–-]\s*/i, "")
    .replace(/\bneeds_review\b/gi, "needs solicitor review")
    .replace(/\bunknown\b/gi, "not confirmed");
}

function shortenClean(input: string, max = 170): string {
  const text = cleanText(input)
    .replace(/\s*…\s*$/g, "")
    .replace(/\s*\.\.\.\s*$/g, "");
  if (text.length <= max) return text;
  const sentence = text.slice(0, max).replace(/\s+\S*$/, "").trim();
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function cleanReason(input: string): string {
  if (DEV_NOTE_RE.test(input)) {
    return "Bundle support for this point is limited — confirm before relying on it in court.";
  }
  const text = cleanText(input)
    .replace(/source_unavailable/gi, "bundle support is limited")
    .replace(/meaningful_line_without_anchor/gi, "no line-level source anchor")
    .replace(/solicitor_review_required/gi, "solicitor review required")
    .replace(/generic_source_only/gi, "generic source only")
    .replace(/needs_review/gi, "needs review")
    .replace(/evidence_item_not_in_snippet/gi, "")
    .replace(/,\s*,/g, ",")
    .trim();
  if (DEV_NOTE_RE.test(text) || text.length < 12) {
    return "Bundle support for this point is limited — confirm before relying on it in court.";
  }
  return shortenClean(text, 150);
}

function isClippedCourtWording(text: string): boolean {
  const t = text.trim();
  if (CLIPPED_COURT_RE.test(t)) return true;
  if (/^the court is asked/i.test(t) && !/\.\s*$/.test(t)) return true;
  if (/^please provide\b/i.test(t)) return true;
  return false;
}

function isSolicitorGradeReviewReason(reason: string): boolean {
  const r = cleanText(reason);
  if (!r || DEV_NOTE_RE.test(r)) return false;
  if (/^use with caution\b/i.test(r)) return true;
  if (/verify|segregat|attribution|co-defendant|handle|subscriber|do not equate/i.test(r)) return true;
  if (/confirm before|confirm whether|limited —|outstanding.*disclosure/i.test(r)) return true;
  return false;
}

function verdictHeadline(v: "pass" | "pass_with_warnings" | "blocked"): PacketVerdict {
  if (v === "pass") return "PASS";
  if (v === "pass_with_warnings") return "PASS WITH WARNINGS";
  return "BLOCKED";
}

function humanCaseShape(report: LineSourceProofReport): string {
  const emDashParts = report.caseTitle.split(/\s+[—–]\s+/);
  const fromTitle = emDashParts.length > 1 ? emDashParts[emDashParts.length - 1]!.trim() : undefined;
  if (fromTitle && fromTitle.length > 6) return cleanText(fromTitle);

  const raw = report.proofLedger.solicitorSummary.caseShape;
  if (raw && raw !== "needs_review" && raw.length > 4) {
    return cleanText(raw.replace(/_/g, " "));
  }

  const allegation = report.proofLedger.solicitorSummary.whatCaseIsAbout.split(" — ").slice(1).join(" — ");
  return cleanText(allegation || report.caseTitle);
}

function labelFromMg6Row(row: string): string {
  const body = row
    .replace(/^MG6C\/[A-Z0-9/]+\s*[—–-]\s*/i, "")
    .trim()
    .replace(/\.\s*$/, "");
  if (body.length <= 95) return body;
  const segments = body.split(/\s*[—–-]\s*/).map((s) => s.trim()).filter(Boolean);
  if (segments.length >= 2) return `${segments[0]} — ${segments[1]}`;
  return shortenClean(body, 95);
}

function sourceCite(line: LineSourceProofRecord, report: LineSourceProofReport): string {
  const output = cleanText(line.humanOutputLine ?? line.outputLine);
  const bundleHay = report.bundleText ?? "";
  const hay = [line.sourceSnippet, line.extractedSnippet, line.sourceAnchor, bundleHay].filter(Boolean).join(" ");
  const page = line.sourcePageNumber ?? line.sourcePage;
  const pageSuffix = page
    ? report.proofChainAppendix.caseProofMode === "pdf_and_text"
      ? `, page ${page}`
      : `, text page marker ${page}`
    : "";

  if (/target defendant interview/i.test(output) && /missing|outstanding/i.test(output)) {
    const mg6Row = bundleHay.match(/MG6C\/INT\/0[2-9][^\n]*/i)?.[0];
    if (mg6Row) {
      return `${labelFromMg6Row(mg6Row)}${pageSuffix}`;
    }
    if (/target defendant.*outstanding/i.test(hay)) {
      return `Target defendant interview outstanding (MG6 schedule)${pageSuffix}`;
    }
  }

  if (/co-defendant interview|other defendant only|segregat/i.test(output)) {
    const mg6Row = bundleHay.match(/MG6C\/INT\/01[^\n]*/i)?.[0];
    if (mg6Row) {
      return `${labelFromMg6Row(mg6Row)}${pageSuffix}`;
    }
    const anchorDoc = line.sourceAnchor?.split("|")[0]?.trim();
    if (anchorDoc && /interview/i.test(anchorDoc)) {
      return `${anchorDoc}${pageSuffix}`;
    }
  }

  const parts: string[] = [];
  const mg6c =
    hay.match(/MG6C\/[A-Z0-9/]+/i)?.[0] ?? line.sourceSection?.match(/MG6C\/[A-Z0-9/]+/i)?.[0];
  if (mg6c) parts.push(mg6c.toUpperCase());
  else if (line.sourceSection === "COVER_INDEX" && line.sourceAnchor) {
    const anchorDoc = line.sourceAnchor.split("|")[0]?.trim();
    if (anchorDoc && anchorDoc.length > 6) parts.push(anchorDoc);
    else parts.push(cleanText(line.sourceSection));
  } else if (line.sourceSection) parts.push(cleanText(line.sourceSection));

  if (page) {
    parts.push(
      report.proofChainAppendix.caseProofMode === "pdf_and_text" ? `page ${page}` : `text page marker ${page}`,
    );
  }

  if (parts.length) return parts.join(", ");
  if (line.sourceSnippet) return shortenClean(line.sourceSnippet, 90);
  return "No served source anchor found";
}

function dedupeKey(text: string): string {
  return cleanText(text)
    .toLowerCase()
    .replace(/\bbody worn video\b/g, "bwv")
    .replace(/\bbody-worn video\b/g, "bwv")
    .replace(/\bfull\b/g, "")
    .replace(/[^\w]+/g, " ")
    .trim()
    .slice(0, 100);
}

function topicKey(text: string): string {
  const t = text.toLowerCase();
  if (/\bbwv\b|body[-\s]?worn/.test(t)) return "bwv";
  if (/custody|pace/.test(t)) return "custody";
  if (/recognition|id basis/.test(t)) return "cctv";
  if (/\bcctv\b|stills|footage|master|continuity|provenance|audit trail/.test(t)) return "cctv";
  if (/cad|999|control[-\s]?room/.test(t)) return "cad";
  if (/counselling/.test(t)) return "mg11_abe";
  if (/mg11|complainant|first account|abe/.test(t)) return "mg11_abe";
  if (/interview audio|interview transcript|interview summary|target defendant interview/.test(t)) return "interview";
  if (/interview/.test(t)) return "interview";
  if (/message export|phone|subscriber|extraction|download|handset|metadata/.test(t)) return "phone";
  if (/encro|handle|platform|device continuity/.test(t)) return "encro";
  if (/medical|injury|forensic|dna|swab/.test(t)) return "medical_forensic";
  if (/bank|account|transaction|fraud|beneficiary|tracing/.test(t)) return "finance";
  if (/calibration|intoxilyser|dashcam|breath/.test(t)) return "motoring";
  if (/yjs|vulnerability|appropriate adult/.test(t)) return "youth";
  return dedupeKey(text);
}

function isTemplateGuardRefusal(text: string): boolean {
  const t = cleanText(text);
  return (
    /^do not import\b/i.test(t) ||
    /^assumed position may conflict/i.test(t) ||
    /^record defence position\b/i.test(t) ||
    /^take instructions\b/i.test(t) ||
    /additional source-material appears outstanding/i.test(t) ||
    /^exhibit mapping \/ provenance$/i.test(t) ||
    /^please provide exhibit mapping/i.test(t)
  );
}

function bundleTextForReport(report: LineSourceProofReport): string {
  return report.bundleText ?? "";
}

function isPacketUseful(text: string): boolean {
  const t = cleanText(text);
  if (!isUsefulSummaryBullet(t) && !MATERIAL_TOPIC_RE.test(t)) return false;
  if (GENERIC_TOP_LINE_RE.test(t)) return false;
  if (ROBOTIC_LINE_RE.test(t)) return false;
  if (DEV_NOTE_RE.test(t)) return false;
  if (/^[•\-\s]*do not\b/i.test(t)) return false;
  if (/^do not import\b/i.test(t)) return false;
  if (/^do not state\b/i.test(t)) return false;
  if (PACKET_INTERNAL_LINE_RE.test(t)) return false;
  if (/appears outstanding on the current file and should be disclosed on a\.?$/i.test(t)) return false;
  return true;
}

function scoreUsefulFinding(line: LineSourceProofRecord): number {
  if (line.usefulnessVerdict === "excluded") return -1;
  if (line.verdict === "FAIL") return -1;
  if (!line.sourceSnippet && line.proofChainStatus !== "pdf_and_text_support_output") return -1;
  if (line.lineCategory === "safety_warning") return -1;
  if (line.lineCategory === "court_note") return -1;
  if (line.supportStatus === "source_unavailable" || line.supportStatus === "unsupported") return -1;

  const text = cleanText(line.humanOutputLine ?? line.outputLine);
  let score = 0;
  if (PACKET_INTERNAL_LINE_RE.test(text)) return -1;
  if (line.proofChainStatus === "pdf_and_text_support_output") score += 70;
  if (line.reviewTier === "clean_source_backed") score += 55;
  if (line.usefulnessVerdict === "correct_and_useful") score += 40;
  if (line.lineCategory === "chase_request") score += 35;
  if (line.lineCategory === "missing_material") score += 30;
  if (line.lineCategory === "evidence_state") score += 25;
  if (/referred|missing|outstanding|extract only|summary only|not attached|not served/i.test(text)) score += 30;
  if (/\bbwv\b|body[-\s]?worn|custody|pace|cctv|phone|subscriber|encro|handle|abe|mg11/i.test(text)) score += 20;
  if (/statement of offence|contrary to section|disclosure completeness/i.test(text)) score -= 45;
  if (!MATERIAL_TOPIC_RE.test(text)) score -= 35;
  return score;
}

function safeResultForLine(line: LineSourceProofRecord, text: string): string {
  const t = text.toLowerCase();
  if (/\bbwv\b|body[-\s]?worn/.test(t)) {
    return "CaseBrain did not treat BWV as usable proof unless the full source material was served.";
  }
  if (/custody|pace/.test(t)) {
    return "CaseBrain treated custody/PACE material cautiously and chased the full record where needed.";
  }
  if (/\bcctv\b|stills|footage/.test(t)) {
    return "CaseBrain separated stills/references from full footage and avoided overstating identification.";
  }
  if (/encro|handle|platform/.test(t)) {
    return "CaseBrain kept platform/handle attribution separate from proof of role or supply.";
  }
  if (/phone|subscriber|extraction|download/.test(t)) {
    return "CaseBrain kept attribution/download evidence provisional unless the source material supported it.";
  }
  if (line.lineCategory === "chase_request") {
    return "CaseBrain chased the gap without presenting the missing material as proof.";
  }
  return "CaseBrain stated this only at the level supported by the bundle.";
}

function simplifyEvidenceLabel(input: string): string {
  const text = cleanText(input)
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s*—\s*(?:referred only|missing|not served|outstanding|extract only|summary only).*$/i, "")
    .replace(/\s*:\s*(?:referred_only|missing|unknown|served).*$/i, "")
    .trim();
  const t = text.toLowerCase();
  if (/\bbwv\b|body[-\s]?worn/.test(t)) return "Full BWV export / continuity";
  if (/custody|pace/.test(t)) return "Full custody/PACE record";
  if (/recognition|id basis/.test(t)) return "Recognition / ID basis";
  if (/continuity|provenance|audit trail/.test(t) && !/cctv still/.test(t)) return "Master CCTV footage / continuity";
  if (/\bcctv\b|stills|footage|master/.test(t)) return /still/i.test(t) ? "CCTV stills separated from master footage" : "Master CCTV footage / continuity";
  if (/subscriber|account data/.test(t)) return "Subscriber/account attribution material";
  if (/encro|platform|handle/.test(t)) return /handle/.test(t) ? "Encro handle mapping / attribution" : "Full platform extraction";
  if (/message export/.test(t)) return "Full message export";
  if (/phone|extraction|download|metadata/.test(t)) return "Full phone download / extraction";
  if (/mg11|complainant|first account/.test(t)) return "Complainant MG11 / first account";
  if (/counselling/.test(t)) return "Third-party counselling notes";
  if (/interview audio|interview transcript/.test(t)) return "Interview audio / transcript";
  if (/interview/.test(t)) return "Interview audio / transcript";
  if (/medical|injury/.test(t)) return "Medical/injury source material";
  if (/forensic|dna|swab/.test(t)) return "Forensic source material";
  return text;
}

function lineMatchesTopic(line: LineSourceProofRecord, label: string): boolean {
  const lineText = [line.humanOutputLine, line.outputLine, line.sourceSnippet, line.evidenceItem]
    .filter(Boolean)
    .join(" ");
  const labelText = label.toLowerCase();
  const haystack = lineText.toLowerCase();
  if (/platform/.test(labelText)) return /platform|mg6c\/pla/.test(haystack);
  if (/handle/.test(labelText)) return /handle|mg6c\/han/.test(haystack);
  if (/subscriber/.test(labelText)) return /subscriber|account data|mg6c\/sub/.test(haystack);
  if (/phone download|extraction/.test(labelText) && !/platform/.test(labelText)) {
    return /(phone|device|download|extraction|mg6c\/dev|mg6c\/ful|mg6c\/001)/.test(haystack) && !/platform/.test(haystack);
  }
  return topicKey(lineText) === topicKey(label);
}

function findBestSourceLine(report: LineSourceProofReport, label: string): LineSourceProofRecord | undefined {
  return report.lines
    .filter((line) => line.sourceSnippet)
    .filter((line) => lineMatchesTopic(line, label))
    .filter((line) => !/^MG6C\//i.test(cleanText(line.humanOutputLine ?? line.outputLine)))
    .sort((a, b) => scoreUsefulFinding(b) - scoreUsefulFinding(a))[0];
}

function isDemoAuditPositiveLine(line: LineSourceProofRecord, report: LineSourceProofReport): boolean {
  if (line.verdict === "FAIL") return false;
  if (line.proofChainStatus === "pdf_and_text_support_output") return true;
  if (!report.caseId.startsWith("demo-audit-")) return false;
  return Boolean(line.pdfPageAvailable && line.extractedSnippet);
}

function positiveSummaryFromText(raw: string, bundleHay: string): string | null {
  if (/co-defendant interview|other defendant only|segregat/i.test(raw) && /served|referred_only|segregat/i.test(raw)) {
    return "Co-defendant interview served and kept segregated as other-defendant-only material";
  }
  if (/screenshot|message pack/i.test(raw) && /served/i.test(raw)) {
    return "Screenshot/message pack correctly shown as served on the papers";
  }
  if (/cctv still|stills served/i.test(raw) && /served/i.test(raw)) {
    return "CCTV still images correctly shown as served — not master footage";
  }
  if (/encro message extract|message extract/i.test(raw) && /served/i.test(raw)) {
    return "Message extracts correctly shown as served without proving handle attribution";
  }
  if (/custody record extract|custody extract/i.test(raw) && /served/i.test(raw)) {
    return "Custody record extract correctly shown as served (partial — full record outstanding)";
  }
  if (/body-worn|bwv/i.test(raw) && /referred_only|referred/i.test(raw)) {
    return "BWV correctly shown as referred only — full export not attached";
  }
  if (/target defendant interview/i.test(raw) && /missing|outstanding/i.test(raw)) {
    return "Target defendant interview correctly treated as outstanding";
  }
  if (/phone extraction summary/i.test(raw) && /referred_only|served/i.test(raw)) {
    return "Phone extraction summary distinguished from full source download outstanding";
  }
  if (/\bfull phone download\b/i.test(raw) && /missing|outstanding/i.test(raw)) {
    if (trapMentionsIrrelevantTopic("phone extraction download", bundleHay)) return null;
    return "Full phone download correctly shown as outstanding";
  }
  if (/\bsubscriber|account data\b/i.test(raw) && /missing|outstanding/i.test(raw)) {
    return "Subscriber / account data correctly shown as outstanding";
  }
  if (/\bmaster cctv\b|\bmaster footage\b/i.test(raw) && /missing|outstanding/i.test(raw)) {
    if (trapMentionsIrrelevantTopic("master cctv footage", bundleHay)) return null;
    return "Master CCTV footage correctly shown as outstanding";
  }
  if (/\bcctv continuity\b|\bcontinuity\/provenance\b/i.test(raw) && /missing|outstanding/i.test(raw)) {
    if (trapMentionsIrrelevantTopic("cctv continuity", bundleHay)) return null;
    return "CCTV continuity correctly shown as outstanding";
  }
  return null;
}

function pickPositiveFindings(report: LineSourceProofReport): SolicitorProofPacketItem[] {
  const seen = new Set<string>();
  const out: SolicitorProofPacketItem[] = [];
  const bundleHay = bundleTextForReport(report);

  for (const line of report.lines) {
    if (!isDemoAuditPositiveLine(line, report)) continue;
    if (line.lineCategory !== "evidence_state" && line.lineCategory !== "evidence_claim") continue;
    const raw = cleanText(line.humanOutputLine ?? line.outputLine);
    const snippet = cleanText(line.extractedSnippet ?? "");
    if (trapMentionsIrrelevantTopic(raw, bundleHay) && trapMentionsIrrelevantTopic(snippet, bundleHay)) continue;

    const summary = positiveSummaryFromText(raw, bundleHay) ?? positiveSummaryFromText(snippet, bundleHay);
    if (!summary) continue;
    if (trapMentionsIrrelevantTopic(summary, bundleHay)) continue;
    const key = dedupeKey(summary);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: summary,
      source: sourceCite(line, report),
      safeResult: "CaseBrain matched the bundle disclosure state without overstating proof.",
    });
    if (out.length >= PACKET_LIMIT) break;
  }
  return out;
}

function pickGotRight(report: LineSourceProofReport): SolicitorProofPacketItem[] {
  const positive = pickPositiveFindings(report);
  if (positive.length > 0) return positive;

  const seen = new Set<string>();
  const topics = new Set<string>();
  const out: SolicitorProofPacketItem[] = [];

  for (const gap of report.proofLedger.solicitorSummary.mainEvidenceGaps) {
    const text = simplifyEvidenceLabel(gap);
    if (!isPacketUseful(text)) continue;
    const topic = topicKey(text);
    if (topics.has(topic)) continue;
    const line = findBestSourceLine(report, text);
    if (!line) continue;
    topics.add(topic);
    seen.add(dedupeKey(text));
    out.push({
      text: `${text} identified as not fully usable on the current papers`,
      source: sourceCite(line, report),
      safeResult: safeResultForLine(line, text),
    });
    if (out.length >= PACKET_LIMIT) return out;
  }

  return out;
}

function suppressionScore(s: SuppressedCandidateLedgerEntry): number {
  const text = s.candidateText.toLowerCase();
  const family = String(s.sourceFamily);
  let score = 0;
  if (s.proofStatus === "correctly_suppressed_overclaim") score += 60;
  if (/prove|proves|confirms|safe to send|served in full|available/i.test(text)) score += 40;
  if (/bwv|cctv|custody|pace|phone|encro|handle|cad|999|interview/i.test(text)) score += 25;
  if (["generic_strategy", "export_wording", "template_safety_guard", "court_note"].includes(family)) score -= 40;
  if (/record defence position|take instructions|confirm whether any positive defence/i.test(text)) score -= 35;
  return score;
}

function blockedReason(s: SuppressedCandidateLedgerEntry): string {
  const text = s.candidateText.toLowerCase();
  if (/cctv|stills|footage/.test(text)) return "The papers did not support that CCTV/footage proof level.";
  if (/\bbwv\b|body[-\s]?worn/.test(text)) return "The papers did not show full BWV served as usable proof.";
  if (/custody|pace/.test(text)) return "Only limited custody/PACE material was supported.";
  if (/phone|subscriber|extraction|download/.test(text)) return "Phone/download attribution was not safely proved by the served material.";
  if (/encro|handle|platform/.test(text)) return "Handle/platform material did not safely prove role or attribution.";
  if (/cad|999/.test(text)) return "CAD/999 material was not safely available on the papers.";
  if (/interview/.test(text)) return "Interview material was not safely available for that claim.";
  if (/prove|proves|confirms/.test(text)) return "The bundle did not support wording that strong.";
  if (/compound|template/i.test(s.reasonSuppressed)) return "The line mixed evidence families that were not all supported on the papers.";
  return "The source did not support that wording.";
}

function quoteSuppressed(text: string): string {
  const cleaned = cleanText(text);
  const m = cleaned.match(/do not (?:state|say)\s+["“]([^"”]+)["”]/i);
  if (m?.[1]) return shortenClean(m[1], 110);
  if (/^do not say\b/i.test(cleaned)) {
    return shortenClean(cleaned.replace(/^do not say\s+/i, "Avoid claiming "), 110);
  }
  const m2 = cleaned.match(/do not state ["“]([^"”]+)["”]/i);
  return shortenClean(m2?.[1] ?? cleaned, 110);
}

function isMaterialOverclaim(text: string): boolean {
  return /\b(?:prove|proves|proven|confirms|confirmed|safe to send|served in full|is defendant|shows safeguards were correctly followed|undermine(?:s|d)? the defence|wins?|collapses?|case is strong|case is weak)\b/i.test(text);
}

function relevantTopicsForCase(report: LineSourceProofReport): Set<string> {
  const topics = new Set<string>();
  const text = [
    report.caseTitle,
    report.proofLedger.solicitorSummary.caseShape,
    ...report.proofLedger.solicitorSummary.mainEvidenceGaps,
    ...report.proofLedger.solicitorSummary.keySourceAnchors,
  ].join(" ");
  if (/\bbwv\b|body[-\s]?worn/i.test(text)) topics.add("bwv");
  if (/custody|pace/i.test(text)) topics.add("custody");
  if (/\bcctv\b|stills|footage/i.test(text)) topics.add("cctv");
  if (/\bcad\b|999/i.test(text)) topics.add("cad");
  if (/phone|subscriber|extraction|download/i.test(text)) topics.add("phone");
  if (/encro|handle|platform/i.test(text)) topics.add("encro");
  if (/mg11|abe|first account/i.test(text)) topics.add("mg11_abe");
  if (/medical|forensic|dna|swab/i.test(text)) topics.add("medical_forensic");
  if (/bank|account|transaction|fraud/i.test(text)) topics.add("finance");
  for (const s of report.proofLedger.suppressedCandidates) {
    topics.add(topicKey(s.candidateText));
  }
  return topics;
}

function pickRefused(report: LineSourceProofReport): SolicitorProofPacketItem[] {
  const seen = new Set<string>();
  const out: SolicitorProofPacketItem[] = [];
  const bundleHay = bundleTextForReport(report);

  const candidates = [...report.proofLedger.suppressedCandidates]
    .filter((s) => s.proofStatus.startsWith("correctly_suppressed"))
    .filter((s) => !trapMentionsIrrelevantTopic(s.candidateText, bundleHay))
    .map((s) => ({ s, score: suppressionScore(s) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { s } of candidates) {
    const quote = quoteSuppressed(s.candidateText);
    if (!isUsefulSummaryBullet(quote)) continue;
    if (PACKET_INTERNAL_LINE_RE.test(quote)) continue;
    if (isTemplateGuardRefusal(quote) || isTemplateGuardRefusal(s.candidateText)) continue;
    if (/please provide the outstanding source material identified/i.test(quote)) continue;
    if (!isMaterialOverclaim(quote) && !isMaterialOverclaim(s.candidateText)) continue;
    const key = `${topicKey(quote)}:${dedupeKey(quote)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: `"${quote}"`,
      reason: blockedReason(s),
    });
    if (out.length >= PACKET_LIMIT) break;
  }

  return out;
}

function rewriteScore(r: RewriteDowngradeLedgerEntry): number {
  let score = 0;
  if (["overclaim_softened", "provisional_wording", "attribution_guard"].includes(r.changeType)) score += 70;
  if (["human_label", "mg6_label"].includes(r.changeType)) return -1;
  if (/unknown|needs_review|not_safely_confirmed/i.test(r.originalCandidate)) return -1;
  if (/allegation:|next action:/i.test(r.originalCandidate)) score -= 50;
  if (/statement of offence|contrary to section/i.test(r.originalCandidate)) score -= 40;
  return score;
}

function pickSoftened(report: LineSourceProofReport): SolicitorProofPacketItem[] {
  const seen = new Set<string>();
  const out: SolicitorProofPacketItem[] = [];

  const rewrites = [...report.proofLedger.rewritesDowngrades]
    .filter((r) => cleanText(r.originalCandidate) !== cleanText(r.finalOutput))
    .map((r) => ({ r, score: rewriteScore(r) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { r } of rewrites) {
    const raw = shortenClean(r.originalCandidate, 115);
    const final = shortenClean(r.finalOutput, 115);
    if (PACKET_INTERNAL_LINE_RE.test(raw) || PACKET_INTERNAL_LINE_RE.test(final)) continue;
    if (DEV_NOTE_RE.test(raw) || DEV_NOTE_RE.test(final)) continue;
    if (!isPacketUseful(final)) continue;
    if (/^disclosure completeness|^chase outstanding disclosure|^record provisional/i.test(final)) continue;
    const key = `${topicKey(final)}:${dedupeKey(raw)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: final,
      raw,
      final,
      reason: cleanReason(r.solicitorFriendlyExplanation || r.reason || "Wording softened to match source support."),
    });
    if (out.length >= PACKET_LIMIT) break;
  }

  return out;
}

function canonicalMissing(text: string): string {
  return cleanText(text)
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\bbody worn video\b/gi, "BWV")
    .replace(/\bbody-worn video\b/gi, "BWV")
    .replace(/\bfull BWV\b/gi, "BWV")
    .replace(/\bfull custody record\b/gi, "custody record")
    .trim();
}

function pickMissing(report: LineSourceProofReport): SolicitorProofPacketItem[] {
  const seenTopics = new Set<string>();
  const seen = new Set<string>();
  const out: SolicitorProofPacketItem[] = [];

  const add = (label: string, reason?: string) => {
    const simplified = simplifyEvidenceLabel(label);
    const text = sentenceCaseLabel(simplified);
    if (!isPacketUseful(text)) return;
    const topic = topicKey(text);
    if (seenTopics.has(topic)) return;
    const key = dedupeKey(text);
    if (seen.has(key)) return;
    seenTopics.add(topic);
    seen.add(key);
    out.push({
      text,
      reason: reason ? cleanReason(reason) : "Still outstanding on the current bundle.",
    });
  };

  for (const gap of report.proofLedger.solicitorSummary.mainEvidenceGaps) {
    add(gap, "Still outstanding on the current bundle.");
    if (out.length >= PACKET_LIMIT) return out;
  }
  for (const missing of report.proofLedger.missingExpectedOutputs) {
    add(missing.expectedItem, missing.plainEnglishNote || missing.reasonMissing);
    if (out.length >= PACKET_LIMIT) return out;
  }
  return out;
}

function pickReview(
  report: LineSourceProofReport,
  missingTopics: Set<string>,
): SolicitorProofPacketItem[] {
  const seen = new Set<string>();
  const seenTopics = new Set<string>();
  const out: SolicitorProofPacketItem[] = [];
  const offenceFamily = demoAuditOffenceFamilyForCase(report.caseId);
  const bundleHay = bundleTextForReport(report);

  const add = (text: string, reason: string) => {
    const normalized = normalizeReviewEntry(text, reason, report.caseId, bundleHay);
    if (!normalized) return;
    let { text: cleaned, reason: reviewReason } = normalized;
    if (!isPacketUseful(cleaned)) return;
    if (/^defendant sent the messages$/i.test(cleaned.trim())) return;
    if (PACKET_INTERNAL_LINE_RE.test(cleaned)) return;
    if (isClippedCourtWording(cleaned)) return;
    if (/^disclosure completeness|^chase outstanding disclosure|^missing\s*[—-]/i.test(cleaned)) return;
    if (DEV_NOTE_RE.test(cleaned) || DEV_NOTE_RE.test(reviewReason)) return;
    const label = reviewDisplayLabel(cleaned);
    const topic = reviewTopicForItem(label);
    if (seenTopics.has(topic)) return;
    const evidenceTopic = topicKey(label);
    const skipMissingDedupe = topic === "family_confirm" || topic === "ocr_verify";
    if (!skipMissingDedupe && missingTopics.has(evidenceTopic) && !reviewAddsDistinctRisk(label, reviewReason)) return;
    if (/^full custody\/pace record$/i.test(label.trim()) && missingTopics.has("custody")) return;
    if (!isSolicitorGradeReviewReason(reviewReason) && !reviewAddsDistinctRisk(label, reviewReason)) return;
    const key = `${topic}:${dedupeKey(label)}`;
    if (seen.has(key)) return;
    seenTopics.add(topic);
    seen.add(key);
    out.push({
      text: shortenClean(label, 125),
      reason: polishReviewReason(label, reviewReason),
    });
  };

  for (const conflict of report.proofLedger.sourceConflicts) {
    add(conflict.safeResolution, conflict.safeResolution);
    if (out.length >= PACKET_LIMIT) return out;
  }
  for (const entity of report.proofLedger.entityRisks) {
    add(entity.plainEnglishNote, entity.plainEnglishNote);
    if (out.length >= PACKET_LIMIT) return out;
  }
  for (const item of report.proofLedger.hotReviewQueue) {
    add(item.outputLine, item.reason);
    if (out.length >= PACKET_LIMIT) return out;
  }
  if (isDemoAuditCase(report.caseId) && out.length < PACKET_LIMIT) {
    const familyLine = demoAuditProofReviewLine(report.caseId, offenceFamily, bundleHay);
    add(familyLine, familyLine);
  }
  return out;
}

function normalizeReviewEntry(
  text: string,
  reason: string,
  caseId?: string,
  bundleHay?: string,
): { text: string; reason: string } | null {
  const cleaned = humanizeReviewLine(text.replace(/^[^:]{1,40}:\s*/, ""));
  if (ROBOTIC_LINE_RE.test(cleaned) || ROBOTIC_LINE_RE.test(reason)) return null;
  if (isGenericDemoAuditChaseLabel(cleaned)) return null;
  if (/^mg6c clarification/i.test(cleaned)) return null;
  if (/^Unknown\s*[—–-]/i.test(text.trim())) return null;
  if (/\bsource_unavailable\b/i.test(`${text} ${reason}`)) return null;
  if (isDemoAuditCase(caseId ?? "") && /^mg6\s*\/\s*unused/i.test(cleaned)) return null;
  if (bundleHay && isOffFamilyForBundle(cleaned, reason, bundleHay)) return null;
  return { text: cleaned, reason };
}

function bottomLine(report: LineSourceProofReport): string {
  const counts = report.proofLedger.counts;
  if (report.proofLedger.solicitorSummary.verdict === "blocked" || counts.emittedUnsupported > 0) {
    return "CaseBrain found unsupported output. Solicitor review is required before relying on this case view.";
  }
  if (counts.suppressedUnsupported > 0 && counts.missingExpectedOutputs > 0) {
    return "CaseBrain identified useful disclosure gaps, blocked unsupported wording, and kept remaining issues in solicitor review.";
  }
  if (counts.suppressedUnsupported > 0) {
    return "CaseBrain blocked unsupported wording before display and kept the visible output cautious.";
  }
  return "CaseBrain kept the visible output within the support level found in the bundle.";
}

export function buildSolicitorProofPacketModel(report: LineSourceProofReport): SolicitorProofPacketModel {
  const missing = pickMissing(report);
  const missingTopics = new Set(missing.map((item) => topicKey(item.text)));
  const review = pickReview(report, missingTopics);

  return {
    caseId: report.caseId,
    caseName: report.defendant,
    caseShape: humanCaseShape(report),
    verdict: verdictHeadline(report.proofLedger.solicitorSummary.verdict),
    proofMode:
      report.proofChainAppendix.caseProofMode === "pdf_and_text" ? "PDF-backed" : "Text-only controlled bundle",
    bottomLine: bottomLine(report),
    gotRight: pickGotRight(report),
    refused: pickRefused(report),
    softened: pickSoftened(report),
    missing,
    review,
    fullLedgerFile: "line-by-line-proof.md",
    machineLedgerFile: "proof-ledger.json",
  };
}

/** Gate helper — count missing/review topic overlap without distinct review risk. */
export function countSolicitorPacketDuplicates(model: SolicitorProofPacketModel): number {
  const missingTopics = new Set(model.missing.map((item) => topicKey(item.text)));
  let dupes = 0;
  for (const item of model.review) {
    const topic = topicKey(item.text);
    if (missingTopics.has(topic) && !reviewAddsDistinctRisk(item.text, item.reason ?? "")) dupes++;
    if (/^full custody\/pace record$/i.test(item.text.trim()) && missingTopics.has("custody")) dupes++;
  }
  const reviewTopics = model.review.map((item) => reviewTopicForItem(item.text));
  dupes += reviewTopics.length - new Set(reviewTopics).size;
  const missingKeys = model.missing.map((item) => topicKey(item.text));
  dupes += missingKeys.length - new Set(missingKeys).size;
  return dupes;
}

export function countSolicitorPacketOffFamily(model: SolicitorProofPacketModel, bundleHay: string): number {
  const missingTopics = new Set(model.missing.map((item) => topicKey(item.text)));
  let count = 0;
  for (const item of model.review) {
    if (isOffFamilyForBundle(item.text, item.reason ?? "", bundleHay)) count++;
    if (/^full custody\/pace record$/i.test(item.text.trim()) && missingTopics.has("custody")) count++;
  }
  return count;
}

export function solicitorPacketHasMainIssue(model: SolicitorProofPacketModel): boolean {
  const hay = [...model.missing, ...model.review, ...model.refused, ...model.softened]
    .map((item) => `${item.text} ${item.reason ?? ""} ${item.raw ?? ""} ${item.final ?? ""}`)
    .join(" ");
  return ROBOTIC_LINE_RE.test(hay);
}

function renderItemList(items: SolicitorProofPacketItem[], fallback: string, mode: "right" | "refused" | "softened" | "plain"): string[] {
  if (!items.length) return [`- ${fallback}`, ""];

  const lines: string[] = [];
  for (const item of items) {
    if (mode === "softened") {
      lines.push(`- Raw: "${item.raw}"`);
      lines.push(`  Final: "${item.final}"`);
      if (item.reason) lines.push(`  Reason: ${item.reason}`);
      lines.push("");
      continue;
    }
    lines.push(`- ${item.text}`);
    if (mode === "right" && item.source) lines.push(`  Source: ${item.source}.`);
    if (mode === "right" && item.safeResult) lines.push(`  Safe result: ${item.safeResult}`);
    if (mode === "refused" && item.reason) lines.push(`  Reason blocked: ${item.reason}`);
    if (mode === "plain" && item.reason) lines.push(`  Note: ${item.reason}`);
    lines.push("");
  }
  return lines;
}

export function renderSolicitorProofPacket(report: LineSourceProofReport): string {
  const model = buildSolicitorProofPacketModel(report);

  const lines: string[] = [
    "CASEBRAIN PROOF PACKET",
    "",
    `Case: ${model.caseName}`,
    `Shape: ${model.caseShape}`,
    `Verdict: ${model.verdict}`,
    `Proof mode: ${model.proofMode}`,
    "",
    "Bottom line:",
    model.bottomLine,
    "",
    "1. What CaseBrain got right",
    "",
    ...renderItemList(model.gotRight, "No top source-backed finding selected for the packet. See full ledger.", "right"),
    "2. What CaseBrain refused to say",
    "",
    ...renderItemList(model.refused, "No unsafe overclaim was shown to the solicitor.", "refused"),
    "3. What CaseBrain softened",
    "",
    ...renderItemList(model.softened, "No substantive rewrite selected for the packet.", "softened"),
    "4. What is still missing",
    "",
    ...renderItemList(model.missing, "No source-led missing item selected for the packet.", "plain"),
    "5. What solicitor must review",
    "",
    ...renderItemList(model.review, "No urgent review item selected for the packet.", "plain"),
    "Audit trail:",
    `- Full line-by-line ledger: \`${model.fullLedgerFile}\``,
    `- Machine proof ledger: \`${model.machineLedgerFile}\``,
    "",
    "_Controlled audit packet. Do not claim solicitor-reviewed real-world accuracy from this file._",
    "",
  ];

  return lines.join("\n");
}
