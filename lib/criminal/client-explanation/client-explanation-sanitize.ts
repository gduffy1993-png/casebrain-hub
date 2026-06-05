const FORBIDDEN_PHRASES = [
  "this wins",
  "crown collapses",
  "crown case collapses",
  "proves innocence",
  "guaranteed",
  "definitely defeats",
  "safe to advise plea",
  "you should plead",
  "you will be found not guilty",
  "you will win",
  "you will lose",
  "client is truthful",
  "client is lying",
  "client is telling the truth",
] as const;

export function sanitizeClientExplanationLine(text: string): string {
  let out = text.replace(/\s{2,}/g, " ").trim();
  const lower = out.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      return "Your solicitor will need to review this explanation before sharing it with you.";
    }
  }
  if (/artifacts\/|pp-[a-z0-9-]+|\b[a-z]:\\/.test(out)) {
    return "Your solicitor will need to review this explanation before sharing it with you.";
  }
  return out;
}

export function lintClientExplanationOutput(blob: string): string[] {
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

export const CLIENT_EXPLANATION_REVIEW_FOOTER =
  "DRAFT EXPLANATION FOR SOLICITOR REVIEW ONLY — not legal advice, not plea advice, not a prediction. Your solicitor will explain your position after review.";
