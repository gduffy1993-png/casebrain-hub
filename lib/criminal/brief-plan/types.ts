import type { BundleTruthLedger, NormalisedMaterialRow } from "@/lib/criminal/bundle-truth-types";
import type { BundleContradiction } from "@/lib/criminal/extract-bundle-contradictions";
import type {
  SourceTruthEvidenceCategory,
  SourceTruthFingerprint,
} from "@/lib/criminal/source-truth-guardian/types";

export type CriminalBriefPlanProfile =
  | "digital_attribution"
  | "bwv_police_contact"
  | "custody_pace"
  | "domestic_harassment"
  | "drugs_pwits"
  | "violence_assault"
  | "sexual_abe"
  | "driving_motoring"
  | "fraud_account"
  | "robbery_id"
  | "mixed_unclear";

export type BriefPlanEvidenceItem = {
  category: SourceTruthEvidenceCategory;
  label: string;
  state: string;
  sourceRef: string | null;
};

export type CriminalBriefPlan = {
  version: "criminal-brief-plan-v1";
  profile: CriminalBriefPlanProfile;
  mainIssue: string;
  servedEvidence: BriefPlanEvidenceItem[];
  limitedEvidence: BriefPlanEvidenceItem[];
  missingEvidence: BriefPlanEvidenceItem[];
  todayAngle: string;
  summaryAngle: string;
  chaseAngle: string;
  forbiddenTopics: string[];
  requiredOutputItems: {
    today: string[];
    summary: string[];
    chase: string[];
  };
  playbookId: CriminalBriefPlanProfile;
  fingerprint: SourceTruthFingerprint;
};

export type BuildCriminalBriefPlanInput = {
  bundleText?: string | null;
  ledger?: BundleTruthLedger | null;
  fingerprint?: SourceTruthFingerprint | null;
  contradictions?: BundleContradiction[] | null;
  missingMaterial?: string[] | null;
  allegation?: string | null;
};

export type CriminalBriefPlaybook = {
  id: CriminalBriefPlanProfile;
  commonIssues: string[];
  missingMaterial: string[];
  safeWording: {
    today: string;
    summary: string;
    chase: string;
  };
  risks: string[];
  opportunities: string[];
  doNotOverstate: string[];
  chaseTemplates: string[];
  clientSafeStyle: string;
};

export type MaterialEvidenceBucket = {
  served: NormalisedMaterialRow[];
  limited: NormalisedMaterialRow[];
  missing: NormalisedMaterialRow[];
};
