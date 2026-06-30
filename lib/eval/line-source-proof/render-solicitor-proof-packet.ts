/**
 * Solicitor-grade proof packet.
 *
 * This is the human-facing layer. The full line-by-line ledger remains in
 * line-by-line-proof.md / proof-ledger.json; this packet only surfaces the
 * clearest proof story a solicitor can scan quickly.
 */
import { isUsefulSummaryBullet, polishProductCasing } from "./ledger-display";
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
  /\b(?:source_unavailable|meaningful_line_without_anchor|evidence_item_not_in_snippet|generic_source_only|generic source only|no source anchor found|no line-level source anchor|solicitor_review_required|solicitor review required|needs_review|not_safely_confirmed)\b/i;
const CLIPPED_COURT_RE =
  /\bthe court is asked\b(?![^.]*\.)|\bthe defence cannot safely advance\b(?![^.]*\.)|\bmy learned friend\b|\byour honour\b/i;
const MATERIAL_TOPIC_RE =
  /\bbwv\b|body[-\s]?worn|custody|pace|\bcctv\b|stills|footage|\bcad\b|999|phone|subscriber|extraction|download|encro|handle|platform|mg11|abe|first account|medical|forensic|bank|account|interview|continuity/i;
const PACKET_INTERNAL_LINE_RE =
  /MG6\s*\/?\s*unused schedule clarification|check MG6\s*\/?\s*unused|please provide MG6\s*\/?\s*unused|ask the court to record that MG6|^ask the court to record\b|^the defence asks the court to record\b|^chase CPS\b|^keep the position provisional\b|^the defence position remains provisional\b|statement of offence|contrary to section/i;

function cleanText(input: string): string {
  return polishProductCasing(input)
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:Allegation|Next action):\s*/i, "")
    .replace(/\s+\.\s*$/g, ".")
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
  if (/confirm before|limited —|outstanding.*disclosure/i.test(r)) return true;
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

