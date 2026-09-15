/**
 * Normalise document row to plain text for bundle parsing (aligned with defence-plan-chat).
 * When both `extracted_text` and `raw_text` exist, uses whichever body is **longer** so a short/stale
 * extract row cannot shadow the full PDF/`raw_text` bundle (common after uploads).
 * Otherwise: substantial raw_text, then extracted_text, then extracted_json summaries.
 *
 * A parser-failure banner is not papers. It stays on the File row as extracted_text so the
 * solicitor can see the upload failed; it does not become hay, identity, or a served finding.
 */

/**
 * True when the whole body is the upload/parser failure placeholder, not bundle text.
 * A witness sentence that happens to say "extraction failed" is not this.
 */
export function isExtractionFailurePlaceholder(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^\[PDF extraction failed:/i.test(t)) return true;
  if (/^Document uploaded but text extraction failed:/i.test(t)) return true;
  return false;
}

function usableBody(text: string): string {
  const t = text.trim();
  return t && !isExtractionFailurePlaceholder(t) ? t : "";
}

export function getDocumentBodyText(d: {
  raw_text?: string | null;
  extracted_text?: string | null;
  extracted_json?: unknown;
}): string {
  const et = typeof d.extracted_text === "string" ? d.extracted_text.trim() : "";
  const raw = typeof d.raw_text === "string" ? d.raw_text.trim() : "";

  if (et.length > 0 && raw.length > 0) {
    const chosen = raw.length >= et.length ? raw : et;
    const usable = usableBody(chosen);
    if (usable) return usable;
    return usableBody(chosen === raw ? et : raw);
  }

  if (raw.length > 100) {
    const usable = usableBody(raw);
    if (usable) return usable;
  }
  if (et.length > 0) {
    const usable = usableBody(et);
    if (usable) return usable;
  }
  const ej = d.extracted_json;
  if (ej && typeof ej === "object") {
    const o = ej as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.summary === "string" && o.summary.trim()) parts.push(o.summary.trim());
    if (typeof o.aiSummary === "string" && o.aiSummary.trim()) parts.push(o.aiSummary.trim());
    if (parts.length) return usableBody(parts.join("\n"));
  }
  return usableBody(raw);
}

export function combineCaseDocumentsText(
  docs: Array<{ raw_text?: string | null; extracted_text?: string | null; extracted_json?: unknown }>,
): string {
  return docs.map((d) => getDocumentBodyText(d)).filter(Boolean).join("\n\n");
}
