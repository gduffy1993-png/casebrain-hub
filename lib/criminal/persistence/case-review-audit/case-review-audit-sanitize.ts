const FORBIDDEN_PHRASES = [
  "defence now wins",
  "proves innocence",
  "safe to advise plea",
  "this wins",
  "crown case collapses",
] as const;

const FORBIDDEN_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json|docx?)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
  /===\s*SECTION:/i,
] as const;

const FORBIDDEN_METADATA_KEYS = new Set([
  "fullText",
  "exportBody",
  "bundleText",
  "raw_text",
  "extracted_text",
  "note",
  "clientAccount",
  "evidenceText",
  "sourceText",
]);

export const CASE_REVIEW_AUDIT_SAFE_LABEL_MAX = 280;
export const CASE_REVIEW_AUDIT_METADATA_ARRAY_MAX = 12;

export function lintCaseReviewAuditBlob(blob: string): string[] {
  const lower = blob.toLowerCase();
  const issues: string[] = [];
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) issues.push(`forbidden: ${phrase}`);
  }
  if (blob.includes("artifacts/")) issues.push("artifact path");
  if (/\b[a-z]:\\/.test(blob)) issues.push("local path");
  if (/\bpp-[a-z0-9-]+/.test(blob)) issues.push("proof point id");
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(blob)) issues.push("forbidden storage pattern");
  }
  return issues;
}

export function sanitizeCaseReviewAuditLabel(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let out = trimmed.replace(/\s{2,}/g, " ").slice(0, CASE_REVIEW_AUDIT_SAFE_LABEL_MAX);
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(out)) return null;
  }
  if (lintCaseReviewAuditBlob(out).length) return null;
  return out;
}

function sanitizeMetadataString(value: string): string | null {
  const label = sanitizeCaseReviewAuditLabel(value);
  return label;
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 2) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return sanitizeMetadataString(value);
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const sanitized = sanitizeMetadataValue(item, depth + 1);
      if (sanitized === null || sanitized === undefined) continue;
      out.push(sanitized);
      if (out.length >= CASE_REVIEW_AUDIT_METADATA_ARRAY_MAX) break;
    }
    return out;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_METADATA_KEYS.has(key)) continue;
      if (!/^[a-z][a-z0-9_]{0,48}$/i.test(key)) continue;
      const sanitized = sanitizeMetadataValue(nested, depth + 1);
      if (sanitized === null || sanitized === undefined) continue;
      out[key] = sanitized;
      if (Object.keys(out).length >= CASE_REVIEW_AUDIT_METADATA_ARRAY_MAX) break;
    }
    return out;
  }
  return null;
}

export function sanitizeCaseReviewAuditMetadata(
  raw: unknown,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (FORBIDDEN_METADATA_KEYS.has(key)) continue;
    if (!/^[a-z][a-z0-9_]{0,48}$/i.test(key)) continue;
    const sanitized = sanitizeMetadataValue(value);
    if (sanitized === null || sanitized === undefined) continue;
    out[key] = sanitized;
    if (Object.keys(out).length >= CASE_REVIEW_AUDIT_METADATA_ARRAY_MAX) break;
  }
  const blob = JSON.stringify(out);
  if (lintCaseReviewAuditBlob(blob).length) return {};
  return out;
}

export function auditEventContainsForbiddenContent(
  record: Record<string, unknown>,
): boolean {
  const blob = JSON.stringify(record);
  if (lintCaseReviewAuditBlob(blob).length) return true;
  if (blob.includes("fullText") || blob.includes("exportBody")) return true;
  if (typeof record.safeLabel === "string" && record.safeLabel.length > CASE_REVIEW_AUDIT_SAFE_LABEL_MAX) {
    return true;
  }
  return false;
}
