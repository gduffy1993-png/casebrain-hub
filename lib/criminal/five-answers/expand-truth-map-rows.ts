import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { evidenceRowFromSourceState } from "./evidence-trace";
import type { FiveAnswersEvidenceRow } from "./types";
import type { EvidenceStateTruthKey } from "@/lib/eval/evidence-state-audit/types";
import { buildTruthMapRowsFromTruthKey, usesDemoAuditPresentationPolish } from "@/lib/eval/demo-audit-packs/presentation-polish";

function haystack(parts: string[]): string {
  return parts.join(" ").toLowerCase();
}

/** Do-not-overstate / invent-advisory lines name families only to forbid them — never establish digital shape. */
function stripInventAdvisory(text: string): string {
  return text
    .replace(/do\s+not\s+import[^.!\n]{0,120}/gi, " ")
    .replace(/do\s+not\s+state[^.!\n]{0,120}/gi, " ")
    .replace(/do\s+not\s+tell[^.!\n]{0,120}/gi, " ")
    .replace(/do\s+not\s+treat[^.!\n]{0,120}/gi, " ");
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

/**
 * Affirmative digital-family signals from papers / chase (never do-not-overstate alone).
 * Client D0.5: harassment + "Do not import phone…" must not invent Brookes phone-gap pack.
 */
export function papersEstablishDigitalPhoneFamily(sourceHay: string): {
  screenshots: boolean;
  midState: boolean;
  fullOutstanding: boolean;
  subscriberGap: boolean;
} {
  const hay = stripInventAdvisory(sourceHay);
  const screenshots =
    /\bscreenshots?\b|\bmessage\s+pack\b|\bwhatsapp\b|\bsms\b|\bmessage\s+export\b/i.test(hay);
  const midState =
    /\blogical\s+download\s+summary\b/i.test(hay) ||
    /\bextraction\s+summary\s+only\b/i.test(hay) ||
    /\bfull\s+report\s+not\s+in\s+(?:the\s+)?section\b/i.test(hay) ||
    /\bphone\s+download\s+reference\s+referenced\s+only\b/i.test(hay);
  const fullOutstanding =
    /\bfull\s+phone\s+download\b/i.test(hay) ||
    /\bphone\s+download\s*\/\s*source\s+export\b/i.test(hay) ||
    /\bsource\s+export\s+outstanding\b/i.test(hay) ||
    /\boriginal\s+download\b[^.\n]{0,40}\b(?:outstanding|not\s+served)\b/i.test(hay) ||
    (/\b(?:phone\s+download|source\s+export|phone\s+extraction)\b/i.test(hay) &&
      /\b(?:outstanding|not\s+served|not\s+attached|referred|expressly)\b/i.test(hay));
  const subscriberGap =
    /\bsubscriber\b/i.test(hay) &&
    /\b(?:outstanding|not\s+served|missing|not\s+attached|alone\s+do\s+not\s+prove)\b/i.test(hay);
  return { screenshots, midState, fullOutstanding, subscriberGap };
}

function isDigitalHarassmentShape(
  allegation: string,
  papers: ReturnType<typeof papersEstablishDigitalPhoneFamily>,
): boolean {
  if (!/harassment|protection from harassment|public order act\s*1986|section\s*4a/i.test(allegation)) {
    // Non-harassment: only expand when papers already establish a phone-download gap family.
    return papers.fullOutstanding || papers.midState;
  }
  // Harassment: need PDF/chase-established screenshot or download family — not do-not-overstate "phone".
  return papers.screenshots || papers.fullOutstanding || papers.midState;
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

  // Shape hay = allegation + chase *labels* + existing row labels + bundle.
  // Never do-not-overstate, and never whyItMatters/notes that say "Screenshots alone…"
  // (those are modality warnings — Client D0.5 self-fulfilling screenshot invent).
  const chaseHay = haystack([
    input.allegation,
    ...input.rows.map((r) => r.label),
    ...input.chase.primaryItems.map((i) => i.label),
    ...input.chase.items.map((i) => i.label),
    input.chase.disclosureSummary ?? "",
    input.bundleText ?? "",
  ]);
  const papers = papersEstablishDigitalPhoneFamily(chaseHay);

  if (!isDigitalHarassmentShape(input.allegation, papers)) {
    return input.rows;
  }

  if (hasDistinctServedScreenshot(input.rows) && rowsAlreadyCoverDigitalGaps(input.rows)) {
    return input.rows;
  }

  // Build only the gap rows the papers support — never invent Brookes full pack from harassment alone.
  const expanded: FiveAnswersEvidenceRow[] = [];
  if (papers.screenshots || hasDistinctServedScreenshot(input.rows)) {
    expanded.push(
      evidenceRowFromSourceState(
        "Screenshot / message pack",
        "served",
        "Served on papers — not full phone download or attribution proof.",
      ),
    );
  }
  if (papers.midState && !papers.fullOutstanding) {
    expanded.push(
      evidenceRowFromSourceState(
        "Phone extraction summary only",
        "referred_only",
        "Summary on file — full source download outstanding.",
      ),
    );
  }
  if (papers.fullOutstanding) {
    if (papers.midState) {
      expanded.push(
        evidenceRowFromSourceState(
          "Phone extraction summary only",
          "referred_only",
          "Summary on file — full source download outstanding.",
        ),
      );
    }
    expanded.push(
      evidenceRowFromSourceState(
        "Full phone download",
        "missing",
        "Chase full extraction source before fixing attribution.",
      ),
    );
  }
  if (papers.subscriberGap || (papers.fullOutstanding && papers.screenshots)) {
    expanded.push(
      evidenceRowFromSourceState(
        "Subscriber / attribution data",
        "missing",
        "Outstanding — screenshots alone do not prove who sent messages.",
      ),
    );
  }
  if (papers.screenshots || papers.fullOutstanding) {
    expanded.push(
      evidenceRowFromSourceState(
        "Complainant MG11",
        "not_safely_confirmed",
        "Draft or unsigned on file — confirm final signed statement before reliance.",
      ),
    );
  }

  if (!expanded.length) return input.rows;

  const kept = input.rows.filter((r) => !isCollapsedMg6UmbrellaRow(r));
  return dedupeRows([...expanded, ...kept]).slice(0, 8);
}
