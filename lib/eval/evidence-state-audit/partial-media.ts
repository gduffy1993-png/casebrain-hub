import { normalizeLabel } from "./normalize";

const PARTIAL_MARKERS = [
  "partial",
  "clip",
  "transcript",
  "short ",
  "cropped",
  "screenshot",
  "excerpt",
  "extract only",
  "pages ",
  "incomplete",
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

/** Partial clip/transcript/screenshot on bundle ≠ full media export served. */
export function isPartialMediaLedgerLabel(label: string): boolean {
  const l = label.toLowerCase();
  // Explicit served-on-bundle schedule lines are not partial-media downgrades
  if (/\bserved on bundle\b/i.test(l) && !/\bpartial\b|\bextract only\b|\bclip\b/.test(l)) {
    return false;
  }
  if (l.includes("short") && (l.includes("bwv") || l.includes("clip"))) return true;
  if (l.includes("clip") && (l.includes("transcript") || l.includes("bwv") || l.includes("video"))) return true;
  if (l.includes("cropped") && (l.includes("message") || l.includes("screenshot"))) return true;
  if (l.includes("summary extract")) return true;
  if (l.includes("selected screenshot")) return true;
  if (l.includes("email exhibit summary")) return true;
  if (l.includes("database printout") && l.includes("insurance")) return true;

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

/** Meta/chase clarification rows that must not bind to the MG6 document unit. */
export function isMg6ClarificationMetaLabel(label: string): boolean {
  return /mg6\s*\/\s*unused schedule clarification/i.test(label);
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
