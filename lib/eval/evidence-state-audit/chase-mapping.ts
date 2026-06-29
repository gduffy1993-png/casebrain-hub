import { labelMatchScore, normalizeLabel } from "./normalize";

export type ChaseFamilyId =
  | "bwv_cctv"
  | "custody_pace"
  | "phone_download"
  | "mg6_unused"
  | "medical_expert"
  | "encro_digital"
  | "surveillance"
  | "abe"
  | "mg11_witness"
  | "continuity"
  | "generic";

type ChaseFamily = {
  id: ChaseFamilyId;
  patterns: RegExp[];
};

const CHASE_FAMILIES: ChaseFamily[] = [
  {
    id: "bwv_cctv",
    patterns: [
      /\bbwv\b/i,
      /body[-\s]?worn/i,
      /\bcctv\b/i,
      /master footage/i,
      /full (?:bwv|cctv)/i,
      /cctv full/i,
    ],
  },
  {
    id: "custody_pace",
    patterns: [
      /\bcustody\b/i,
      /\bpace\b/i,
      /detention record/i,
      /interview recording/i,
      /interview transcript/i,
      /pace clock/i,
    ],
  },
  {
    id: "phone_download",
    patterns: [
      /phone\b/i,
      /device\b/i,
      /download/i,
      /extraction/i,
      /metadata/i,
      /screenshot/i,
      /subscriber/i,
      /message export/i,
      /full extraction/i,
    ],
  },
  {
    id: "mg6_unused",
    patterns: [/mg6\b/i, /unused schedule/i, /disclosure schedule/i, /mg6c/i],
  },
  {
    id: "medical_expert",
    patterns: [/medical/i, /expert/i, /pathology/i, /fme/i, /hospital/i],
  },
  {
    id: "encro_digital",
    patterns: [/encro/i, /handle attribution/i, /encrypted.?platform/i, /chat map/i, /chat context/i],
  },
  {
    id: "surveillance",
    patterns: [/surveillance/i, /telecom/i, /banking schedule/i, /cellsite/i],
  },
  {
    id: "abe",
    patterns: [/\babe\b/i, /achieving best evidence/i],
  },
  {
    id: "mg11_witness",
    patterns: [/mg11/i, /complainant/i, /witness statement/i, /first account/i],
  },
  {
    id: "continuity",
    patterns: [/continuity/i, /provenance/i, /exhibit map/i, /chain of custody/i],
  },
];

export function chaseFamilyForLabel(label: string): ChaseFamilyId {
  const text = label.trim();
  if (!text) return "generic";
  for (const family of CHASE_FAMILIES) {
    if (family.patterns.some((re) => re.test(text))) return family.id;
  }
  return "generic";
}

export function chaseLabelsAlign(expected: string, candidate: string): boolean {
  const a = normalizeLabel(expected);
  const b = normalizeLabel(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  if (labelMatchScore(expected, candidate) >= 0.72) return true;

  const famA = chaseFamilyForLabel(expected);
  const famB = chaseFamilyForLabel(candidate);
  if (famA !== "generic" && famA === famB) return true;

  // Co-defendant chat context is chase metadata, not a defendant import surface.
  if (famA === "encro_digital" && /\bchat\b/i.test(expected) && /\bchat\b/i.test(candidate)) {
    return true;
  }

  if (famA === "phone_download" && famB === "phone_download") return true;
  if (famA === "bwv_cctv" && famB === "bwv_cctv") return true;
  if (famA === "custody_pace" && famB === "custody_pace") return true;
  if (famA === "mg6_unused" && famB === "mg6_unused") return true;

  return false;
}

export type ChaseMatchResult = {
  matched: boolean;
  reason: "exact" | "family" | "fuzzy" | "not_surfaced" | "no_candidate";
  candidateLabel?: string;
};

export function matchExpectedChaseItem(
  expected: string,
  candidateLabels: string[],
): ChaseMatchResult {
  if (candidateLabels.length === 0) {
    return { matched: false, reason: "no_candidate" };
  }

  let best: ChaseMatchResult = { matched: false, reason: "no_candidate" };
  for (const candidate of candidateLabels) {
    const normE = normalizeLabel(expected);
    const normC = normalizeLabel(candidate);
    if (normE === normC) {
      return { matched: true, reason: "exact", candidateLabel: candidate };
    }
    if (labelMatchScore(expected, candidate) >= 0.72) {
      return { matched: true, reason: "fuzzy", candidateLabel: candidate };
    }
    if (chaseLabelsAlign(expected, candidate)) {
      best = { matched: true, reason: "family", candidateLabel: candidate };
    }
  }
  return best;
}

export function collectChaseSurfaceLabels(output: {
  warningsAndGaps?: { chaseItems?: Array<{ label: string }> };
  fiveAnswersEvidenceRows?: Array<{ label: string; existence?: string | null }>;
  evidenceStates?: Array<{ label: string; inferredSourceState?: string | null }>;
}): string[] {
  const labels = new Set<string>();

  for (const c of output.warningsAndGaps?.chaseItems ?? []) {
    if (c.label?.trim()) labels.add(c.label.trim());
  }

  for (const row of output.fiveAnswersEvidenceRows ?? []) {
    const ex = (row.existence ?? "").toLowerCase();
    if (ex === "missing" || ex === "referred_only" || ex === "unknown" || ex === "incomplete") {
      if (row.label?.trim()) labels.add(row.label.trim());
    }
  }

  for (const row of output.evidenceStates ?? []) {
    const st = (row.inferredSourceState ?? "").toLowerCase();
    if (st === "missing" || st === "referred_only" || st === "provisional" || st === "outstanding") {
      if (row.label?.trim()) labels.add(row.label.trim());
    }
  }

  return [...labels];
}
