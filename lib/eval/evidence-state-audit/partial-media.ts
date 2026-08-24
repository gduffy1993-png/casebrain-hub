import { normalizeLabel } from "./normalize";

const PARTIAL_MARKERS = [
  "partial",
  "clip",
  "transcript",
  "short ",
  "cropped",
  "excerpt",
  "extract only",
  "pages ",
  "incomplete",
  "summary only",
  "summary extract",
];

const MEDIA_MARKERS = [
  "bwv",
  "body worn",
  "body-worn",
  "cctv",
  "video",
  "footage",
  "phone",
  "download",
  "screenshot",
  "extraction",
  "message",
];

/**
 * Partial clip/transcript/cropped-screenshot on bundle ≠ full media export served.
 * A served screenshot pack is a complete unit of its own kind — do not treat bare
 * "screenshot" as a partial marker (that forced every screenshot pack → incomplete).
 */
export function isPartialMediaLedgerLabel(label: string): boolean {
  const l = label.toLowerCase();
  // Explicit served-on-bundle schedule lines are not partial-media downgrades
  if (/\bserved on bundle\b/i.test(l) && !/\bpartial\b|\bextract only\b|\bclip\b/.test(l)) {
    return false;
  }
  // Served screenshot/message packs are complete for that modality
  if (
    /\b(screenshot\s+pack|message\s+pack|screenshots?)\b/i.test(l) &&
    /\bserved\b/i.test(l) &&
    !/\b(cropped|selected|partial|excerpt|extract only)\b/i.test(l)
  ) {
    return false;
  }
  if (l.includes("short") && (l.includes("bwv") || l.includes("clip"))) return true;
  if (l.includes("clip") && (l.includes("transcript") || l.includes("bwv") || l.includes("video"))) return true;
  if (l.includes("cropped") && (l.includes("message") || l.includes("screenshot"))) return true;
  if (l.includes("summary extract")) return true;
  if (l.includes("selected screenshot")) return true;
  if (l.includes("email exhibit summary")) return true;
  if (l.includes("database printout") && l.includes("insurance")) return true;
  // Phone/extraction *summary* is incomplete vs full download
  if (/\b(phone|extraction|download|message)\b/i.test(l) && /\bsummary\s+only\b|\bextraction\s+summary\b/i.test(l)) {
    return true;
  }

  const hasPartial = PARTIAL_MARKERS.some((m) => l.includes(m));
  const hasMedia = MEDIA_MARKERS.some((m) => l.includes(m));
  return hasPartial && hasMedia;
}

export function isAggregateLedgerLabel(label: string): boolean {
  const l = label.toLowerCase().trim();
  if (l.startsWith("served material |") || l.startsWith("served on bundle:")) return true;
  if (l.startsWith("*source section:") || l.startsWith("source section:")) return true;
  if (l.startsWith("*source b") || l.startsWith("source b (")) return true;
  if (l.startsWith("*source a") || l.startsWith("source a (")) return true;
  return false;
}

/** Drop PDF chrome / narrative paragraphs that are not evidence units. */
export function isNonEvidenceChromeLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return true;
  if (/^===\s*section:/i.test(t)) return true;
  if (/^statement of offence\b/i.test(t)) return true;
  if (isAggregateLedgerLabel(t)) return true;
  // Narrative body paragraphs pulled into the brief-plan ledger
  if (
    /^(the\s+)?(prosecution|complainant|messages|defence|defendant)\b/i.test(t) &&
    t.length > 50
  ) {
    return true;
  }
  // Long narrative prose without document/exhibit cues
  if (
    t.length > 90 &&
    !/\b(mg\d|mg6c\/|charge\s+sheet|cctv|bwv|phone|custody|interview|screenshot|subscriber|exhibit|pace|cad|999|download|extraction|transcript|recording)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/** Meta/chase clarification rows that must not bind to the MG6 document unit. */
export function isMg6ClarificationMetaLabel(label: string): boolean {
  const l = label.toLowerCase();
  if (!/\bmg6\b/.test(l)) return false;
  // Chase family labels: "MG6 / unused schedule clarification" and "MG6 / unused / schedule clarification"
  if (/mg6\s*\/\s*unused(?:\s*\/\s*|\s+)schedule\s+clarification/.test(l)) return true;
  if (/unused\s+schedule\s+clarification/.test(l)) return true;
  if (/disclosure\s+schedule\s+clarification/.test(l)) return true;
  return false;
}

/** Blended recording/transcript identity — not a single canonical unit. */
export function isRecordingTranscriptBlendLabel(label: string): boolean {
  return /recording\s*\/\s*transcript/i.test(label) || /transcript\s*\/\s*recording/i.test(label);
}

/** Custody/PACE blended identity. */
export function isCustodyPaceBlendLabel(label: string): boolean {
  return /full custody record\s*\/\s*pace material/i.test(label);
}

function labelIndicatesReferredOnly(label: string): boolean {
  const l = label.toLowerCase();
  if (/^referred\s+only\s*:/i.test(label.trim())) return true;
  if (/\breferred\s+only\b/.test(l)) return true;
  if (/\breferred\s+on\s+(?:mg6c?|schedule|index|disclosure)\b/.test(l)) return true;
  if (
    /\breferred\b/.test(l) &&
    /\b(?:export\s+not\s+served|not\s+attached|not\s+included|not\s+on\s+bundle)\b/.test(l)
  ) {
    return true;
  }
  return false;
}

export function inferLedgerRowExistence(
  label: string,
  bucket: "served" | "limited" | "missing",
): "served" | "incomplete" | "missing" | "referred_only" {
  // Explicit referred/listed-not-served language always wins (F01/F02)
  if (labelIndicatesReferredOnly(label)) return "referred_only";
  // Bundle index lines for charge / MG5 are on-file units (not disclosure gaps)
  if (
    /^(charge\s+sheet|mg5(\s+case\s+summary)?)\b/i.test(label.trim()) &&
    bucket !== "missing" &&
    !/\b(outstanding|not\s+served|draft|unsigned)\b/i.test(label)
  ) {
    return "served";
  }
  // Label that explicitly marks the unit served (e.g. "Screenshot pack — served")
  // must not be collapsed to incomplete merely because the brief-plan bucket is "limited".
  const explicitServed =
    /\bserved\b/i.test(label) &&
    !/\b(not\s+served|unserved|partially\s+served)\b/i.test(label);
  if (explicitServed) {
    return isPartialMediaLedgerLabel(label) ? "incomplete" : "served";
  }
  if (bucket === "missing") return "missing";
  if (isPartialMediaLedgerLabel(label)) return "incomplete";
  if (bucket === "limited") {
    // Limited bucket includes referred_only materials — do not collapse to incomplete
    return "incomplete";
  }
  return "served";
}

export function partialMediaNote(label: string): string {
  if (isPartialMediaLedgerLabel(label)) {
    return "Partial media on bundle — not full export; treat as incomplete for audit.";
  }
  return "Served on bundle — brief plan ledger.";
}

export function normalizeLedgerRowKey(label: string): string {
  return normalizeLabel(label);
}
