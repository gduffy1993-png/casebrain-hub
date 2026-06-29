import { normalizeLabel } from "./normalize";

/** Label refers to co-defendant / other-defendant material (MG6C/CO or explicit wording). */
export function isCoDefendantMaterialLabel(label: string): boolean {
  const n = normalizeLabel(label);
  if (!n) return false;
  if (n.includes("co defendant") || n.includes("other defendant")) return true;
  if (/\bmg6c co\b/.test(n) || n.includes("mg6c/co")) return true;
  return false;
}

/** Aggregate ledger line mixing multiple served items for this defendant workflow. */
export function isAggregateClientWorkflowLabel(label: string): boolean {
  const l = label.toLowerCase();
  return l.startsWith("served material |") || l.startsWith("served on bundle:");
}

export function stripCoDefendantFromAggregateLabel(label: string): string | null {
  if (!isAggregateClientWorkflowLabel(label)) return label;

  const lower = label.toLowerCase();
  const prefix = lower.startsWith("served material |")
    ? label.slice(0, label.toLowerCase().indexOf("|") + 1)
    : label.slice(0, "Served on bundle:".length);

  const body = label.slice(prefix.length);
  const parts = body
    .split(/[;,]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !isCoDefendantMaterialLabel(p));

  if (parts.length === 0) return null;
  return `${prefix} ${parts.join("; ")}`.replace(/\s+/g, " ").trim();
}

export function coDefendantSegregationNote(label: string): string {
  return `Co-defendant-only material (${compactCoDefLabel(label)}) — do not import to this defendant's case theory, client summary, or CPS chase.`;
}

function compactCoDefLabel(label: string): string {
  const trimmed = label.trim();
  const mg6 = /MG6C\/CO[^—]*—\s*(.+?)\s*—/i.exec(trimmed);
  if (mg6?.[1]) return mg6[1].trim();
  return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed;
}

/**
 * Dedicated MG6C/CO or explicitly segregated co-def row — not blended into client aggregates.
 */
export function isProperlySegregatedCoDefPrediction(
  predictionLabel: string,
  source?: string | null,
): boolean {
  if (!isCoDefendantMaterialLabel(predictionLabel)) return false;
  if (isAggregateClientWorkflowLabel(predictionLabel)) return false;

  const l = predictionLabel.toLowerCase();
  if (l.includes("mg6c/co") || l.includes("co-defendant-only") || l.includes("do not import")) {
    return true;
  }

  // Dedicated schedule row (MG6C/… — … —) rather than a generic chase label.
  if (/mg6c\/[a-z]{2,4}\s*[—-]/i.test(predictionLabel) && isCoDefendantMaterialLabel(predictionLabel)) {
    return true;
  }

  if (source && isCoDefendantMaterialLabel(source) && !isAggregateClientWorkflowLabel(source)) {
    return true;
  }

  return false;
}

/** Co-def material referenced on a non-co-def chase / interview surface. */
export function isCoDefBlendedIntoClientSurface(
  predictionLabel: string,
  source?: string | null,
): boolean {
  if (isProperlySegregatedCoDefPrediction(predictionLabel, source)) return false;

  if (isAggregateClientWorkflowLabel(predictionLabel) && isCoDefendantMaterialLabel(predictionLabel)) {
    return true;
  }

  if (source && isCoDefendantMaterialLabel(source) && !isCoDefendantMaterialLabel(predictionLabel)) {
    return true;
  }

  return false;
}

export function relabelCoDefendantLedgerRow(label: string): string {
  if (!isCoDefendantMaterialLabel(label) || isAggregateClientWorkflowLabel(label)) return label;
  if (label.toLowerCase().includes("not this defendant")) return label;

  let next = label.replace(/\s*—\s*—\s*/g, " — ");
  if (/MG6C\/CO/i.test(next)) {
    next = next.replace(/MG6C\/CO\s*—/i, "MG6C/CO — co-defendant-only —");
    if (!/not this defendant/i.test(next)) {
      next = next.replace(
        /\s*—\s*(served on bundle|referred on MG6|outstanding)/i,
        " — not this defendant — $1",
      );
    }
    return next.replace(/\s+/g, " ").trim();
  }
  return `Co-defendant-only — ${next} — not this defendant`;
}
