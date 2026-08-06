/**
 * Shared solicitor-visible evidence view — overview counts + truth map must
 * consume the same canonical rows (deduped + mapped). Provenance of collapsed
 * aliases is retained separately and must not drive displayed totals.
 */

import {
  buildCanonicalMatterStateV1,
  mapRawExistenceToCanonical,
  EXISTENCE_MAPPING_POLICY_ID,
  type CanonicalEvidenceCounts,
  type CanonicalEvidenceExistence,
  type CanonicalEvidenceItem,
} from "@/lib/criminal/canonical-matter-state";
import {
  dedupeEvidenceAliasesWithProvenance,
  evidenceAliasKeyForLabel,
} from "@/lib/criminal/evidence-alias-dedupe";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { partitionEvidenceForSolicitorDisplay } from "@/lib/criminal/solicitor-family-provenance";
import { preserveProtectedAcronyms } from "@/lib/criminal/solicitor-visible-quality";
import { solicitorDisplayLabel } from "@/lib/criminal/solicitor-visible-sanitization";

export { EXISTENCE_MAPPING_POLICY_ID, mapRawExistenceToCanonical };

const CANONICAL_STATE_LABEL: Record<CanonicalEvidenceExistence, string> = {
  served: "Served",
  referred_only: "Referred only",
  missing: "Missing",
  incomplete: "Incomplete",
  not_safely_confirmed: "Not safely confirmed",
};

export type SolicitorVisibleEvidenceDisplayRow = {
  id: string;
  label: string;
  existence: CanonicalEvidenceExistence;
  displayState: string;
};

export type SolicitorVisibleEvidenceAliasExpansion = {
  canonicalId: string;
  canonicalLabel: string;
  canonicalExistence: CanonicalEvidenceExistence;
  sourceRows: Array<{ label: string; rawExistence: string; mappedExistence: CanonicalEvidenceExistence }>;
};

export type SolicitorVisibleEvidenceView = {
  mappingPolicyId: typeof EXISTENCE_MAPPING_POLICY_ID;
  fingerprint: string;
  counts: CanonicalEvidenceCounts;
  displayItems: SolicitorVisibleEvidenceDisplayRow[];
  aliasExpansion: SolicitorVisibleEvidenceAliasExpansion[];
  overviewCountsText: string;
  truthMapText: string;
  aliasExpansionText: string;
  /** Rows quarantined for family incompatibility — never copyable on truth_map. */
  quarantinedItems: SolicitorVisibleEvidenceDisplayRow[];
  quarantineText: string;
};

export function formatCanonicalEvidenceState(existence: CanonicalEvidenceExistence): string {
  return CANONICAL_STATE_LABEL[existence];
}

export function formatOverviewCountsLine(counts: CanonicalEvidenceCounts): string {
  return `Served ${counts.served} · Referred ${counts.referred} · Missing ${counts.missing} · Incomplete ${counts.incomplete} · Not safely confirmed ${counts.notSafelyConfirmed}`;
}

export function formatTruthMapFromCanonicalItems(items: CanonicalEvidenceItem[]): string {
  if (!items.length) return "";
  return items
    .map(
      (item) =>
        `• ${preserveProtectedAcronyms(solicitorDisplayLabel(item.label))} — ${formatCanonicalEvidenceState(item.existence)}`,
    )
    .join("\n");
}

/** Derive overview-category counts from displayed truth-map rows (canonical states only). */
export function countOverviewCategoriesFromDisplayItems(
  items: Array<{ existence: CanonicalEvidenceExistence }>,
): CanonicalEvidenceCounts {
  const counts: CanonicalEvidenceCounts = {
    served: 0,
    referred: 0,
    missing: 0,
    incomplete: 0,
    notSafelyConfirmed: 0,
  };
  for (const item of items) {
    switch (item.existence) {
      case "served":
        counts.served += 1;
        break;
      case "referred_only":
        counts.referred += 1;
        break;
      case "missing":
        counts.missing += 1;
        break;
      case "incomplete":
        counts.incomplete += 1;
        break;
      case "not_safely_confirmed":
        counts.notSafelyConfirmed += 1;
        break;
    }
  }
  return counts;
}

export function parseOverviewCountsLine(text: string): CanonicalEvidenceCounts | null {
  const classic = text.match(
    /Served\s+(\d+)\s*·\s*Referred\s+(\d+)\s*·\s*Missing\s+(\d+)\s*·\s*Incomplete\s+(\d+)\s*·\s*Not safely confirmed\s+(\d+)/i,
  );
  if (classic) {
    return {
      served: Number(classic[1]),
      referred: Number(classic[2]),
      missing: Number(classic[3]),
      incomplete: Number(classic[4]),
      notSafelyConfirmed: Number(classic[5]),
    };
  }
  // Compatible solicitor view: "N served · M referred · …"
  const compatible = text.match(
    /(\d+)\s+served\s*·\s*(\d+)\s+referred\s*·\s*(\d+)\s+missing\s*·\s*(\d+)\s+incomplete(?:\s*·\s*(\d+)\s+not safely confirmed)?/i,
  );
  if (compatible) {
    return {
      served: Number(compatible[1]),
      referred: Number(compatible[2]),
      missing: Number(compatible[3]),
      incomplete: Number(compatible[4]),
      notSafelyConfirmed: Number(compatible[5] ?? 0),
    };
  }
  return null;
}

