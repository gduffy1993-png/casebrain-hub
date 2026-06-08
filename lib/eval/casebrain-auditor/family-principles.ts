import type { AuditorFamilyProfile } from "./types";

export type FamilyPrinciplePack = {
  profile: AuditorFamilyProfile;
  primaryRouteTitle: string;
  requiredConcepts: string[];
  forbiddenConcepts: RegExp[];
  /** Cross-family leakage patterns for this profile. */
  leakagePatterns: RegExp[];
};

export const FAMILY_PRINCIPLE_PACKS: Record<AuditorFamilyProfile, FamilyPrinciplePack> = {
  fraud_account_control: {
    profile: "fraud_account_control",
    primaryRouteTitle: "Fraud / account-control / dishonesty pressure",
    requiredConcepts: [
      "bank",
      "account",
      "device",
      "mailbox",
      "POCA",
      "provisional",
    ],
    forbiddenConcepts: [
      /\bfull cctv confirms\b/i,
      /intent to supply/i,
      /robbery/i,
      /phone-attribution pressure/i,
      /against extract/i,
    ],
    leakagePatterns: [
      /\b(robbery|visual\s*id|pwits|intent to supply|class a)\b/i,
      /phone or witness material may undermine/i,
    ],
  },
  pwits_phone_attribution: {
    profile: "pwits_phone_attribution",
    primaryRouteTitle: "Possession / knowledge / phone-attribution pressure",
    requiredConcepts: ["phone", "search", "continuity", "provisional"],
    forbiddenConcepts: [
      /MG11 is consistent/i,
      /\bDNA\b/i,
      /\bfingerprint\b/i,
      /robbery/i,
      /bank export/i,
      /against extract/i,
    ],
    leakagePatterns: [
      /\b(robbery|bank export|account-control|fraud)\b/i,
      /confirms crown timing/i,
    ],
  },
  robbery_identification: {
    profile: "robbery_identification",
    primaryRouteTitle: "Identification / participation / attribution pressure",
    requiredConcepts: ["CCTV", "ID", "complainant", "provisional"],
    forbiddenConcepts: [
      /\bphone evidence\b/i,
      /intent to supply/i,
      /\bbank export\b/i,
      /CAD\/999 timing supports Crown sequence/i,
      /against extract/i,
    ],
    leakagePatterns: [
      /\b(bank\/device|bank export|account-control|fraud|pwits|intent to supply)\b/i,
      /Phone or witness material may undermine/i,
    ],
  },
  violence_domestic_assault: {
    profile: "violence_domestic_assault",
    primaryRouteTitle: "Violence / complainant account / injury and participation pressure",
    requiredConcepts: ["complainant", "injury", "provisional"],
    forbiddenConcepts: [
      /\bbank export\b/i,
      /intent to supply/i,
      /phone-attribution pressure/i,
      /against extract/i,
    ],
    leakagePatterns: [
      /\b(bank export|device\/login|account-control|pwits|phone extraction)\b/i,
      /\b(robbery identification route)\b/i,
    ],
  },
};

export function routeTitleForFamily(profile: AuditorFamilyProfile): string {
  return FAMILY_PRINCIPLE_PACKS[profile].primaryRouteTitle;
}