function sourceCite(line: LineSourceProofRecord, report: LineSourceProofReport): string {
  const parts: string[] = [];
  const mg6c =
    line.sourceSnippet?.match(/MG6C\/[A-Z0-9]+/i)?.[0] ??
    line.sourceSection?.match(/MG6C\/[A-Z0-9]+/i)?.[0];
  if (mg6c) parts.push(mg6c.toUpperCase());
  else if (line.sourceSection) parts.push(cleanText(line.sourceSection));

  const page = line.sourcePageNumber ?? line.sourcePage;
  if (page) {
    parts.push(report.proofChainAppendix.caseProofMode === "pdf_and_text" ? `page ${page}` : `text page marker ${page}`);
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
  if (/\bcctv\b|stills|footage/.test(t)) return "cctv";
  if (/cad|999|control[-\s]?room/.test(t)) return "cad";
  if (/mg11|complainant|first account|abe/.test(t)) return "mg11_abe";
  if (/phone|subscriber|extraction|download|handset/.test(t)) return "phone";
  if (/encro|handle|platform/.test(t)) return "encro";
  if (/medical|injury|forensic|dna|swab/.test(t)) return "medical_forensic";
  if (/bank|account|transaction|fraud/.test(t)) return "finance";
  return dedupeKey(text);
}

function isPacketUseful(text: string): boolean {
  const t = cleanText(text);
  if (!isUsefulSummaryBullet(t) && !MATERIAL_TOPIC_RE.test(t)) return false;
  if (GENERIC_TOP_LINE_RE.test(t)) return false;
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
  if (/\bcctv\b|stills|footage|master/.test(t)) return /still/i.test(t) ? "CCTV stills separated from master footage" : "Master CCTV footage / continuity";
  if (/subscriber|account data/.test(t)) return "Subscriber/account attribution material";
  if (/encro|platform|handle/.test(t)) return /handle/.test(t) ? "Encro handle mapping / attribution" : "Full platform extraction";
  if (/phone|extraction|download/.test(t)) return "Full phone download / extraction";
  if (/mg11|complainant|first account/.test(t)) return "Complainant MG11 / first account";
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

function pickGotRight(report: LineSourceProofReport): SolicitorProofPacketItem[] {
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
  const relevantTopics = relevantTopicsForCase(report);

  const candidates = [...report.proofLedger.suppressedCandidates]
    .filter((s) => s.proofStatus.startsWith("correctly_suppressed"))
    .map((s) => ({ s, score: suppressionScore(s) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { s } of candidates) {
    const quote = quoteSuppressed(s.candidateText);
    if (!isUsefulSummaryBullet(quote)) continue;
    if (PACKET_INTERNAL_LINE_RE.test(quote)) continue;
    if (/please provide the outstanding source material identified/i.test(quote)) continue;
    if (!isMaterialOverclaim(quote)) continue;
    const topic = topicKey(quote);
    if (relevantTopics.size > 0 && !relevantTopics.has(topic) && !isMaterialOverclaim(quote)) continue;
    const key = `${topicKey(quote)}:${dedupeKey(quote)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: `"${quote}"`,
      reason: blockedReason(s),
    });
    if (out.length >= PACKET_LIMIT) break;
  }

  if (out.length === 0) {
    for (const s of report.proofLedger.suppressedCandidates.filter((x) => x.proofStatus.startsWith("correctly_suppressed"))) {
      const quote = quoteSuppressed(s.candidateText);
      if (!isUsefulSummaryBullet(quote) || PACKET_INTERNAL_LINE_RE.test(quote)) continue;
      if (/please provide the outstanding source material identified/i.test(quote)) continue;
      const key = dedupeKey(quote);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text: `"${quote}"`, reason: blockedReason(s) });
      if (out.length >= PACKET_LIMIT) break;
    }
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
    const text = canonicalMissing(label);
    if (!isPacketUseful(text)) return;
    const topic = topicKey(text);
    if (seenTopics.has(topic)) return;
    const key = dedupeKey(text);
    if (seen.has(key)) return;
    seenTopics.add(topic);
    seen.add(key);
    out.push({ text, reason });
  };

  for (const gap of report.proofLedger.solicitorSummary.mainEvidenceGaps) {
    add(simplifyEvidenceLabel(gap), "Source-led gap in the current bundle.");
    if (out.length >= PACKET_LIMIT) return out;
  }
  for (const missing of report.proofLedger.missingExpectedOutputs) {
    add(simplifyEvidenceLabel(missing.expectedItem), cleanReason(missing.plainEnglishNote || missing.reasonMissing));
    if (out.length >= PACKET_LIMIT) return out;
  }
  return out;
}

function pickReview(report: LineSourceProofReport): SolicitorProofPacketItem[] {
  const seen = new Set<string>();
  const seenTopics = new Set<string>();
  const out: SolicitorProofPacketItem[] = [];

  const add = (text: string, reason: string) => {
    const cleaned = humanizeReviewLine(text.replace(/^[^:]{1,40}:\s*/, ""));
    if (!isPacketUseful(cleaned)) return;
    if (PACKET_INTERNAL_LINE_RE.test(cleaned)) return;
    if (isClippedCourtWording(cleaned)) return;
    if (/^disclosure completeness|^chase outstanding disclosure|^missing\s*[—-]/i.test(cleaned)) return;
    if (DEV_NOTE_RE.test(cleaned) || DEV_NOTE_RE.test(reason)) return;
    if (!isSolicitorGradeReviewReason(reason)) return;
    const topic = topicKey(cleaned);
    if (seenTopics.has(topic)) return;
    const key = `${topic}:${dedupeKey(cleaned)}`;
    if (seen.has(key)) return;
    seenTopics.add(topic);
    seen.add(key);
    out.push({
      text: shortenClean(simplifyEvidenceLabel(cleaned), 125),
      reason: cleanReason(reason),
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
  return out;
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
    missing: pickMissing(report),
    review: pickReview(report),
    fullLedgerFile: "line-by-line-proof.md",
    machineLedgerFile: "proof-ledger.json",
  };
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
    ...renderItemList(model.refused, "No material overstatement selected for the packet.", "refused"),
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
