/**
 * One canonical matter state for solicitor tabs + exports.
 * Evidence counts, chase totals, MG11 status — same model everywhere.
 */

import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { countEvidenceStatesForDisplay, dedupeEvidenceRowsByLabel } from "@/lib/criminal/overview-presentation";
import { normalizeSolicitorLineKey } from "@/lib/criminal/solicitor-display-dedupe";

export type EvidenceExistenceBucket =
  | "served"
  | "referred"
  | "missing"
  | "incomplete"
  | "notSafelyConfirmed";

export type ChaseStatusBucket =
  | "total"
  | "overdue"
  | "dueSoon"
  | "chased"
  | "received"
  | "notStarted";

export type Mg11Status = "served" | "draft_or_unsigned" | "referred" | "missing" | "not_on_file";

export type SolicitorMatterStateVm = {
  evidence: {
    rows: FiveAnswersEvidenceRow[];
    counts: Record<EvidenceExistenceBucket, number>;
  };
  chase: {
    counts: Record<ChaseStatusBucket, number>;
  };
  mg11: {
    status: Mg11Status;
    label: string;
  };
  /** Stable fingerprint for cross-tab equality assertions. */
  fingerprint: string;
};

export type ChaseCounterInput = {
  total: number;
  overdue: number;
  dueSoon: number;
  chased: number;
  received: number;
  notStarted: number;
};

const EVIDENCE_ALIAS_GROUPS: string[][] = [
  ["mg11", "witness statement", "complainant statement", "complainant mg11"],
  ["bwv", "body worn", "body-worn", "bodycam", "body cam"],
  ["cctv", "master cctv", "cctv footage", "camera footage"],
  ["phone download", "full phone download", "source extraction", "phone extraction"],
  ["subscriber", "attribution data", "account data", "sim data"],
];

function aliasKey(label: string): string {
  const n = normalizeSolicitorLineKey(label);
  for (const group of EVIDENCE_ALIAS_GROUPS) {
    if (group.some((g) => n.includes(g) || g.includes(n))) {
      return `alias:${group[0]}`;
    }
  }
  return n;
}

/** Deduplicate evidence rows by alias groups before display/counts. */
export function dedupeEvidenceAliases(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  const byLabel = dedupeEvidenceRowsByLabel(rows);
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

function resolveMg11Status(rows: FiveAnswersEvidenceRow[]): { status: Mg11Status; label: string } {
  const mg11 = rows.filter((r) => /\bmg11\b|witness statement|complainant statement/i.test(r.label));
  if (!mg11.length) {
    return { status: "not_on_file", label: "MG11 not on file" };
  }
  if (mg11.some((r) => r.existence === "served")) {
    return { status: "served", label: "MG11 served" };
  }
  if (mg11.some((r) => r.existence === "referred_only")) {
    return { status: "referred", label: "MG11 referred only" };
  }
  if (
    mg11.some((r) =>
      /draft|unsigned|incomplete|not_safely_confirmed|unknown/i.test(`${r.existence} ${r.note ?? ""}`),
    )
  ) {
    return { status: "draft_or_unsigned", label: "MG11 draft / unsigned on papers" };
  }
  if (mg11.some((r) => r.existence === "missing")) {
    return { status: "missing", label: "MG11 missing" };
  }
  return { status: "draft_or_unsigned", label: "MG11 needs solicitor review" };
}

function fingerprintOf(vm: Omit<SolicitorMatterStateVm, "fingerprint">): string {
  const e = vm.evidence.counts;
  const c = vm.chase.counts;
  return [
    `e:${e.served}/${e.referred}/${e.missing}/${e.incomplete}/${e.notSafelyConfirmed}`,
    `c:${c.total}/${c.overdue}/${c.dueSoon}/${c.chased}/${c.received}/${c.notStarted}`,
    `m:${vm.mg11.status}`,
  ].join("|");
}

/**
 * Build the single matter-state VM consumed by Overview, Court, Papers, Summary, Chase, exports.
 */
export function buildSolicitorMatterStateVm(input: {
  evidenceRows: FiveAnswersEvidenceRow[];
  chaseCounters: ChaseCounterInput;
}): SolicitorMatterStateVm {
  const rows = dedupeEvidenceAliases(input.evidenceRows);
  const counts = countEvidenceStatesForDisplay(rows);
  const chase = {
    total: input.chaseCounters.total,
    overdue: input.chaseCounters.overdue,
    dueSoon: input.chaseCounters.dueSoon,
    chased: input.chaseCounters.chased,
    received: input.chaseCounters.received,
    notStarted: input.chaseCounters.notStarted,
  };
  const mg11 = resolveMg11Status(rows);
  const base = {
    evidence: { rows, counts },
    chase: { counts: chase },
    mg11,
  };
  return { ...base, fingerprint: fingerprintOf(base) };
}

export function formatEvidenceCountsLine(counts: Record<EvidenceExistenceBucket, number>): string {
  const parts: string[] = [];
  if (counts.served) parts.push(`${counts.served} served`);
  if (counts.referred) parts.push(`${counts.referred} referred`);
  if (counts.missing) parts.push(`${counts.missing} missing`);
  if (counts.incomplete) parts.push(`${counts.incomplete} incomplete`);
  if (counts.notSafelyConfirmed) parts.push(`${counts.notSafelyConfirmed} not safely confirmed`);
  return parts.length ? parts.join(" · ") : "No evidence rows on file";
}
