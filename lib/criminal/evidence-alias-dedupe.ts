/**
 * Scope-aware evidence alias dedupe.
 * Collapse only genuine semantic duplicates with compatible scope AND status.
 * Never hide served-vs-missing / still-vs-master / draft-vs-final distinctions.
 */

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { normalizeSolicitorLineKey } from "@/lib/criminal/solicitor-display-dedupe";

/** Alias families — membership alone is NOT sufficient to collapse. */
const EVIDENCE_ALIAS_GROUPS: string[][] = [
  ["mg11", "witness statement", "complainant statement", "complainant mg11"],
  ["bwv", "body worn", "body-worn", "bodycam", "body cam"],
  ["cctv", "master cctv", "cctv footage", "camera footage", "cctv still"],
  ["phone download", "full phone download", "source extraction", "phone extraction"],
  ["subscriber", "attribution data", "account data", "sim data"],
];

export type EvidenceScopeTag =
  | "draft_or_unsigned"
  | "final_signed"
  | "stills_or_screenshots"
  | "master_or_full_media"
  | "extract_or_summary"
  | "full_export_or_download"
  | "transcript_or_log_only"
  | "generic";

const SCOPE_PATTERNS: Array<{ tag: EvidenceScopeTag; re: RegExp }> = [
  { tag: "draft_or_unsigned", re: /\b(draft|unsigned|provisional\s+statement)\b/i },
  { tag: "final_signed", re: /\b(final\s+signed|signed\s+mg11|final\s+mg11)\b/i },
  { tag: "stills_or_screenshots", re: /\b(stills?|screenshots?|still\s+images?)\b/i },
  // Master/full media — not bare "full … export" (that is full_export_or_download)
  {
    tag: "master_or_full_media",
    re: /\b(master(?:\s+footage|\s+cctv|\s+export)?|full\s+(?:video|footage|bwv)|full\s+cctv\s+footage)\b/i,
  },
  { tag: "extract_or_summary", re: /\b(extract(?:ion)?(?:\s+summary)?|source\s+material|summary\s+only|message\s+pack)\b/i },
  {
    tag: "full_export_or_download",
    re: /\b(full\s+(?:phone\s+)?download|full\s+(?:cctv\s+|bwv\s+|video\s+)?export|complete\s+extraction)\b/i,
  },
  { tag: "transcript_or_log_only", re: /\b(transcript|log\s+only|log\s+entry|referred\s+only)\b/i },
];

/** Scopes that must never collapse into each other even within the same alias family. */
const INCOMPATIBLE_SCOPE_PAIRS: Array<[EvidenceScopeTag, EvidenceScopeTag]> = [
  ["draft_or_unsigned", "final_signed"],
  ["stills_or_screenshots", "master_or_full_media"],
  ["stills_or_screenshots", "full_export_or_download"],
  ["extract_or_summary", "full_export_or_download"],
  ["transcript_or_log_only", "master_or_full_media"],
  ["transcript_or_log_only", "full_export_or_download"],
  ["master_or_full_media", "full_export_or_download"],
];

export function evidenceScopeTags(label: string): EvidenceScopeTag[] {
  const tags = SCOPE_PATTERNS.filter(({ re }) => re.test(label)).map(({ tag }) => tag);
  return tags.length ? tags : ["generic"];
}

export function scopesCompatible(a: EvidenceScopeTag[], b: EvidenceScopeTag[]): boolean {
  for (const [x, y] of INCOMPATIBLE_SCOPE_PAIRS) {
    if ((a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))) return false;
  }
  // stills vs full export / download
  if (a.includes("stills_or_screenshots") && b.includes("full_export_or_download")) return false;
  if (b.includes("stills_or_screenshots") && a.includes("full_export_or_download")) return false;
  return true;
}

export function existenceCompatible(
  a: FiveAnswersEvidenceRow["existence"] | string,
  b: FiveAnswersEvidenceRow["existence"] | string,
): boolean {
  return String(a) === String(b);
}

function aliasFamilyKey(label: string): string {
  const n = normalizeSolicitorLineKey(label);
  if (!n) return "";
  for (const group of EVIDENCE_ALIAS_GROUPS) {
    if (
      group.some((g) => {
        if (n === g) return true;
        if (n.length >= 4 && (n.includes(g) || g.includes(n))) {
          const shorter = n.length <= g.length ? n : g;
          const longer = n.length <= g.length ? g : n;
          const idx = longer.indexOf(shorter);
          if (idx < 0) return false;
          const before = idx === 0 || /[^a-z0-9]/.test(longer[idx - 1]!);
          const after =
            idx + shorter.length >= longer.length || /[^a-z0-9]/.test(longer[idx + shorter.length]!);
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

/**
 * Collapse key: family + existence. Scope compatibility is checked at merge time
 * so generic↔specific aliases can still collapse when compatible, while
 * extract↔full-export / stills↔master / draft↔final never collapse.
 */
export function evidenceDedupeKey(row: Pick<FiveAnswersEvidenceRow, "label" | "existence">): string {
  const family = aliasFamilyKey(row.label);
  return `${family}|ex:${row.existence}`;
}

function dedupeByExactLabel(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
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

/** Deduplicate evidence rows — only genuine duplicates with compatible scope and status. */
export function dedupeEvidenceAliases(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  return dedupeEvidenceAliasesWithProvenance(rows).kept;
}

export type EvidenceAliasProvenanceGroup = {
  aliasKey: string;
  kept: FiveAnswersEvidenceRow;
  collapsedAliases: FiveAnswersEvidenceRow[];
};

export function dedupeEvidenceAliasesWithProvenance(rows: FiveAnswersEvidenceRow[]): {
  kept: FiveAnswersEvidenceRow[];
  groups: EvidenceAliasProvenanceGroup[];
} {
  const byLabel = dedupeByExactLabel(rows ?? []);
  const groupsByKey = new Map<string, FiveAnswersEvidenceRow[]>();
  for (const row of byLabel) {
    const baseKey = evidenceDedupeKey(row);
    if (!baseKey) continue;
    // Find an existing bucket with compatible scopes, else open a scope-partitioned key.
    let placed = false;
    for (const [key, list] of groupsByKey) {
      if (!key.startsWith(`${baseKey}|scope:`) && key !== baseKey) continue;
      const kept = list[0]!;
      if (
        existenceCompatible(kept.existence, row.existence) &&
        scopesCompatible(evidenceScopeTags(kept.label), evidenceScopeTags(row.label))
      ) {
        list.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) {
      const scopes = evidenceScopeTags(row.label).slice().sort().join("+");
      const partitioned = `${baseKey}|scope:${scopes}|keep:${normalizeSolicitorLineKey(row.label)}`;
      // Prefer stable base key for the first member of a compatible family
      if (![...groupsByKey.keys()].some((k) => k === baseKey || k.startsWith(`${baseKey}|scope:`))) {
        groupsByKey.set(baseKey, [row]);
      } else {
        groupsByKey.set(partitioned, [row]);
      }
    }
  }
  const kept: FiveAnswersEvidenceRow[] = [];
  const groups: EvidenceAliasProvenanceGroup[] = [];
  for (const [key, list] of groupsByKey) {
    const first = list[0]!;
    kept.push(first);
    groups.push({
      aliasKey: key,
      kept: first,
      collapsedAliases: list.slice(1),
    });
  }
  return { kept, groups };
}

/** Family-only key for provenance matching (not for collapse). */
export function evidenceAliasKeyForLabel(label: string): string {
  return aliasFamilyKey(label);
}
