/**
 * Visible solicitor receipt for an app output.
 * Built only from fields already on the item — never invents a page, ref, or quote.
 */

import type { FindingProvenance } from "@/lib/criminal/finding-provenance";
import { classifyEvidenceSubFamily, type EvidenceSubFamily } from "@/lib/criminal/evidence-family-owner";

export type VisibleSourceClass =
  | "direct_pdf_quote"
  | "derived_from_absence"
  | "user_entered"
  | "procedural_instruction"
  | "generated_from_missing_expected_material"
  | "unsupported";

export type VisibleOutputReceipt = {
  output: string;
  outputType: string;
  surface: string;
  truthState: string;
  sourceClass: VisibleSourceClass;
  sourceDocument: string;
  sourceRef: string;
  sourcePage: string;
  supportingText: string | null;
  transformation: string;
  confidence: number;
  guard: string;
  unsupportedWarning: string | null;
  family: EvidenceSubFamily;
};

export type VisibleReceiptInput = {
  output: string;
  surface: "overview" | "chase" | "papers" | "court" | "client";
  outputType?: string;
  status?: string | null;
  scheduleRef?: string | null;
  sourceLabel?: string | null;
  evidenceAnchor?: string | null;
  mergedFrom?: string[];
  provenance?: FindingProvenance | null;
  excerpt?: string | null;
};

const PAGE_UNAVAILABLE = "page unavailable";
const REF_UNAVAILABLE = "ref unavailable";
const DOC_UNAVAILABLE = "unavailable";

const ABSENCE_RE =
  /\b(?:not (?:yet )?(?:served|attached|listed|supplied|included)|no (?:reference|mention|listing|entry)|outstanding|absent|not in papers|missing)\b/i;
const GENERATED_GAP_RE =
  /\b(?:full 999 audio|full cad incident log|full phone download|full phone extraction|source extraction|subscriber \/ account data|full cctv master)\b/i;
const USER_RE = /\b(?:user entered|solicitor note|record position|flagged by user)\b/i;
const PROCEDURAL_RE =
  /\b(?:please provide|solicitor review required|review the cited source|confirm in writing why it is not available|check source before sending)\b/i;
const REF_RE = /\b(?:MG\d+[A-Z]?(?:\/\d+)?|EX[-/][A-Z0-9-]+|O\d{2}|TEL\/\d+)\b/i;

