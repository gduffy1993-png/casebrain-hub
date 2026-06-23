import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import type { BundleTruthLedger, MaterialStatus, NormalisedMaterialRow } from "@/lib/criminal/bundle-truth-types";
import type {
  SourceTruthCaseProfile,
  SourceTruthEvidenceCategory,
  SourceTruthEvidenceMatrix,
  SourceTruthFingerprint,
} from "./types";

const CATEGORY_PATTERNS: Array<[SourceTruthEvidenceCategory, RegExp]> = [
  ["bwv", /\b(?:bwv|body[-\s]?worn|body\s+worn)\b/i],
  ["custody", /\b(?:custody\s+record|detention\s+log|pace\s+clock|custody\s+sergeant|safeguards?)\b/i],
  ["cctv", /\b(?:cctv|footage|video|camera)\b/i],
  ["cad_999", /\b(?:cad|999|dispatch|control\s*room)\b/i],
  ["interview", /\b(?:interview|transcript|pace\s+interview)\b/i],
  ["mg11", /\b(?:mg11|witness\s+statement|complainant\s+statement)\b/i],
  ["extraction", /\b(?:phone\s+extraction|device\s+extraction|download|metadata|imei|subscriber|messages?|screenshots?)\b/i],
  ["drugs", /\b(?:drug|drugs|pwits|controlled\s+substance|continuity\s+seal|lab\s+report)\b/i],
  ["medical", /\b(?:medical|hospital|injury|fme|pathology|expert)\b/i],
  ["abe", /\b(?:abe|achieving\s+best\s+evidence)\b/i],
  ["mg6", /\b(?:mg6|unused|disclosure\s+schedule)\b/i],
];

function rankStatus(status: MaterialStatus): number {
  switch (status) {
    case "served":
      return 7;
    case "partial":
      return 6;
    case "referred_only":
      return 5;
    case "draft":
      return 4;
    case "unsigned":
      return 3;
    case "outstanding":
      return 2;
    case "unclear":
      return 1;
    case "absent":
      return 0;
  }
}

function stronger(a: MaterialStatus | undefined, b: MaterialStatus): MaterialStatus {
  if (!a) return b;
  return rankStatus(b) > rankStatus(a) ? b : a;
}

function categoryFor(row: NormalisedMaterialRow): SourceTruthEvidenceCategory {
  const text = `${row.label} ${row.detail ?? ""} ${row.displayLine}`;
  return CATEGORY_PATTERNS.find(([, re]) => re.test(text))?.[0] ?? "unknown";
}

function textState(bundleText: string, category: SourceTruthEvidenceCategory): MaterialStatus | null {
  const categoryRe = CATEGORY_PATTERNS.find(([c]) => c === category)?.[1];
  if (!categoryRe || !categoryRe.test(bundleText)) return null;
  const window = bundleText
    .split(/\n/)
    .filter((line) => categoryRe.test(line))
    .join(" ")
    .slice(0, 3000);
  if (/\b(?:no|not\s+on\s+file|not\s+contained|absent)\b/i.test(window)) return "absent";
  if (/\b(?:referred\s+to|mentioned|summary\s+only|extract\s+only|not\s+included|not\s+attached)\b/i.test(window)) {
    return "referred_only";
  }
  if (/\b(?:partial|stills|screenshots?)\b/i.test(window)) return "partial";
  if (/\b(?:draft|unsigned)\b/i.test(window)) return /unsigned/i.test(window) ? "unsigned" : "draft";
  if (/\b(?:outstanding|not\s+served|to\s+follow|awaiting|missing)\b/i.test(window)) return "outstanding";
  if (/\b(?:served|provided|disclosed|supplied)\b/i.test(window)) return "served";
  return "unclear";
}

function profileFromEvidence(evidence: SourceTruthEvidenceMatrix, bundleText: string): SourceTruthCaseProfile {
  const has = (category: SourceTruthEvidenceCategory) => Boolean(evidence[category]);
  const chargeText = bundleText.slice(0, 60_000);
  const digital = has("extraction") || /\b(?:phone|device|messages?|metadata|subscriber|imei)\b/i.test(chargeText);
  const bwvCustody = has("bwv") || has("custody");
  const drugs = has("drugs") || /\b(?:pwits|controlled\s+drug|possession\s+of\s+.*drug)\b/i.test(chargeText);
  const sexual = has("abe") || /\b(?:rape|sexual|abe)\b/i.test(chargeText);
  const domestic = /\b(?:domestic|partner|ex-partner|coercive|harassment|stalking)\b/i.test(chargeText);
  const count = [digital, bwvCustody, drugs, sexual, domestic].filter(Boolean).length;
  if (count > 1) return "mixed";
  if (digital) return "digital";
  if (bwvCustody) return "bwv_custody";
  if (drugs) return "drugs";
  if (sexual) return "sexual";
  if (domestic) return "domestic";
  return "unknown";
}

export function buildSourceTruthFingerprint(input: {
  bundleText?: string | null;
  ledger?: BundleTruthLedger | null;
}): SourceTruthFingerprint {
  const bundleText = input.bundleText ?? "";
  const ledger = input.ledger ?? (bundleText.trim() ? buildBundleTruthLedger({ bundleText }) : null);
  const evidence: SourceTruthEvidenceMatrix = {};

  for (const row of ledger?.materials ?? []) {
    const category = categoryFor(row);
    if (category === "unknown") continue;
    evidence[category] = stronger(evidence[category], row.status);
  }

  for (const [category] of CATEGORY_PATTERNS) {
    const state = textState(bundleText, category);
    if (state) evidence[category] = stronger(evidence[category], state);
  }

  return {
    profile: profileFromEvidence(evidence, bundleText),
    evidence,
    ledger,
  };
}