export function parseTruthMapCanonicalStates(text: string): CanonicalEvidenceExistence[] {
  const out: CanonicalEvidenceExistence[] = [];
  for (const line of text.split("\n")) {
    const t = line.replace(/^([•\-*]|\d+\.)\s+/, "").trim();
    if (!t || /^Total\s+\d+/i.test(t)) continue;
    const parts = t.split(/\s+[—–-]\s+/);
    const state = (parts[parts.length - 1] ?? "").trim().toLowerCase();
    if (state === "served") out.push("served");
    else if (state === "referred only" || state === "referred") out.push("referred_only");
    else if (state === "missing") out.push("missing");
    else if (state === "incomplete") out.push("incomplete");
    else if (state === "not safely confirmed") out.push("not_safely_confirmed");
  }
  return out;
}

export function assertCountsEqual(
  a: CanonicalEvidenceCounts,
  b: CanonicalEvidenceCounts,
  label = "counts",
): void {
  const keys: (keyof CanonicalEvidenceCounts)[] = [
    "served",
    "referred",
    "missing",
    "incomplete",
    "notSafelyConfirmed",
  ];
  for (const k of keys) {
    if (a[k] !== b[k]) {
      throw new Error(`${label} mismatch on ${k}: ${a[k]} !== ${b[k]}`);
    }
  }
}

/**
 * Build the single solicitor-visible evidence view shared by overview_counts + truth_map.
 * Deduplication is preserved; collapsed aliases remain in aliasExpansion only.
 * When allegation/auditFamily are provided, family-incompatible rows are quarantined
 * and excluded from copyable overview/truth_map counts.
 */
export function buildSolicitorVisibleEvidenceView(
  evidenceRows: FiveAnswersEvidenceRow[],
  opts?: { allegation?: string | null; auditFamily?: string | null },
): SolicitorVisibleEvidenceView {
  const partition = opts
    ? partitionEvidenceForSolicitorDisplay({
        allegation: opts.allegation,
        auditFamily: opts.auditFamily,
        evidenceRows,
      })
    : {
        compatible: evidenceRows,
        quarantined: [] as FiveAnswersEvidenceRow[],
      };

  const provenance = dedupeEvidenceAliasesWithProvenance(partition.compatible);
  const canonical = buildCanonicalMatterStateV1({
    evidenceRows: partition.compatible,
    chaseItems: [],
  });
  const displayItems: SolicitorVisibleEvidenceDisplayRow[] = canonical.evidence.items.map((item) => ({
    id: item.id,
    label: item.label,
    existence: item.existence,
    displayState: formatCanonicalEvidenceState(item.existence),
  }));

  const quarantinedItems: SolicitorVisibleEvidenceDisplayRow[] = partition.quarantined.map((row, idx) => {
    const mapped = mapRawExistenceToCanonical(String(row.existence));
    return {
      id: `quarantine_${idx}_${row.label.slice(0, 24)}`,
      label: row.label,
      existence: mapped,
      displayState: formatCanonicalEvidenceState(mapped),
    };
  });

  const aliasExpansion: SolicitorVisibleEvidenceAliasExpansion[] = canonical.evidence.items.map((item) => {
    const familyKey = evidenceAliasKeyForLabel(item.label);
    const group =
      provenance.groups.find((g) => g.kept.label === item.label) ??
      provenance.groups.find((g) => g.aliasKey === familyKey || g.aliasKey.startsWith(`${familyKey}|`));
    const sourceRows = (
      group ? [group.kept, ...group.collapsedAliases] : [{ label: item.label, existence: item.existence }]
    ).map((row) => {
      const raw = String((row as FiveAnswersEvidenceRow).existence ?? "");
      return {
        label: row.label,
        rawExistence: raw || item.existence,
        mappedExistence: raw ? mapRawExistenceToCanonical(raw) : item.existence,
      };
    });
    return {
      canonicalId: item.id,
      canonicalLabel: item.label,
      canonicalExistence: item.existence,
      sourceRows,
    };
  });

  const derived = countOverviewCategoriesFromDisplayItems(displayItems);
  assertCountsEqual(canonical.evidence.counts, derived, "canonical.counts vs displayItems");

  const overviewCountsText = formatOverviewCountsLine(canonical.evidence.counts);
  const truthMapText = formatTruthMapFromCanonicalItems(canonical.evidence.items);
  const aliasExpansionText = aliasExpansion
    .filter((g) => g.sourceRows.length > 1)
    .map((g) => {
      const sources = g.sourceRows
        .map((s) => `${solicitorDisplayLabel(s.label)} [${s.rawExistence}→${s.mappedExistence}]`)
        .join("; ");
      return `• ${preserveProtectedAcronyms(solicitorDisplayLabel(g.canonicalLabel))} ← ${sources}`;
    })
    .join("\n");

  const quarantineText = quarantinedItems.length
    ? quarantinedItems
        .map(
          (item) =>
            `• ${preserveProtectedAcronyms(solicitorDisplayLabel(item.label))} — ${item.displayState} [quarantined — family incompatible; not for copy]`,
        )
        .join("\n")
    : "";

  // Invariant on rendered strings
  const parsedOverview = parseOverviewCountsLine(overviewCountsText);
  if (!parsedOverview) throw new Error("overviewCountsText failed to parse");
  assertCountsEqual(parsedOverview, canonical.evidence.counts, "overview line vs canonical");
  if (truthMapText) {
    const fromMap = countOverviewCategoriesFromDisplayItems(
      parseTruthMapCanonicalStates(truthMapText).map((existence) => ({ existence })),
    );
    assertCountsEqual(fromMap, canonical.evidence.counts, "truth_map line vs canonical");
  }

  return {
    mappingPolicyId: EXISTENCE_MAPPING_POLICY_ID,
    fingerprint: canonical.fingerprint,
    counts: canonical.evidence.counts,
    displayItems,
    aliasExpansion,
    overviewCountsText,
    truthMapText,
    aliasExpansionText:
      aliasExpansionText ||
      "(no alias collapses — every source row maps 1:1 onto a displayed canonical item)",
    quarantinedItems,
    quarantineText,
  };
}
