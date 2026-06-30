export function hasMg6cAnchor(snippet: string | null, scheduleId: string): boolean {
  if (!snippet) return false;
  return new RegExp(`mg6c\\/${scheduleId}\\b`, "i").test(snippet);
}

export function hasJordanBwvAnchor(snippet: string | null): boolean {
  return hasMg6cAnchor(snippet, "010");
}

export function hasJordanCustodyAnchor(snippet: string | null): boolean {
  return hasMg6cAnchor(snippet, "011");
}

export function hasPhoneExtractionSummaryAnchor(snippet: string | null): boolean {
  return hasMg6cAnchor(snippet, "001") && /phone extraction|summary only|source download outstanding/i.test(snippet);
}

export function hasScreenshotServedAnchor(snippet: string | null): boolean {
  return (
    (hasMg6cAnchor(snippet, "002") && /screenshot/i.test(snippet)) ||
    /mg6c\/002.*screenshot.*served/i.test(snippet ?? "")
  );
}

export function hasSubscriberOutstandingAnchor(snippet: string | null): boolean {
  return hasMg6cAnchor(snippet, "003") && /subscriber|outstanding/i.test(snippet);
}

export function hasMg11AttributionAnchor(snippet: string | null): boolean {
  if (!snippet) return false;
  return /\bmg11\b|complainant statement/i.test(snippet) && /attribution|messages caused/i.test(snippet);
}

export type PhoneSubtopic = "extraction" | "screenshot" | "subscriber" | "message" | "attribution" | "generic";

export function detectPhoneSubtopic(hay: string): PhoneSubtopic {
  const lower = hay.toLowerCase();
  if (/subscriber|account data/i.test(lower)) return "subscriber";
  if (/screenshot/i.test(lower)) return "screenshot";
  if (/full (phone )?(download|extraction)|phone extraction|source download|ufed/i.test(lower)) return "extraction";
  if (/message export|whatsapp|sms|message\/account/i.test(lower)) return "message";
  if (/attribution|complainant mg11/i.test(lower)) return "attribution";
  return "generic";
}

export function preferredMg6ScheduleId(subtopic: PhoneSubtopic): string | null {
  switch (subtopic) {
    case "extraction":
      return "001";
    case "screenshot":
      return "002";
    case "subscriber":
      return "003";
    default:
      return null;
  }
}

export function claimsFullPhoneServed(outputLine: string): boolean {
  const lower = outputLine.toLowerCase();
  const claimsFull =
    /\bfull (phone )?(download|extraction)\b|\b(phone )?download (is )?served\b|\b(phone )?extraction (is )?served\b|\bufed (is )?served\b|\bcomplete message history\b/i.test(
      lower,
    );
  const cautious = /\bsummary only|outstanding|not safely|referred|partial|provisional|disputed|chase\b/i.test(lower);
  return claimsFull && !cautious;
}

export function bundleHasFullPhoneDownload(bundleText: string): boolean {
  return /\bfull (phone )?(download|extraction)\b.*\bserved\b|\bufed\b.*\bserved\b/i.test(bundleText);
}

/** Cautious court/chase line — outstanding extraction, not a served claim. */
export function claimsGenericExtractionOutstanding(outputLine: string): boolean {
  return /full extraction\/source material remains outstanding|full (phone )?(download|extraction).{0,40}outstanding/i.test(
    outputLine,
  );
}

export function bundleMentionsPhoneOrExtraction(bundleText: string): boolean {
  if (
    /\bmg6c\/(pho|ufe|pla|mul|001|mes|sub)|phone extraction|ufed\b|phone download|message export|subscriber|screenshot\b/i.test(
      bundleText,
    )
  ) {
    return true;
  }
  return /\bphone\b.{0,40}\b(extraction|download|export)\b/i.test(bundleText);
}

/** Generic chase/court/export line — not a served proof claim. */
export function isMisplacedFamilyChaseLine(outputLine: string, lineCategory?: string): boolean {
  if (!lineCategory || !["chase_request", "court_note", "export_line", "evidence_state"].includes(lineCategory)) {
    return false;
  }
  if (claimsGenericExtractionOutstanding(outputLine)) return true;
  const lower = outputLine.toLowerCase();
  const cautious =
    /please provide|outstanding|continuity|provenance|appears outstanding|confirm in writing|unknown|needs review|\[provisional\]|:\s*unknown/i.test(
      outputLine,
    );
  const notOverclaim = !/\b(bwv|cctv|cad) (shows|proves|confirms)\b/i.test(lower);
  return cautious && notOverclaim;
}

export function isCoDefendantSafetyLine(outputLine: string): boolean {
  return (
    /co-defendant bleed|another defendant's material|keep this client|do not import another defendant/i.test(
      outputLine,
    ) || /^Source-backed concern — do not import another defendant/i.test(outputLine)
  );
}

export function treatsOtherDefendantAsThisEvidence(outputLine: string, evidenceState: string | null): boolean {
  if (evidenceState === "other_defendant_only") return true;
  const lower = outputLine.toLowerCase();
  const mentionsOther = /\bother defendant|co-defendant|another defendant|second-male\b/i.test(lower);
  const treatsAsProof = /\bproves|confirms|this defendant sent|defendant's phone|defendant operated\b/i.test(lower);
  return mentionsOther && treatsAsProof && !isCoDefendantSafetyLine(outputLine);
}

