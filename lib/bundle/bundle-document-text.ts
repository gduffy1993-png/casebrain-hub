/**
 * Normalise document row to plain text for bundle parsing (aligned with defence-plan-chat).
 * Prefers extracted_text when present, then raw_text, then extracted_json summaries.
 */
export function getDocumentBodyText(d: {
  raw_text?: string | null;
  extracted_text?: string | null;
  extracted_json?: unknown;
}): string {
  const et = typeof d.extracted_text === "string" ? d.extracted_text.trim() : "";
  if (et.length > 0) return et;
  const raw = typeof d.raw_text === "string" ? d.raw_text.trim() : "";
  if (raw.length > 100) return raw;
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
