const FORBIDDEN_PHRASES = [
  "weak case",
  "strong case",
  "likely win",
  "likely lose",
  "crown collapses",
  "crown case collapses",
  "safe to advise plea",
  "this wins",
  "proves innocence",
  "guaranteed",
] as const;

export function sanitizeSupervisorQALine(text: string): string {
  let out = text.replace(/\s{2,}/g, " ").trim();
  const lower = out.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      return "Supervisor review required — wording flagged on QA output.";
    }
  }
  return out;
}

export function lintSupervisorQAOutput(blob: string): string[] {
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
