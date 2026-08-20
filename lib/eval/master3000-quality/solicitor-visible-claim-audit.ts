/**
 * Solicitor-visible claim audit adapter (Master 3000 release assurance).
 * Prefer adapting existing structured production outputs — do not redesign runtime.
 */
export type SolicitorClaimSurface =
  | "overview"
  | "court"
  | "papers"
  | "client"
  | "cps_chase"
  | "file"
  | "hearing_mode"
  | "export";

export type SolicitorClaimKind =
  | "identity"
  | "charge"
  | "date"
  | "stage"
  | "evidence_state"
  | "evidence_existence"
  | "entity_role"
  | "case_theory"
  | "court_position"
  | "client_fact"
  | "chase_request"
  | "readiness"
  | "provenance"
  | "deadline"
  | "quote"
  | "numeric";

export type SolicitorClaimCertainty =
  | "explicit"
  | "safe_derived"
  | "provisional"
  | "uncertain";

export type SolicitorClaimSupportClass =
  | "SOURCE_FACT"
  | "SAFE_DERIVATION"
  | "PRACTITIONER_CONSIDERATION"
  | "TRUTH_AMBIGUOUS"
  | "UNSUPPORTED_PROMOTION";

export type SolicitorVisibleClaim = {
  caseId: string;
  surface: SolicitorClaimSurface;
  section: string;
  text: string;
  claimKind: SolicitorClaimKind;
  evidenceFamily?: string;
  modality?: string;
  entityIds?: string[];
  countIds?: string[];
  assertedState?: string;
  dateRole?: string;
  certainty: SolicitorClaimCertainty;
  supportClass: SolicitorClaimSupportClass;
  canonicalFactIds?: string[];
  sourceRefs?: { documentId?: string; title?: string; page?: number }[];
  derivationRule?: string;
};

const HIGH_RISK_RE =
  /\b(served|missing|outstanding|unavailable|confirmed|proves|admits|complainant|victim|self-defence|self defense|first contact|injury|causation|identification|participation|BWV|CCTV|999|CAD|phone|medical|forensic|transcript|recording|continuity|deadline|hearing)\b/i;

export function isHighRiskClaimText(text: string): boolean {
  return HIGH_RISK_RE.test(text);
}

/** Deterministic first-pass classification from text cues (audit adapter only). */
export function classifyClaimTextHeuristically(text: string): {
  claimKind: SolicitorClaimKind;
  certainty: SolicitorClaimCertainty;
  supportClass: SolicitorClaimSupportClass;
} {
  const t = text.trim();
  if (/\bdeadline\b/i.test(t) && /\bhearing\b/i.test(t)) {
    return {
      claimKind: "deadline",
      certainty: "uncertain",
      supportClass: "TRUTH_AMBIGUOUS",
    };
  }
  if (/\bconsider whether\b|\bmay arise\b|\boptional\b/i.test(t)) {
    return {
      claimKind: "case_theory",
      certainty: "provisional",
      supportClass: "PRACTITIONER_CONSIDERATION",
    };
  }
  if (/\bself-defence remains live\b|\bis a live defence\b/i.test(t)) {
    return {
      claimKind: "case_theory",
      certainty: "uncertain",
      supportClass: "UNSUPPORTED_PROMOTION",
    };
  }
  if (/\b(served|missing|outstanding|incomplete|not safely confirmed)\b/i.test(t)) {
    return {
      claimKind: "evidence_state",
      certainty: "provisional",
      supportClass: "SAFE_DERIVATION",
    };
  }
  if (/\bchase\b|\bplease provide\b|\bask the court to record\b/i.test(t)) {
    return {
      claimKind: "chase_request",
      certainty: "provisional",
      supportClass: "SAFE_DERIVATION",
    };
  }
  return {
    claimKind: "court_position",
    certainty: "provisional",
    supportClass: "TRUTH_AMBIGUOUS",
  };
}

export function buildSolicitorVisibleClaim(input: {
  caseId: string;
  surface: SolicitorClaimSurface;
  section: string;
  text: string;
  overrides?: Partial<SolicitorVisibleClaim>;
}): SolicitorVisibleClaim {
  const heuristic = classifyClaimTextHeuristically(input.text);
  return {
    caseId: input.caseId,
    surface: input.surface,
    section: input.section,
    text: input.text.trim(),
    claimKind: heuristic.claimKind,
    certainty: heuristic.certainty,
    supportClass: heuristic.supportClass,
    ...input.overrides,
  };
}

/** Extract claim candidates from plain surface text blocks (deterministic). */
export function extractClaimsFromSurfaceText(args: {
  caseId: string;
  surface: SolicitorClaimSurface;
  section: string;
  text: string;
}): SolicitorVisibleClaim[] {
  const sentences = args.text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 24 && isHighRiskClaimText(s));
  return sentences.map((text) =>
    buildSolicitorVisibleClaim({
      caseId: args.caseId,
      surface: args.surface,
      section: args.section,
      text,
    }),
  );
}
