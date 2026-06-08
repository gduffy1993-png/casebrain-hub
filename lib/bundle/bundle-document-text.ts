/**
 * Normalise document row to plain text for bundle parsing (aligned with defence-plan-chat).
 * When both `extracted_text` and `raw_text` exist, uses whichever body is **longer** so a short/stale
 * extract row cannot shadow the full PDF/`raw_text` bundle (common after uploads).
 * Otherwise: substantial raw_text, then extracted_text, then extracted_json summaries.
 */
export function getDocumentBodyText(d: {
  raw_text?: string | null;
  extracted_text?: string | null;
  extracted_json?: unknown;
}): string {
  const et = typeof d.extracted_text === "string" ? d.extracted_text.trim() : "";
  const raw = typeof d.raw_text === "string" ? d.raw_text.trim() : "";

  if (et.length > 0 && raw.length > 0) {
    return raw.length >= et.length ? raw : et;
  }

  if (raw.length > 100) return raw;
  if (et.length > 0) return et;
  const ej = d.extracted_json;
  if (ej && typeof ej === "object") {
    const o = ej as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.summary === "string" && o.summary.trim()) parts.push(o.summary.trim());
    if (typeof o.aiSummary === "string" && o.aiSummary.trim()) parts.push(o.aiSummary.trim());
    if (parts.length) return parts.join("\n");
  }
  return raw;
}

export function combineCaseDocumentsText(
  docs: Array<{ raw_text?: string | null; extracted_text?: string | null; extracted_json?: unknown }>,
): string {
  return docs.map((d) => getDocumentBodyText(d)).filter(Boolean).join("\n\n");
}
