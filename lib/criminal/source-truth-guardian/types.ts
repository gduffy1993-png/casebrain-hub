import type { BundleTruthLedger, MaterialStatus } from "@/lib/criminal/bundle-truth-types";

export type SourceTruthCaseProfile =
  | "digital"
  | "bwv_custody"
  | "domestic"
  | "sexual"
  | "drugs"
  | "mixed"
  | "unknown";

export type SourceTruthEvidenceCategory =
  | "bwv"
  | "custody"
  | "cctv"
  | "cad_999"
  | "interview"
  | "mg11"
  | "extraction"
  | "drugs"
  | "medical"
  | "abe"
  | "mg6"
  | "unknown";

export type SourceTruthEvidenceState = MaterialStatus;

export type SourceTruthEvidenceMatrix = Partial<Record<SourceTruthEvidenceCategory, SourceTruthEvidenceState>>;

export type SourceTruthFingerprint = {
  profile: SourceTruthCaseProfile;
  evidence: SourceTruthEvidenceMatrix;
  ledger: BundleTruthLedger | null;
};

export type GuardianFlag =
  | "wrong_modality"
  | "state_contradiction"
  | "off_papers_fact"
  | "invented_evidence"
  | "guilt_assertion"
  | "surface_contradiction"
  | "defence_account_relabelled"
  | "witness_account_softened"
  | "overstrong_inference_softened"
  | "wrong_surface"
  | "truncated"
  | "duplicate"
  | "empty_court_line"
  | "mg6c_header_removed"
  | "template_bleed"
  | "fallback_applied";

export type GuardianSeverity = "critical" | "major" | "minor" | "fallback";

export type GuardianDecision = {
  original: string;
  final: string | null;
  surface: SourceTruthSurface;
  severity: GuardianSeverity;
  flags: GuardianFlag[];
  reason: string;
};

/** Client-facing audit entry — blocked text is not echoed back into payloads. */
export type GuardianDecisionSummary = Omit<GuardianDecision, "original">;

export type SourceTruthGuardianReport = {
  fingerprint: SourceTruthFingerprint;
  decisions: GuardianDecisionSummary[];
  flags: GuardianFlag[];
  blockedCount: number;
  rewrittenCount: number;
  fallbackCount: number;
};

export type SourceTruthSurface = "today" | "summary" | "chase" | "court" | "unknown";

export type SourceTruthGuardianContext = {
  bundleText?: string | null;
  ledger?: BundleTruthLedger | null;
  surface: SourceTruthSurface;
};
