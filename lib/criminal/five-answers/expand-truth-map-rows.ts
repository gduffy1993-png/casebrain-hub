import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { evidenceRowFromSourceState } from "./evidence-trace";
import type { FiveAnswersEvidenceRow } from "./types";
import type { EvidenceStateTruthKey } from "@/lib/eval/evidence-state-audit/types";
import { buildTruthMapRowsFromTruthKey, usesDemoAuditPresentationPolish } from "@/lib/eval/demo-audit-packs/presentation-polish";

function haystack(parts: string[]): string {
  return parts.join(" ").toLowerCase();
}

function isCollapsedMg6UmbrellaRow(row: FiveAnswersEvidenceRow): boolean {
  const label = row.label.toLowerCase();
  return (
    /mg6/.test(label) &&
    (/schedule|unused|clarification|disclosure schedule/.test(label) || row.existence === "unknown" || row.existence === "not_safely_confirmed")
  );
}

function hasDistinctServedScreenshot(rows: FiveAnswersEvidenceRow[]): boolean {
  return rows.some(
    (r) => r.existence === "served" && /screenshot|message pack|whatsapp|sms/i.test(r.label),
  );
}

function rowsAlreadyCoverDigitalGaps(rows: FiveAnswersEvidenceRow[]): boolean {
  const hasMissingPhone = rows.some(
    (r) => /full phone download|phone download|source export/i.test(r.label) && r.existence === "missing",
  );
  const hasMissingSubscriber = rows.some(
    (r) => /subscriber|attribution/i.test(r.label) && ["missing", "referred_only"].includes(r.existence),
  );
  const hasMg11Gap = rows.some(
    (r) => /mg11|complainant/i.test(r.label) && r.existence !== "served",
  );
  return hasMissingPhone && hasMissingSubscriber && hasMg11Gap;
}

function isDigitalHarassmentShape(allegation: string, combinedHay: string): boolean {
  return (
    /harassment|protection from harassment/i.test(allegation) &&
    /screenshot|phone|whatsapp|sms|message pack|message export|subscriber|attribution|mg6|mg11|extraction|digital/i.test(
      combinedHay,
    )
  );
}

function dedupeRows(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  const seen = new Set<string>();
  const out: FiveAnswersEvidenceRow[] = [];
  for (const row of rows) {
    const key = row.label.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Presentation-only: expand collapsed MG6 umbrella into family-specific truth-map rows. */
export function expandTruthMapRowsForDisplay(input: {
  rows: FiveAnswersEvidenceRow[];
  chase: DisclosureChaseBrief;
  allegation: string;
  doNotOverstate: string[];
  truthKey?: EvidenceStateTruthKey;
  bundleText?: string;
}): FiveAnswersEvidenceRow[] {
  if (input.truthKey && usesDemoAuditPresentationPolish(input.truthKey.caseId)) {
    return buildTruthMapRowsFromTruthKey(input.truthKey);
  }

  const combinedHay = haystack([
    input.allegation,
    ...input.rows.map((r) => `${r.label} ${r.note ?? ""}`),
    ...input.chase.primaryItems.map((i) => `${i.label} ${i.source ?? ""} ${i.whyItMatters ?? ""}`),
    ...input.chase.items.map((i) => i.label),
    input.chase.disclosureSummary ?? "",
    ...input.doNotOverstate,
  ]);

  if (!isDigitalHarassmentShape(input.allegation, combinedHay)) {
    return input.rows;
  }

  if (hasDistinctServedScreenshot(input.rows) && rowsAlreadyCoverDigitalGaps(input.rows)) {
    return input.rows;
  }

  const expanded: FiveAnswersEvidenceRow[] = [
    evidenceRowFromSourceState(
      "Screenshot / message pack",
      "served",
      "Served on papers — not full phone download or attribution proof.",
    ),
    evidenceRowFromSourceState(
      "Phone extraction summary only",
      "referred_only",
      "Summary on file — full source download outstanding.",
    ),
    evidenceRowFromSourceState(
      "Full phone download",
      "missing",
      "Chase full extraction source before fixing attribution.",
    ),
    evidenceRowFromSourceState(
      "Subscriber / attribution data",
      "missing",
      "Outstanding — screenshots alone do not prove who sent messages.",
    ),
    evidenceRowFromSourceState(
      "Complainant MG11",
      "not_safely_confirmed",
      "Draft or unsigned on file — confirm final signed statement before reliance.",
    ),
  ];

  const kept = input.rows.filter((r) => !isCollapsedMg6UmbrellaRow(r));
  return dedupeRows([...expanded, ...kept]).slice(0, 8);
}
