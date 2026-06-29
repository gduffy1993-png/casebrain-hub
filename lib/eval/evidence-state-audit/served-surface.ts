import { labelMatchScore, normalizeLabel } from "./normalize";
import type { CaseBrainAuditOutput, TruthKeyEvidenceItem } from "./types";

const SERVED_NOT_SURFACED_PATTERNS: Array<{ re: RegExp; kind: string }> = [
  { re: /\bmg11\b/i, kind: "mg11" },
  { re: /\bmg5\b/i, kind: "mg5" },
  { re: /charge sheet/i, kind: "charge_sheet" },
  { re: /indictment/i, kind: "indictment" },
  { re: /officer statement/i, kind: "officer_statement" },
];

export function servedItemKind(label: string): string | null {
  for (const { re, kind } of SERVED_NOT_SURFACED_PATTERNS) {
    if (re.test(label)) return kind;
  }
  return null;
}

export function isServedTruthItem(item: TruthKeyEvidenceItem): boolean {
  return item.correct_evidence_state === "served";
}

/** Chase-first H5 may ledger-serve MG11/MG5 without a dedicated chase row. */
export function hasServedSourceAnchorInOutput(
  truthItem: TruthKeyEvidenceItem,
  output: CaseBrainAuditOutput,
): boolean {
  const kind = servedItemKind(truthItem.evidence_item);
  if (!kind) return false;

  const needles = [normalizeLabel(truthItem.evidence_item)];
  if (kind === "mg11") needles.push("mg11", "witness", "complainant");
  if (kind === "mg5") needles.push("mg5");
  if (kind === "charge_sheet") needles.push("charge", "offence");
  if (kind === "indictment") needles.push("indictment");
  if (kind === "officer_statement") needles.push("mg11", "officer", "witness");

  const rows = [
    ...(output.fiveAnswersEvidenceRows ?? []).map((r) => r.label),
    ...(output.evidenceStates ?? []).map((r) => r.label),
  ];

  return rows.some((label) => {
    const n = normalizeLabel(label);
    if (!n) return false;
    if (labelMatchScore(truthItem.evidence_item, label) >= 0.45) return true;
    return needles.some((needle) => needle.length >= 3 && n.includes(needle));
  });
}

export function isServedItemNotSurfacedInH5(
  item: TruthKeyEvidenceItem,
  matched: boolean,
  output: CaseBrainAuditOutput,
): boolean {
  if (!isServedTruthItem(item) || matched) return false;
  return hasServedSourceAnchorInOutput(item, output);
}