function compact(text: string | number | null | undefined): string {
  if (typeof text === "number" && Number.isFinite(text) && text > 0) return String(text);
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function firstQuote(input: VisibleReceiptInput): string | null {
  const candidates = [
    input.excerpt,
    input.evidenceAnchor,
    ...(input.mergedFrom ?? []),
  ]
    .map(compact)
    .filter((line) => line.length >= 8);
  return candidates[0] ?? null;
}

function honestPage(provenance?: FindingProvenance | null): string {
  if (!provenance) return PAGE_UNAVAILABLE;
  if (provenance.pageIdentityKnown === false) return PAGE_UNAVAILABLE;
  const page = compact(provenance.sourcePage) || compact(provenance.compiledPage);
  if (!page) return PAGE_UNAVAILABLE;
  if (/^(?:p\.?)?(?:null|undefined|nan|none|0+)$/i.test(page)) return PAGE_UNAVAILABLE;
  return page;
}

function honestRef(input: VisibleReceiptInput): string {
  const fromField = compact(input.scheduleRef);
  if (fromField) return fromField;
  const hay = [input.output, input.evidenceAnchor, input.excerpt, input.sourceLabel].filter(Boolean).join(" ");
  const hit = hay.match(REF_RE);
  return hit?.[0] ?? REF_UNAVAILABLE;
}

function honestDocument(input: VisibleReceiptInput): string {
  const title = compact(input.provenance?.sourceDocumentTitle);
  if (title) return title;
  const type = compact(input.provenance?.sourceDocumentType);
  if (type) return type;
  const source = compact(input.sourceLabel);
  if (source && /mg\d|schedule|bundle|charge sheet|extract|file/i.test(source)) return source;
  return DOC_UNAVAILABLE;
}

function inferTruthState(text: string, status?: string | null): string {
  const s = compact(status).toLowerCase();
  if (s === "served" || s === "received") return "served";
  if (s === "outstanding" || s === "overdue" || s === "due soon" || s === "missing" || s === "absent") {
    return s === "missing" || s === "absent" ? "missing" : "outstanding";
  }
  if (s === "not safely confirmed" || s === "unclear" || s === "review") return "not_safely_confirmed";
  if (s === "partial" || s === "incomplete") return "incomplete";
  const n = compact(text).toLowerCase();
  if (/\bnot safely confirmed\b/.test(n)) return "not_safely_confirmed";
  if (/\b(?:outstanding|not yet served)\b/.test(n)) return "outstanding";
  if (/\bmissing\b/.test(n)) return "missing";
  if (/\bserved\b/.test(n) && !/\bnot\s+(?:yet\s+)?served\b/.test(n)) return "served";
  return "none";
}

function inferSourceClass(input: VisibleReceiptInput, quote: string | null, ref: string): VisibleSourceClass {
  const hay = `${input.output} ${input.sourceLabel ?? ""} ${input.surface}`;
  if (USER_RE.test(hay)) return "user_entered";
  if (PROCEDURAL_RE.test(input.output) && !ABSENCE_RE.test(input.output) && ref === REF_UNAVAILABLE && !quote) {
    return "procedural_instruction";
  }
  // A named schedule/exhibit ref is source-backed even when the cell says the item is missing.
  if (ref !== REF_UNAVAILABLE || (quote && !ABSENCE_RE.test(quote))) return "direct_pdf_quote";
  if (quote && ABSENCE_RE.test(quote)) return "derived_from_absence";
  if (GENERATED_GAP_RE.test(input.output)) return "generated_from_missing_expected_material";
  return "unsupported";
}

function inferTransformation(
  input: VisibleReceiptInput,
  sourceClass: VisibleSourceClass,
  family: EvidenceSubFamily,
  quote: string | null,
): string {
  const q = (quote ?? "").toLowerCase();
  if (family === "interview_full" && /interview summary|summary served|summary only/.test(q)) {
    return "served summary split from missing transcript";
  }
  if (family === "cctv_master" && /stills|timing note/.test(q)) {
    return "served stills split from missing master";
  }
  if (family === "cad_999_audio" && /cad (?:and 999 )?summar/.test(q)) {
    return "CAD summary split from missing 999 audio";
  }
  if (family === "phone_download" && /handset|iphone|stolen phone|phone contact/.test(q)) {
    return "phone contact/property split from missing download";
  }
  if (sourceClass === "derived_from_absence") return "absence rule";
  if (sourceClass === "generated_from_missing_expected_material") {
    return "generated from missing expected material";
  }
  if (sourceClass === "direct_pdf_quote" && /outstanding|missing|not yet served/.test(`${input.output} ${input.status ?? ""}`)) {
    return "schedule row → missing chase card";
  }
  if (sourceClass === "direct_pdf_quote") return "schedule row → status card";
  if (sourceClass === "user_entered") return "user/manual field";
  if (sourceClass === "procedural_instruction") return "procedural instruction";
  return "no source transformation";
}

function inferGuard(sourceClass: VisibleSourceClass, page: string): string {
  if (sourceClass === "unsupported") return "fail: factual output has no supporting File/PDF quote or ref";
  if (sourceClass === "direct_pdf_quote" && page !== PAGE_UNAVAILABLE) return "pass: source-backed with page";
  if (sourceClass === "direct_pdf_quote") return "pass: source-backed — page unavailable";
  if (sourceClass === "derived_from_absence") return "pass: derived from stated absence";
  if (sourceClass === "generated_from_missing_expected_material") {
    return "explained: generated from expected missing material";
  }
  if (sourceClass === "user_entered") return "explained: user-entered";
  return "explained: procedural/furniture";
}

function inferConfidence(sourceClass: VisibleSourceClass, page: string): number {
  if (sourceClass === "direct_pdf_quote") return page === PAGE_UNAVAILABLE ? 0.7 : 0.9;
  if (sourceClass === "derived_from_absence") return 0.65;
  if (sourceClass === "generated_from_missing_expected_material") return 0.5;
  if (sourceClass === "user_entered" || sourceClass === "procedural_instruction") return 0.4;
  return 0.1;
}

export function buildVisibleOutputReceipt(input: VisibleReceiptInput): VisibleOutputReceipt {
  const output = compact(input.output);
  const quote = firstQuote(input);
  const ref = honestRef(input);
  const page = honestPage(input.provenance);
  const family = classifyEvidenceSubFamily(output, ref === REF_UNAVAILABLE ? [] : [ref]);
  const sourceClass = inferSourceClass(input, quote, ref);
  const transformation = inferTransformation(input, sourceClass, family, quote);
  return {
    output,
    outputType: input.outputType ?? (input.surface === "chase" ? "chase_request" : input.surface === "court" ? "court_line" : input.surface === "papers" ? "inventory_row" : input.surface === "client" ? "client_summary" : "evidence_status"),
    surface: input.surface,
    truthState: inferTruthState(output, input.status),
    sourceClass,
    sourceDocument: honestDocument(input),
    sourceRef: ref,
    sourcePage: page,
    supportingText: quote,
    transformation,
    confidence: inferConfidence(sourceClass, page),
    guard: inferGuard(sourceClass, page),
    unsupportedWarning:
      sourceClass === "unsupported"
        ? "Unsupported: no File/PDF quote or schedule ref supports this output."
        : null,
    family,
  };
}

export function receiptFromChaseItem(item: {
  label: string;
  baseStatus?: string | null;
  source?: string | null;
  evidenceAnchor?: string | null;
  mergedFrom?: string[];
  sourceScheduleRef?: string | null;
  provenance?: FindingProvenance | null;
  whyItMatters?: string | null;
}, surface: VisibleReceiptInput["surface"] = "chase"): VisibleOutputReceipt {
  return buildVisibleOutputReceipt({
    output: item.label,
    surface,
    outputType: surface === "overview" ? "evidence_status" : "chase_request",
    status: item.baseStatus,
    scheduleRef: item.sourceScheduleRef,
    sourceLabel: item.source,
    evidenceAnchor: item.evidenceAnchor,
    mergedFrom: item.mergedFrom,
    provenance: item.provenance,
    excerpt: item.evidenceAnchor,
  });
}

export function receiptFromMaterialRow(row: {
  label: string;
  status?: string | null;
  scheduleRef?: string | null;
  displayLine?: string | null;
  detail?: string | null;
  sourceAnchor?: { excerpt?: string | null; sectionLabel?: string | null } | null;
}): VisibleOutputReceipt {
  return buildVisibleOutputReceipt({
    output: row.label,
    surface: "papers",
    status: row.status,
    scheduleRef: row.scheduleRef,
    sourceLabel: row.sourceAnchor?.sectionLabel ?? null,
    excerpt: row.sourceAnchor?.excerpt ?? row.displayLine ?? row.detail,
    evidenceAnchor: row.displayLine,
  });
}

export function receiptFromCourtLine(
  text: string,
  source?: {
    baseStatus?: string | null;
    source?: string | null;
    evidenceAnchor?: string | null;
    mergedFrom?: string[];
    sourceScheduleRef?: string | null;
    provenance?: FindingProvenance | null;
  } | null,
): VisibleOutputReceipt {
  return buildVisibleOutputReceipt({
    output: text,
    surface: "court",
    outputType: "court_line",
    status: source?.baseStatus,
    scheduleRef: source?.sourceScheduleRef,
    sourceLabel: source?.source,
    evidenceAnchor: source?.evidenceAnchor,
    mergedFrom: source?.mergedFrom,
    provenance: source?.provenance,
  });
}

export function receiptFromClientFactLine(
  line: string,
  row?: {
    status?: string | null;
    scheduleRef?: string | null;
    displayLine?: string | null;
    excerpt?: string | null;
    sourceLabel?: string | null;
  } | null,
): VisibleOutputReceipt {
  return buildVisibleOutputReceipt({
    output: line,
    surface: "client",
    status: row?.status,
    scheduleRef: row?.scheduleRef,
    sourceLabel: row?.sourceLabel,
    excerpt: row?.excerpt ?? row?.displayLine,
    evidenceAnchor: row?.displayLine,
  });
}
