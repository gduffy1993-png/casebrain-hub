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
  "CAD",
  "999",
  "DNA",
  "AFIS",
  "PIN",
  "YJS",
  "KN/01",
] as const;

/** Multi-word labels that must keep title/list casing even inside chase sentences. */
export const PROTECTED_SOLICITOR_PHRASES = [
  { re: /\bbody-worn video\s*\(\s*bwv\s*\)/gi, canon: "Body-worn video (BWV)" },
  { re: /\bcad\s*\/\s*999\b/gi, canon: "CAD / 999" },
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
  { re: /\bcad\b/, label: "CAD" },
  { re: /\bcAD\b/, label: "CAD" },
  { re: /\bdna\b/, label: "DNA" },
  { re: /\bafis\b/, label: "AFIS" },
  { re: /\bpin\b/, label: "PIN" },
  { re: /\byjs\b/, label: "YJS" },
];

const PROTECTED_START_RE =
  /^(MG\d+[A-Z]?|BWV|ABE|PACE|SFR|ANPR|CPS|CCTV|DVLA|CAD|999|Body-worn video)\b/;

/** Restore canonical casing for protected solicitor acronyms and phrases. */
export function preserveProtectedAcronyms(text: string): string {
  let out = text
    .replace(/\bmg6c\b/gi, "MG6C")
    .replace(/\bmg(\d+[a-z]?)\b/gi, (_, n: string) => `MG${String(n).toUpperCase()}`)
    .replace(/\bbwv\b/gi, "BWV")
    .replace(/\babe\b/gi, "ABE")
    .replace(/\bpace\b/gi, "PACE")
    .replace(/\bsfr\b/gi, "SFR")
    .replace(/\banpr\b/gi, "ANPR")
    .replace(/\bcps\b/gi, "CPS")
    .replace(/\bcctv\b/gi, "CCTV")
    .replace(/\bdvla\b/gi, "DVLA")
    .replace(/\bcad\b/gi, "CAD");
  out = out
    .replace(/\bdna\b/gi, "DNA")
    .replace(/\bafis\b/gi, "AFIS")
    .replace(/\bpin\b/gi, "PIN")
    .replace(/\byjs\b/gi, "YJS")
    .replace(/\bkn\s*\/\s*0*1\b/gi, "KN/01")
    .replace(/\bcctv\b/gi, "CCTV");
  for (const { re, canon } of PROTECTED_SOLICITOR_PHRASES) {
    out = out.replace(re, canon);
  }
  return out;
}

/**
 * Lowercase only the first character when it is not part of a protected acronym/phrase.
 * Prevents "SFR drugs…" → "sFR drugs…" and "CAD / 999…" → "cAD / 999…" in chase drafts.
 * Preserves "Body-worn video (BWV)" as a protected list/sentence label.
 */
export function sentenceCasePreservingAcronyms(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (/^body-worn video\b/i.test(t)) {
    return preserveProtectedAcronyms(t.replace(/^body-worn video/i, "Body-worn video"));
  }
  if (PROTECTED_START_RE.test(t) || /^CAD\b/i.test(t) || /^999\b/.test(t)) {
    return preserveProtectedAcronyms(t);
  }
  return preserveProtectedAcronyms(t.charAt(0).toLowerCase() + t.slice(1));
}

export type SolicitorSurfaceRole =
  | "provenance_or_document_title"
  | "solicitor_drafting_prose"
  | "court_prose"
  | "client_prose"
  | "copy_prose"
  | "export_prose"
  | "api_prose"
  | "other";

/** Infer surface role for wording-quality rules (titles ≠ drafting prose). */
export function inferSolicitorSurfaceRole(surfaceId: string | null | undefined): SolicitorSurfaceRole {
  const id = (surfaceId ?? "").toLowerCase();
  if (/provenance_title|document_title|evidence_title|form_title/.test(id)) {
    return "provenance_or_document_title";
  }
  if (/client/.test(id)) return "client_prose";
  if (/court/.test(id)) return "court_prose";
  if (/export/.test(id)) return "export_prose";
  if (/^api_|api_/.test(id)) return "api_prose";
  if (/copy/.test(id)) return "copy_prose";
  if (/summary|chase|war_room|control_room|key_facts|five_answers|defence|supervisor/.test(id)) {
    return "solicitor_drafting_prose";
  }
  return "other";
}

/** Scan a single solicitor-visible copyable string for known quality defects. */
export function scanSolicitorVisibleCopyQuality(
  text: string,
  opts?: { surfaceId?: string | null; surfaceRole?: SolicitorSurfaceRole },
): SolicitorCopyQualityIssue[] {
  const issues: SolicitorCopyQualityIssue[] = [];
  const t = text ?? "";
  if (!t.trim()) return issues;

  const role = opts?.surfaceRole ?? inferSolicitorSurfaceRole(opts?.surfaceId);
  // Provenance/document titles may be short form identifiers (MG5/MG6). Do not
  // require sentence-style status/reason/action completeness, and do not treat
  // bare form-title casing as a drafting defect.
  if (role === "provenance_or_document_title") {
    if (/\b[A-Za-z][\w /-]{1,40}\s\|\s[A-Za-z]/.test(t)) issues.push("pipe_delimited_fragment");
    if (/[a-z]+_[a-z0-9_]{3,}/.test(t) && /enum|status|gateStatus|pipelineVersion/i.test(t)) {
      issues.push("pipe_delimited_fragment");
    }
    return [...new Set(issues)];
  }

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
          return "Protected acronym lost canonical casing (MG5/MG6/MG11/BWV/ABE/PACE/SFR/ANPR/CPS/CCTV/DVLA/CAD).";
        case "still_chase_double_append":
          return "Duplicated 'still chase' append.";
        default:
          return "Solicitor copy quality defect.";
      }
    })
    .join(" ");
}
