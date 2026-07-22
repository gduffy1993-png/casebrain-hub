/**
 * Quality contracts for solicitor-visible copyable strings.
 * Shared scan — not gold-ID patches.
 */

/** Acronyms that must retain canonical casing on solicitor-visible surfaces. */
export const PROTECTED_SOLICITOR_ACRONYMS = [
  "MG5",
  "MG6",
  "MG6C",
  "MG11",
  "BWV",
  "ABE",
  "PACE",
  "SFR",
  "ANPR",
  "CPS",
  "CCTV",
  "DVLA",
] as const;

export type SolicitorCopyQualityIssue =
  | "subject_verb_template"
  | "duplicated_on_the_file"
  | "doubled_space"
  | "double_emdash_clause"
  | "pipe_delimited_fragment"
  | "protected_acronym_casing"
  | "still_chase_double_append";

const SUBJECT_VERB_RES = [
  /\bFurther papers on the file appears\b/i,
  /\bFurther papers on the (?:current )?file appears\b/i,
  /\bpapers on the file appears outstanding\b/i,
  /\bFurther papers appear(?:s)? outstanding on the current file\b/i,
];

const ACRONYM_LOWER_RES: Array<{ re: RegExp; label: string }> = [
  { re: /\bmg5\b/, label: "MG5" },
  { re: /\bmg6c\b/, label: "MG6C" },
  { re: /\bmg6\b(?!c)/, label: "MG6" },
  { re: /\bmg11\b/, label: "MG11" },
  { re: /\bbwv\b/, label: "BWV" },
  { re: /\babe\b/, label: "ABE" },
  { re: /\bpace\b/, label: "PACE" },
  { re: /\bsfr\b/, label: "SFR" },
  { re: /\banpr\b/, label: "ANPR" },
  { re: /\bcps\b/, label: "CPS" },
  { re: /\bcctv\b/, label: "CCTV" },
  { re: /\bdvla\b/, label: "DVLA" },
];

/** Restore canonical casing for protected solicitor acronyms. */
export function preserveProtectedAcronyms(text: string): string {
  return text
    .replace(/\bmg6c\b/gi, "MG6C")
    .replace(/\bmg(\d+[a-z]?)\b/gi, (_, n: string) => `MG${String(n).toUpperCase()}`)
    .replace(/\bbwv\b/gi, "BWV")
    .replace(/\babe\b/gi, "ABE")
    .replace(/\bpace\b/gi, "PACE")
    .replace(/\bsfr\b/gi, "SFR")
    .replace(/\banpr\b/gi, "ANPR")
    .replace(/\bcps\b/gi, "CPS")
    .replace(/\bcctv\b/gi, "CCTV")
    .replace(/\bdvla\b/gi, "DVLA");
}

/**
 * Lowercase only the first character when it is not part of a protected acronym.
 * Prevents "SFR drugs…" → "sFR drugs…" in chase drafts.
 */
export function sentenceCasePreservingAcronyms(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (/^(MG\d+[A-Z]?|BWV|ABE|PACE|SFR|ANPR|CPS|CCTV|DVLA)\b/.test(t)) {
    return preserveProtectedAcronyms(t);
  }
  return preserveProtectedAcronyms(t.charAt(0).toLowerCase() + t.slice(1));
}

/** Scan a single solicitor-visible copyable string for known quality defects. */
export function scanSolicitorVisibleCopyQuality(text: string): SolicitorCopyQualityIssue[] {
  const issues: SolicitorCopyQualityIssue[] = [];
  const t = text ?? "";
  if (!t.trim()) return issues;

  if (SUBJECT_VERB_RES.some((re) => re.test(t))) issues.push("subject_verb_template");
  if (/\bon the file\b[\s\S]{0,80}\bon the (?:current )?file\b/i.test(t)) {
    issues.push("duplicated_on_the_file");
  }
  if (/[^\n]  +[^\n]/.test(t) || / {2,}\(/.test(t)) issues.push("doubled_space");
  if ((t.match(/\s[—–-]\s[^—–\n]{8,120}\s[—–-]\s/g) ?? []).length >= 1 && /still chase|solicitor to confirm/i.test(t)) {
    issues.push("double_emdash_clause");
  }
  if (/\b[A-Za-z][\w /-]{1,40}\s\|\s[A-Za-z]/.test(t)) issues.push("pipe_delimited_fragment");
  if (ACRONYM_LOWER_RES.some(({ re }) => re.test(t))) issues.push("protected_acronym_casing");
  if (/still chase if disclosure-relevant[\s\S]*still chase if disclosure-relevant/i.test(t)) {
    issues.push("still_chase_double_append");
  }
  return [...new Set(issues)];
}

export function describeCopyQualityIssues(issues: SolicitorCopyQualityIssue[]): string {
  return issues
    .map((i) => {
      switch (i) {
        case "subject_verb_template":
          return "Subject–verb template defect in solicitor prose.";
        case "duplicated_on_the_file":
          return "Duplicated 'on the file' / 'on the current file' phrasing.";
        case "doubled_space":
          return "Doubled spaces in solicitor-visible prose.";
        case "double_emdash_clause":
          return "Double-appended em-dash clauses.";
        case "pipe_delimited_fragment":
          return "Pipe-delimited internal fragment leaked to solicitor copy.";
        case "protected_acronym_casing":
          return "Protected acronym lost canonical casing (MG5/MG6/MG11/BWV/ABE/PACE/SFR/ANPR/CPS/CCTV/DVLA).";
        case "still_chase_double_append":
          return "Duplicated 'still chase' append.";
        default:
          return "Solicitor copy quality defect.";
      }
    })
    .join(" ");
}
