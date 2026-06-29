import type { EvidenceExistence, EvidenceReliability } from "@/lib/criminal/five-answers/types";

export type DecisionIssueKind =
  | "attribution"
  | "missing_bwv_cctv"
  | "custody_pace"
  | "charge_fit"
  | "contradiction_timeline"
  | "co_defendant_bleed"
  | "disclosure_pressure"
  | "identification";

export type DecisionBoardOption = {
  id: string;
  issueKind: DecisionIssueKind;
  title: string;
  whyItMatters: string;
  sourceBasis: string;
  missingEvidence: string[];
  riskCaution: string;
  nextAction: string;
  sendabilityLabel: string;
  existence?: EvidenceExistence;
  reliability?: EvidenceReliability;
};

export type DecisionBoardModel = {
  options: DecisionBoardOption[];
  reviewNotice: string;
};

export const DECISION_ISSUE_LABELS: Record<DecisionIssueKind, string> = {
  attribution: "Attribution issue",
  missing_bwv_cctv: "Missing BWV / CCTV issue",
  custody_pace: "Custody / PACE issue",
  charge_fit: "Charge-fit issue",
  contradiction_timeline: "Contradiction / timeline issue",
  co_defendant_bleed: "Co-defendant bleed risk",
  disclosure_pressure: "Disclosure pressure",
  identification: "Identification issue",
};
