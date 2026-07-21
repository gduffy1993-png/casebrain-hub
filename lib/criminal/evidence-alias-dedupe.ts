/**
 * Evidence row alias dedupe — shared by canonical build and matter-state VM.
 * Does not import overview-presentation (avoids cycles with canonical build).
 */

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { normalizeSolicitorLineKey } from "@/lib/criminal/solicitor-display-dedupe";

const EVIDENCE_ALIAS_GROUPS: string[][] = [
  ["mg11", "witness statement", "complainant statement", "complainant mg11"],
  ["bwv", "body worn", "body-worn", "bodycam", "body cam"],
  ["cctv", "master cctv", "cctv footage", "camera footage"],
  ["phone download", "full phone download", "source extraction", "phone extraction"],
  ["subscriber", "attribution data", "account data", "sim data"],
];

function aliasKey(label: string): string {
  const n = normalizeSolicitorLineKey(label);
  if (!n) return "";
  for (const group of EVIDENCE_ALIAS_GROUPS) {
    if (
      group.some((g) => {
        if (n === g) return true;
        // Token / phrase containment — require the shorter side to be a whole token run
        if (n.length >= 4 && (n.includes(g) || g.includes(n))) {
          const shorter = n.length <= g.length ? n : g;
          const longer = n.length <= g.length ? g : n;
          // Reject substring matches that are not on token boundaries (e.g. "extra" in "extraction")
          const idx = longer.indexOf(shorter);
          if (idx < 0) return false;
          const before = idx === 0 || /[^a-z0-9]/.test(longer[idx - 1]!);
          const after = idx + shorter.length >= longer.length || /[^a-z0-9]/.test(longer[idx + shorter.length]!);
          return before && after;
        }
        return false;
      })
    ) {
      return `alias:${group[0]}`;
    }
  }
  return n;
}

function dedupeByLabel(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  const seen = new Set<string>();
  const out: FiveAnswersEvidenceRow[] = [];
  for (const row of rows) {
    const label = row?.label?.trim() ?? "";
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Deduplicate evidence rows by alias groups before display/counts. */
export function dedupeEvidenceAliases(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  const byLabel = dedupeByLabel(rows ?? []);
  const seen = new Set<string>();
  const out: FiveAnswersEvidenceRow[] = [];
  for (const row of byLabel) {
    const key = aliasKey(row.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