export function hasEncroExtractsServedAnchor(snippet: string | null): boolean {
  return /mg6c\/enc.*encro message extracts.*served/i.test(snippet ?? "");
}

export function hasHandleMappingOutstandingAnchor(snippet: string | null): boolean {
  return /mg6c\/han.*handle mapping.*outstanding/i.test(snippet ?? "");
}

export function hasCoDefendantMapOutstandingAnchor(snippet: string | null): boolean {
  return /mg6c\/co-.*co-defendant segregation.*outstanding/i.test(snippet ?? "");
}

export function hasPlatformExtractionReferredAnchor(snippet: string | null): boolean {
  return /mg6c\/pla.*(platform extraction|platform export).*referred|export not served/i.test(snippet ?? "");
}

export function hasCctvStillsServedAnchor(snippet: string | null): boolean {
  return /mg6c\/cct.*cctv still.*served/i.test(snippet ?? "");
}

export function hasMasterCctvReferredAnchor(snippet: string | null): boolean {
  return /mg6c\/mas.*master cctv.*referred|master footage.*outstanding/i.test(snippet ?? "");
}

export function hasAbeFragmentAnchor(snippet: string | null): boolean {
  return /mg6c\/abe.*abe transcript fragment.*served/i.test(snippet ?? "");
}

export function hasAbeRecordingReferredAnchor(snippet: string | null): boolean {
  return /mg6c\/abe.*abe recording.*referred|export not served/i.test(snippet ?? "");
}

export function hasFirstAccountOutstanding(bundleText: string): boolean {
  return /mg11.*first account outstanding|not served — first account/i.test(bundleText);
}

export function claimsHandleIsDefendant(outputLine: string): boolean {
  const lower = outputLine.toLowerCase();
  const claims = /\bhandle is (the )?defendant|defendant is shadow|shadow-\d+ is (the )?defendant|attribution confirmed\b/i.test(lower);
  const cautious = /\bnot served|outstanding|provisional|mapping certificate|referred only\b/i.test(lower);
  return claims && !cautious;
}

export function claimsEncroProves(outputLine: string): boolean {
  const lower = outputLine.toLowerCase();
  const claims = /\bencro proves|encro confirms|encro shows supply\b/i.test(lower);
  const cautious = /\bdo not|must not|provisional|referred|outstanding\b/i.test(lower);
  return claims && !cautious;
}

export function claimsAbeFullyServed(outputLine: string): boolean {
  const lower = outputLine.toLowerCase();
  const claims = /\babe confirms|\babe proves|\babe recording (is )?served|\bfull interview (is )?served\b/i.test(lower);
  const cautious = /\bfragment|referred|outstanding|not served|partial|transcript fragment only\b/i.test(lower);
  return claims && !cautious;
}

export function claimsStillsAsFullCctvProof(outputLine: string): boolean {
  const lower = outputLine.toLowerCase();
  const claims = /\bcctv (proves|shows|confirms|identifies)\b|\bstills (prove|confirm|are full)\b|\bfull cctv (proves|confirms)\b/i.test(lower);
  const cautious = /\bstills only|grainy|master.*outstanding|referred only|not safely|do not state\b/i.test(lower);
  return claims && !cautious;
}

export function bundleHasFullAbeRecording(bundleText: string): boolean {
  return /\babe recording\b.*\bserved on bundle\b/i.test(bundleText);
}

export function bundleHasMasterCctvServed(bundleText: string): boolean {
  return /\bmaster (cctv|footage)\b.*\bserved on bundle\b/i.test(bundleText);
}

export function hasShapeAnchor(snippet: string | null, hay: string, bundleText?: string): boolean {
  if (!snippet && bundleText && /first account|historic context/i.test(hay) && hasFirstAccountOutstanding(bundleText)) {
    return true;
  }
  if (!snippet) return false;
  return (
    hasJordanBwvAnchor(snippet) ||
    hasJordanCustodyAnchor(snippet) ||
    hasPhoneExtractionSummaryAnchor(snippet) ||
    hasScreenshotServedAnchor(snippet) ||
    hasSubscriberOutstandingAnchor(snippet) ||
    hasMg11AttributionAnchor(snippet) ||
    hasEncroExtractsServedAnchor(snippet) ||
    hasHandleMappingOutstandingAnchor(snippet) ||
    hasCoDefendantMapOutstandingAnchor(snippet) ||
    hasPlatformExtractionReferredAnchor(snippet) ||
    hasCctvStillsServedAnchor(snippet) ||
    hasMasterCctvReferredAnchor(snippet) ||
    hasAbeFragmentAnchor(snippet) ||
    hasAbeRecordingReferredAnchor(snippet) ||
    (/mg6c\/mes.*served/i.test(snippet) && /message content/i.test(hay)) ||
    (/mg6c\/sub.*outstanding/i.test(snippet) && /subscriber/i.test(hay)) ||
    (/mg6c\/nrm.*outstanding/i.test(snippet) && /nrm|referral/i.test(hay))
  );
}
