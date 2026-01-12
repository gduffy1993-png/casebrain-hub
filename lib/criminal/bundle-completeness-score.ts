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

type DocLike = { 
  name?: string | null; 
  type?: string | null;
  extracted_json?: unknown; // Optional extracted content for content-based detection
};

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
 * Detect witness statement from content-based signals (not just filename).
 * 
 * Heuristic: Check for:
 * - "Witness Details" OR
 * - "Statement of Truth" OR
 * - First-person narrative patterns ("I was", "I saw", "I became involved")
 * 
 * This ensures MG11 witness statements are correctly classified even with non-canonical filenames
 * (e.g., "MG11.pdf (1).pdf" or similar variants).
 */
function detectWitnessStatementFromContent(extracted_json: unknown): boolean {
  if (!extracted_json || typeof extracted_json !== "object") return false;
  
  const extracted = extracted_json as any;
  
  // Get text content from common extraction fields
  const summary = typeof extracted.summary === "string" ? extracted.summary : "";
  const text = typeof extracted.text === "string" ? extracted.text : "";
  const rawText = typeof extracted.raw_text === "string" ? extracted.raw_text : "";
  
  // Combine all available text
  const corpus = [summary, text, rawText].filter(Boolean).join(" ").toLowerCase();
  
  if (!corpus) return false;
  
  // Check for explicit witness statement markers
  const explicitMarkers = [
    "witness details",
    "statement of truth",
    "statement of witness",
  ];
  
  if (explicitMarkers.some(marker => corpus.includes(marker))) {
    return true;
  }
  
  // Check for first-person narrative patterns (common in witness statements)
  // Look for patterns like "I was", "I saw", "I became involved", "I witnessed"
  const firstPersonPatterns = [
    /\bI\s+(was|saw|witnessed|observed|noticed|heard|became|noted|recalled|remember|remembered)\b/i,
    /\bI\s+(am|was)\s+involved\b/i,
    /\bI\s+(told|said|stated|informed|reported)\b/i,
  ];
  
  // Require at least 2 first-person narrative patterns for reliability
  const firstPersonMatches = firstPersonPatterns.filter(pattern => pattern.test(corpus)).length;
  if (firstPersonMatches >= 2) {
    return true;
  }
  
  return false;
}

/**
 * Compute bundle completeness deterministically from doc name/type and content.
 * Weights sum to 100. We do not infer "presence" unless a pattern matches.
 * 
 * Content-based detection is used for witness statements to handle non-canonical filenames.
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
    if (!hay && !d?.extracted_json) continue;

    if (rx.chargeSheetOrIndictment.test(hay)) flags.hasChargeSheetOrIndictment = true;
    if (rx.mg5CaseSummary.test(hay)) flags.hasMG5CaseSummary = true;
    
    // Witness statement detection: filename OR content-based
    if (rx.witnessStatement.test(hay) || detectWitnessStatementFromContent(d?.extracted_json)) {
      flags.hasWitnessStatements = true;
    }

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


