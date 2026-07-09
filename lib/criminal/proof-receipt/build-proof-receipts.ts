import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { humanizeEvidenceLabel } from "@/components/criminal/five-answers/evidence-display";
import type {
  EvidenceTraceRow,
  FiveAnswersEvidenceRow,
  FiveAnswersViewModel,
} from "@/lib/criminal/five-answers/types";
import { buildFamilyProofCards } from "./build-family-cards";
import { deriveSafeAction, deriveSupportLevel, evidenceStateLabel } from "./derive";
import type {
  ProofReceiptRow,
  ProofReceiptSurface,
  ProofReceiptViewModel,
  RefusedOverstatementRow,
} from "./types";

export type BuildProofReceiptsInput = {
  view: FiveAnswersViewModel;
  chase?: DisclosureChaseBrief | null;
  bundleHay?: string;
  allegation?: string;
};

function surfaceFromTraceSection(section: EvidenceTraceRow["section"]): ProofReceiptSurface {
  switch (section) {
    case "court_note":
      return "Court";
    case "chase":
      return "CPS Chase";
    case "do_not_overstate":
      return "Overview";
    default:
      return "Overview";
  }
}

function parseSourcePage(anchor: string | null | undefined): string | null {
  if (!anchor?.trim()) return null;
  const mg6 = anchor.match(/mg6c\/[a-z0-9-]+/i);
  if (mg6) return mg6[0].toUpperCase();
  const page = anchor.match(/\bpage\s*(\d+)\b/i);
  if (page) return `Page ${page[1]}`;
  return anchor.length <= 48 ? anchor : `${anchor.slice(0, 45)}…`;
}

function receiptFromTrace(row: EvidenceTraceRow, surface?: ProofReceiptSurface): ProofReceiptRow {
  const resolvedSurface = surface ?? surfaceFromTraceSection(row.section);
  const outputLine = row.claim.trim();
  const pending = outputLine.length < 3;
  return {
    id: `trace-${row.id}`,
    outputLine: pending ? "Proof receipt not available for this line yet." : outputLine,
    surface: resolvedSurface,
    sourceDocument: row.sourceLabel?.trim() || "Bundle papers",
    sourcePage: parseSourcePage(row.sourceAnchor),
    sourceSnippet: row.sourceAnchor?.trim() ? row.sourceAnchor.trim().slice(0, 280) : null,
    evidenceState: evidenceStateLabel(row.existence),
    existence: row.existence,
    reliability: row.reliability,
    supportLevel: deriveSupportLevel(row.existence, row.reliability),
    safeAction: deriveSafeAction(row.existence, row.reliability),
    solicitorReviewNote: row.traceWarning?.trim() ?? null,
    blockedUnsafeWording: row.section === "do_not_overstate" ? outputLine : null,
    safeAlternativeWording:
      row.section === "do_not_overstate"
        ? "Use cautious wording tied to what is served on the bundle — solicitor review required."
        : null,
    pending,
  };
}

function receiptFromEvidenceRow(row: FiveAnswersEvidenceRow, index: number): ProofReceiptRow {
  const outputLine = humanizeEvidenceLabel(row.label, row.existence);
  const note = row.note?.trim();
  const line = note ? `${outputLine} — ${note}` : outputLine;
  return {
    id: `row-${index}-${row.label.slice(0, 24)}`,
    outputLine: line,
    surface: "Overview",
    sourceDocument: "MG6C / bundle schedule",
    sourcePage: null,
    sourceSnippet: note ?? null,
    evidenceState: evidenceStateLabel(row.existence),
    existence: row.existence,
    reliability: row.reliability,
    supportLevel: deriveSupportLevel(row.existence, row.reliability),
    safeAction: deriveSafeAction(row.existence, row.reliability),
    solicitorReviewNote: "Solicitor review required before reliance or export.",
    blockedUnsafeWording: null,
    safeAlternativeWording: null,
    pending: false,
  };
}

