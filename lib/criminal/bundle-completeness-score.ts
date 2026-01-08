/**
 * Phase A — Bundle Completeness (client-safe)
 *
 * Deterministic scoring based on document metadata only (name/type).
 * NO AI. NO guessing beyond explicit keyword/pattern matches.
 *
 * Output:
 * - score: 0–100
 * - completenessFlags: key doc categories
 * - capabilityTier: "thin" | "partial" | "full"
 */

export type BundleCompletenessFlags = {
  hasChargeSheetOrIndictment: boolean;
  hasMG5CaseSummary: boolean;
  hasWitnessStatements: boolean; // >= 1
  hasCCTV: boolean;
  hasCCTVContinuityOrNativeExport: boolean;
  hasBWV: boolean;
  has999CAD: boolean;
  hasCustodyRecord: boolean;
  hasInterviewRecordingOrTranscript: boolean;
  hasMedicalEvidence: boolean;
  hasMG6Schedules: boolean;
};

export type CapabilityTier = "thin" | "partial" | "full";

export type BundleCompleteness = {
  score: number; // 0–100
  flags: BundleCompletenessFlags;
  capabilityTier: CapabilityTier;
};

type DocLike = { name?: string | null; type?: string | null };

const rx = {
  chargeSheetOrIndictment: /\b(charge\s*sheet|indictment|charges?\b|count\s*\d+)\b/i,
  mg5CaseSummary: /\b(mg\s*5|mg5|case\s*summary)\b/i,
  witnessStatement: /\b(witness\s*statement|statement\s+of\s+witness|mg\s*11|mg11)\b/i,
  cctv: /\b(cctv|closed\s*circuit|dvr|camera\s*footage|video\s*footage)\b/i,
  cctvContinuityOrNative: /\b(continuity|native\s*export|native\s*download|export\s*log|download\s*log|chain\s*of\s*custody)\b/i,
  bwv: /\b(bwv|body\s*worn|bodyworn|worn\s*video)\b/i,
  cad999: /\b(999|cad|call\s*log|incident\s*log|dispatch|control\s*room)\b/i,
  custody: /\b(custody\s*record|custody\s*log|detention\s*log|custody\s*sheet)\b/i,
  interview: /\b(interview|record\s*of\s*interview|roi)\b/i,
  interviewMedia: /\b(audio|recording|video|dvd|mp3|wav)\b/i,
  interviewTranscript: /\b(transcript|typed\s*interview)\b/i,
  medical: /\b(medical|injur(y|ies)|hospital|a\&e|ambulance|paramedic|forensic\s*medical)\b/i,
  mg6: /\b(mg\s*6|mg6|mg\s*6c|mg6c|mg\s*6d|mg6d|disclosure\s*schedule|unused\s*material)\b/i,
};

/**
 * Compute bundle completeness deterministically from doc name/type.
 * Weights sum to 100. We do not infer “presence” unless a pattern matches.
 */
export function computeBundleCompleteness(docs: DocLike[]): BundleCompleteness {
  const flags: BundleCompletenessFlags = {
    hasChargeSheetOrIndictment: false,
    hasMG5CaseSummary: false,
    hasWitnessStatements: false,
    hasCCTV: false,
    hasCCTVContinuityOrNativeExport: false,
    hasBWV: false,
    has999CAD: false,
    hasCustodyRecord: false,
    hasInterviewRecordingOrTranscript: false,
    hasMedicalEvidence: false,
    hasMG6Schedules: false,
  };

  for (const d of docs) {
    const hay = `${d?.name ?? ""} ${d?.type ?? ""}`.trim();
    if (!hay) continue;

    if (rx.chargeSheetOrIndictment.test(hay)) flags.hasChargeSheetOrIndictment = true;
    if (rx.mg5CaseSummary.test(hay)) flags.hasMG5CaseSummary = true;
    if (rx.witnessStatement.test(hay)) flags.hasWitnessStatements = true;

    if (rx.cctv.test(hay)) flags.hasCCTV = true;
    if (rx.cctvContinuityOrNative.test(hay)) flags.hasCCTVContinuityOrNativeExport = true;

    if (rx.bwv.test(hay)) flags.hasBWV = true;
    if (rx.cad999.test(hay)) flags.has999CAD = true;
    if (rx.custody.test(hay)) flags.hasCustodyRecord = true;
    if (rx.medical.test(hay)) flags.hasMedicalEvidence = true;
    if (rx.mg6.test(hay)) flags.hasMG6Schedules = true;

    // Interview: only mark as present if “interview” AND (transcript/recording indicators) appear.
    if (rx.interview.test(hay) && (rx.interviewTranscript.test(hay) || rx.interviewMedia.test(hay))) {
      flags.hasInterviewRecordingOrTranscript = true;
    }
  }

  // If we have a CCTV doc AND a separate continuity/native-export doc, treat continuity as present.
  // (We do not force continuity true just because CCTV exists.)
  flags.hasCCTVContinuityOrNativeExport = flags.hasCCTVContinuityOrNativeExport && flags.hasCCTV;

  // Weighted score (0–100). Keep deterministic and transparent.
  const weights: Record<keyof BundleCompletenessFlags, number> = {
    hasChargeSheetOrIndictment: 12,
    hasMG5CaseSummary: 12,
    hasWitnessStatements: 15,
    hasCCTV: 10,
    hasCCTVContinuityOrNativeExport: 6,
    hasBWV: 5,
    has999CAD: 5,
    hasCustodyRecord: 10,
    hasInterviewRecordingOrTranscript: 10,
    hasMedicalEvidence: 5,
    hasMG6Schedules: 10,
  };

  let score = 0;
  (Object.keys(flags) as Array<keyof BundleCompletenessFlags>).forEach((k) => {
    if (flags[k]) score += weights[k];
  });
  score = Math.max(0, Math.min(100, score));

  let capabilityTier: CapabilityTier = "thin";
  if (score >= 70) capabilityTier = "full";
  else if (score >= 35) capabilityTier = "partial";

  return { score, flags, capabilityTier };
}


