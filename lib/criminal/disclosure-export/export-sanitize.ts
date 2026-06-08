const FORBIDDEN_PHRASES = [
  "crown case collapses",
  "crown collapses",
  "this wins",
  "proves innocence",
  "safe to advise plea",
  "defence now wins",
  "defense now wins",
  "must dismiss",
  "guaranteed",
  "definitely defeats",
] as const;

const FORBIDDEN_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
  /===\s*SECTION:/i,
] as const;

export const EXPORT_SOURCE_BASIS_MAX = 160;

export function sanitizeExportLine(text: string): string {
  let out = text.replace(/\s{2,}/g, " ").trim();
  const lower = out.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      return "Solicitor review required — wording flagged on export draft.";
    }
  }
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(out)) return "";
  }
  return out;
}

export function truncateExportBasis(text: string, max = EXPORT_SOURCE_BASIS_MAX): string {
  const s = sanitizeExportLine(text);
  if (!s) return "Source section on served papers.";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function lintExportOutput(blob: string): string[] {
  const lower = blob.toLowerCase();
  const issues: string[] = [];
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) issues.push(`forbidden: ${phrase}`);
  }
  if (blob.includes("artifacts/")) issues.push("artifact path");
  if (/\b[a-z]:\\/.test(blob)) issues.push("local path");
  if (/\bpp-[a-z0-9-]+/.test(blob)) issues.push("proof point id");
  return issues;
}
