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
  if (l.includes("short") && (l.includes("bwv") || l.includes("clip"))) return true;
  if (l.includes("clip") && (l.includes("transcript") || l.includes("bwv") || l.includes("video"))) return true;
  if (l.includes("cropped") && (l.includes("message") || l.includes("screenshot"))) return true;
  if (l.includes("interview summary") || l.includes("summary extract")) return true;
  if (l.includes("selected screenshot")) return true;
  if (l.includes("email exhibit summary")) return true;
  if (l.includes("database printout") && l.includes("insurance")) return true;

  const hasPartial = PARTIAL_MARKERS.some((m) => l.includes(m));
  const hasMedia = MEDIA_MARKERS.some((m) => l.includes(m));
  return hasPartial && hasMedia;
}

export function isAggregateLedgerLabel(label: string): boolean {
  const l = label.toLowerCase();
  return l.startsWith("served material |") || l.startsWith("served on bundle:");
}

export function inferLedgerRowExistence(
  label: string,
  bucket: "served" | "limited" | "missing",
): "served" | "incomplete" | "missing" {
  if (bucket === "missing") return "missing";
  if (bucket === "limited" || isPartialMediaLedgerLabel(label)) return "incomplete";
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
