import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";

export const PROVISIONAL_WORKFLOW_PROFILES = [
  "generic_motoring_provisional",
  "generic_serious_violence_provisional",
  "generic_provisional",
] as const;

export type ProvisionalWorkflowProfile = (typeof PROVISIONAL_WORKFLOW_PROFILES)[number];

export function isProvisionalWorkflowProfile(
  profile: WorkflowProfile,
): profile is ProvisionalWorkflowProfile {
  return (PROVISIONAL_WORKFLOW_PROFILES as readonly string[]).includes(profile);
}

const MOTORING_RE =
  /\b(dangerous driving|careless driving|driving without due care|due care and attention|road traffic act|rt\.?\s*a\.?\s*1988|motoring|speeding|no insurance|fail to stop|drink[-\s]?drive|drug[-\s]?drive|drink drug driving|driving whilst|unfit to drive|causing (?:serious )?injury by (?:dangerous|careless|inconsiderate) driving|inconsiderate driving)\b/i;

const TWOC_RE =
  /\b(taking (?:a )?(?:motor )?vehicle without consent|took a mechanically propelled vehicle without|twoc|vehicle interference)\b/i;

const SERIOUS_VIOLENCE_RE =
  /\b(murder|manslaughter|attempted murder|conspiracy to murder)\b/i;

const GENERIC_PROVISIONAL_RE =
  /\b(pervert(ing)? the course of justice|perverting course of justice|witness intimidation|intimidate(?:s|d)? a witness|doing an act tending and intended to pervert)\b/i;

const MONEY_LAUNDERING_FRAUD_RE =
  /\b(money laundering|criminal property|proceeds of crime|concealing|disposal of criminal|transfer(?:ring)? criminal property|account control|source of funds|transaction(?:s)? (?:showing|linked)|bank(?:ing)? (?:movement|transfer))\b/i;

export function isMotoringOffenceText(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return MOTORING_RE.test(t) || TWOC_RE.test(t);
}

export function isSeriousViolenceOffenceText(text: string | null | undefined): boolean {
  return SERIOUS_VIOLENCE_RE.test(text ?? "");
}

export function isGenericProvisionalOffenceText(text: string | null | undefined): boolean {
  return GENERIC_PROVISIONAL_RE.test(text ?? "");
}

export function isClearMoneyLaunderingFraudText(text: string | null | undefined): boolean {
  return MONEY_LAUNDERING_FRAUD_RE.test(text ?? "");
}

/** Provisional pilot profiles — checked before standard family scoring. */
export function resolveProvisionalWorkflowFromOffence(
  offence: string | null | undefined,
): ProvisionalWorkflowProfile | null {
  const t = (offence ?? "").trim();
  if (!t) return null;
  if (isMotoringOffenceText(t)) return "generic_motoring_provisional";
  if (isSeriousViolenceOffenceText(t)) return "generic_serious_violence_provisional";
  if (isGenericProvisionalOffenceText(t)) return "generic_provisional";
  return null;
}

export const MOTORING_PROVISIONAL_COURT_LINE =
  "This is a motoring/dangerous-driving matter. The route remains provisional pending served driving evidence, collision sequence material, dashcam/CCTV/BWV, CAD/999, expert/collision material, medical/injury evidence where relevant, and any served interview/account — do not overstate guilt, dangerousness, causation, injury link, driver identity, or admissions without served source material.";

export const SERIOUS_VIOLENCE_PROVISIONAL_COURT_LINE =
  "This is a serious violence matter on the current papers. Strategy and route remain provisional pending served material and solicitor review — do not advance fixed trial theory or outcome language without instructions and served evidence.";

export const GENERIC_PROVISIONAL_COURT_LINE =
  "The offence family on the current papers is not mapped to a standard pilot workflow profile. The route remains provisional pending served material and human review — do not force fraud, PWITS, robbery, or domestic violence framing.";

export const MOTORING_PRIMARY_ROUTE_TITLE =
  "Standard of driving / driver attribution / collision sequence pressure";

export const SERIOUS_VIOLENCE_PRIMARY_ROUTE_TITLE =
  "Serious violence — provisional strategy (human review required)";

export const MOTORING_DISCLOSURE_ITEMS = [
  "Dashcam / CCTV / BWV export and continuity",
  "CAD / 999 timing and deployment material",
  "Expert / collision reconstruction report",
  "Medical / injury evidence where result element charged",
  "Vehicle condition / MOT material if relevant",
  "Driver attribution / identification material",
  "Served interview record / account if relied on",
];

export const GENERIC_PROVISIONAL_PRIMARY_ROUTE_TITLE =
  "Provisional route — offence family needs human review";