function receiptFromChaseItem(
  item: NonNullable<BuildProofReceiptsInput["chase"]>["primaryItems"][number],
  index: number,
): ProofReceiptRow | null {
  const wording = item.draftChaseWording?.trim() || item.label?.trim();
  if (!wording) return null;
  const existence =
    item.baseStatus?.toLowerCase() === "received"
      ? "served"
      : /referred/i.test(item.source ?? "")
        ? "referred_only"
        : "missing";
  const reliability = existence === "served" ? "needs_review" : "weak";
  return {
    id: `chase-${index}-${item.id ?? item.label}`,
    outputLine: wording,
    surface: "CPS Chase",
    sourceDocument: item.source?.trim() || "MG6C schedule",
    sourcePage: parseSourcePage(item.evidenceAnchor),
    sourceSnippet: item.evidenceAnchor?.trim() ? item.evidenceAnchor.trim().slice(0, 280) : null,
    evidenceState: evidenceStateLabel(existence),
    existence,
    reliability,
    supportLevel: deriveSupportLevel(existence, reliability),
    safeAction: "chase",
    solicitorReviewNote: item.whyItMatters?.trim() || "Solicitor review required before sending chase.",
    blockedUnsafeWording: null,
    safeAlternativeWording: null,
    pending: false,
  };
}

function parseRefusedOverstatements(lines: string[]): RefusedOverstatementRow[] {
  const out: RefusedOverstatementRow[] = [];
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line || line.length < 6) continue;
    const doNotSay = line.match(/do not (?:say|state|overstate|import)[:\s]+(.+)/i);
    const blockedLine = doNotSay?.[1]?.trim() || line.replace(/^do not\b[^:]*:?\s*/i, "").trim();
    if (!blockedLine) continue;
    out.push({
      id: `refused-${i}`,
      blockedLine,
      reason: "Unsafe on current papers — copy gate blocked this wording.",
      safeAlternative: "Describe only what source material supports; mark gaps for chase where material is outstanding.",
    });
  }
  return out.slice(0, 6);
}

function countStates(rows: FiveAnswersEvidenceRow[]) {
  let served = 0;
  let partial = 0;
  let referredOnly = 0;
  let missing = 0;
  for (const row of rows) {
    if (row.existence === "served") served += 1;
    else if (row.existence === "referred_only") referredOnly += 1;
    else if (row.existence === "missing") missing += 1;
    else partial += 1;
  }
  return { served, partial, referredOnly, missing };
}

export function buildProofReceiptView(input: BuildProofReceiptsInput): ProofReceiptViewModel {
  const { view, chase, bundleHay = "", allegation = "" } = input;
  const receipts: ProofReceiptRow[] = [];
  const seen = new Set<string>();

  const pushReceipt = (receipt: ProofReceiptRow) => {
    const key = `${receipt.surface}::${receipt.outputLine.slice(0, 80).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    receipts.push(receipt);
  };

  for (const row of view.evidenceTrace.bySection.key_evidence.slice(0, 4)) {
    pushReceipt(receiptFromTrace(row));
  }
  for (const row of view.evidenceTrace.bySection.missing_referred.slice(0, 4)) {
    pushReceipt(receiptFromTrace(row));
  }
  if (view.evidenceTrace.bySection.court_note[0]) {
    pushReceipt(receiptFromTrace(view.evidenceTrace.bySection.court_note[0], "Court"));
  }
  for (const [i, row] of view.evidenceTrace.bySection.chase.slice(0, 3).entries()) {
    pushReceipt(receiptFromTrace(row, "CPS Chase"));
  }

  if (receipts.length < 6) {
    for (const [i, row] of view.evidenceState.rows.slice(0, 8).entries()) {
      if (receipts.length >= 10) break;
      pushReceipt(receiptFromEvidenceRow(row, i));
    }
  }

  if (chase) {
    for (const [i, item] of chase.primaryItems.slice(0, 4).entries()) {
      const r = receiptFromChaseItem(item, i);
      if (r) pushReceipt(r);
    }
  }

  const refusedOverstatements = parseRefusedOverstatements(view.mustNotOverstate);
  const familyCards = buildFamilyProofCards(view.evidenceState.rows, bundleHay, allegation);

  return {
    receipts: receipts.slice(0, 12),
    refusedOverstatements,
    familyCards,
    stateCounts: countStates(view.evidenceState.rows),
  };
}
