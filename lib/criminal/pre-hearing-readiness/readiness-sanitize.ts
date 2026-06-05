const FORBIDDEN_PHRASES = [
  "case ready to win",
  "defence strong",
  "crown weak",
  "safe to advise plea",
  "this wins",
  "crown collapses",
  "proves innocence",
  "guaranteed",
  "must dismiss",
  "definitely defeats",
] as const;

export function sanitizeReadinessLine(text: string): string {
  let out = text.replace(/\s{2,}/g, " ").trim();
  const lower = out.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      return "Solicitor review required — wording flagged on readiness output.";
    }
  }
  return out;
}

export function lintReadinessOutput(blob: string): string[] {
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
