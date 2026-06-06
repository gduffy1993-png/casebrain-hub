const FORBIDDEN_PHRASES = [
  "defence now wins",
  "defense now wins",
  "defence stronger",
  "defense stronger",
  "defence weaker",
  "defense weaker",
  "crown case collapses",
  "crown collapses",
  "evidence proves innocence",
  "proves innocence",
  "safe to advise plea",
  "guaranteed change",
  "this wins",
  "must dismiss",
  "definitely defeats",
  "guaranteed",
] as const;

const FORBIDDEN_STORAGE_PATTERNS = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
  /===\s*SECTION:/i,
  /frontmatterscan/i,
] as const;

export function sanitizeEvidenceChangeLine(text: string): string {
  let out = text.replace(/\s{2,}/g, " ").trim();
  const lower = out.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      return "Solicitor review required — wording flagged on evidence-change output.";
    }
  }
  return out;
}

export function sanitizeEvidenceChangeLabel(label: string): string {
  let out = sanitizeEvidenceChangeLine(label);
  for (const re of FORBIDDEN_STORAGE_PATTERNS) {
    if (re.test(out)) return "";
  }
  return out.slice(0, 200);
}

export function lintEvidenceChangeOutput(blob: string): string[] {
  const lower = blob.toLowerCase();
  const issues: string[] = [];
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) issues.push(`forbidden: ${phrase}`);
  }
  if (blob.includes("artifacts/")) issues.push("artifact path");
  if (/\b[a-z]:\\/.test(blob)) issues.push("local path");
  if (/\bpp-[a-z0-9-]+/.test(blob)) issues.push("proof point id");
  for (const re of FORBIDDEN_STORAGE_PATTERNS) {
    if (re.test(blob)) issues.push("forbidden storage pattern");
  }
  return issues;
}

export function snapshotBlobContainsForbiddenContent(blob: string): boolean {
  return lintEvidenceChangeOutput(blob).length > 0;
}
