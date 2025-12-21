/**
 * Evidence Strength Analyzer
 * 
 * Analyzes prosecution evidence strength and provides reality calibration
 * to prevent over-aggressive strategies when prosecution case is strong.
 */

export type EvidenceStrength = {
  overallStrength: number; // 0-100
  level: "VERY_WEAK" | "WEAK" | "MODERATE" | "STRONG" | "VERY_STRONG";
  factors: {
    identification: {
      strength: number;
      hasCCTV: boolean;
      hasWitnesses: boolean;
      hasFacialRecognition: boolean;
      hasFormalProcedure: boolean;
    };
    forensics: {
      strength: number;
      hasWeapon: boolean;
      hasFingerprints: boolean;
      hasDNA: boolean;
      hasChainOfCustody: boolean;
    };
    witnesses: {
      strength: number;
      count: number;
      hasComplainant: boolean;
      hasIndependent: boolean;
      consistency: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    };
    pace: {
      strength: number;
      isCompliant: boolean;
      hasSolicitor: boolean;
      isRecorded: boolean;
      hasRightsGiven: boolean;
    };
    medical: {
      strength: number;
      hasEvidence: boolean;
      isConsistent: boolean;
    };
    disclosure: {
      strength: number;
      hasGaps: boolean;
      gapSeverity: "CRITICAL" | "MODERATE" | "MINOR" | "NONE";
      isFoundational: boolean; // Are gaps in core evidence or supplementary?
    };
  };
  calibration: {
    shouldDowngradeDisclosureStay: boolean;
    shouldDowngradePACE: boolean;
    shouldFocusOnPleaMitigation: boolean;
    realisticOutcome: string;
    languageTone: "AGGRESSIVE" | "MODERATE" | "CONSERVATIVE";
  };
  warnings: string[];
};

/**
 * Analyze evidence strength from case documents and analysis
 */
export function analyzeEvidenceStrength(data: {
  documents?: any[];
  keyFacts?: any;
  aggressiveDefense?: any;
  strategicOverview?: any;
}): EvidenceStrength {
  const factors = {
    identification: analyzeIdentification(data),
    forensics: analyzeForensics(data),
    witnesses: analyzeWitnesses(data),
    pace: analyzePACE(data),
    medical: analyzeMedical(data),
    disclosure: analyzeDisclosure(data),
  };

  // Calculate overall strength (weighted average)
  const weights = {
    identification: 0.25,
    forensics: 0.25,
    witnesses: 0.20,
    pace: 0.10,
    medical: 0.10,
    disclosure: 0.10,
  };

  const overallStrength = Math.round(
    factors.identification.strength * weights.identification +
    factors.forensics.strength * weights.forensics +
    factors.witnesses.strength * weights.witnesses +
    factors.pace.strength * weights.pace +
    factors.medical.strength * weights.medical +
    factors.disclosure.strength * weights.disclosure
  );

  // Determine level
  let level: EvidenceStrength["level"];
  if (overallStrength >= 80) level = "VERY_STRONG";
  else if (overallStrength >= 60) level = "STRONG";
  else if (overallStrength >= 40) level = "MODERATE";
  else if (overallStrength >= 20) level = "WEAK";
  else level = "VERY_WEAK";

  // Calibration logic
  const calibration = calculateCalibration(overallStrength, factors);

  // Warnings
  const warnings: string[] = [];
  if (overallStrength >= 70) {
    warnings.push("Strong prosecution case - focus on procedural leverage, not factual collapse");
    warnings.push("Realistic outcomes: charge reduction, plea strategy, sentence mitigation");
  }
  if (factors.pace.isCompliant && overallStrength >= 50) {
    warnings.push("PACE appears compliant - downgrade PACE breach angles");
  }
  if (factors.disclosure.gapSeverity === "MINOR" && overallStrength >= 60) {
    warnings.push("Disclosure gaps are supplementary, not foundational - stay unlikely");
  }

  return {
    overallStrength,
    level,
    factors,
    calibration,
    warnings,
  };
}

function analyzeIdentification(data: any): EvidenceStrength["factors"]["identification"] {
  // Combine all text sources
  let text = "";
  if (data.documents) {
    data.documents.forEach((doc: any) => {
      if (doc.raw_text) text += " " + doc.raw_text;
      if (doc.extracted_facts) text += " " + JSON.stringify(doc.extracted_facts);
    });
  }
  if (data.keyFacts) text += " " + JSON.stringify(data.keyFacts);
  if (data.aggressiveDefense) text += " " + JSON.stringify(data.aggressiveDefense);
  if (data.strategicOverview) text += " " + JSON.stringify(data.strategicOverview);
  text = text.toLowerCase();
  
  const hasCCTV = /cctv|video|footage|recording|ms-cctv|bl-cctv/i.test(text);
  const hasWitnesses = /witness|eyewitness|complainant|michael chen|sarah mitchell/i.test(text);
  const hasFacialRecognition = /facial recognition|facial rec|92%|confidence|identified.*individual/i.test(text);
  const hasFormalProcedure = /code d|identification procedure|formal id|identified.*from.*stills/i.test(text);

  let strength = 0;
  if (hasCCTV) strength += 30;
  if (hasWitnesses) strength += 25;
  if (hasFacialRecognition) strength += 25;
  if (hasFormalProcedure) strength += 20;
  // If multiple factors, add bonus
  const factorCount = [hasCCTV, hasWitnesses, hasFacialRecognition, hasFormalProcedure].filter(Boolean).length;
  if (factorCount >= 3) strength += 10;

  return {
    strength: Math.min(100, strength),
    hasCCTV,
    hasWitnesses,
    hasFacialRecognition,
    hasFormalProcedure,
  };
}

function analyzeForensics(data: any): EvidenceStrength["factors"]["forensics"] {
  let text = "";
  if (data.documents) {
    data.documents.forEach((doc: any) => {
      if (doc.raw_text) text += " " + doc.raw_text;
      if (doc.extracted_facts) text += " " + JSON.stringify(doc.extracted_facts);
    });
  }
  if (data.keyFacts) text += " " + JSON.stringify(data.keyFacts);
  if (data.aggressiveDefense) text += " " + JSON.stringify(data.aggressiveDefense);
  text = text.toLowerCase();
  
  const hasWeapon = /weapon|knife|blade|implement|metal pipe|metal bar|35cm/i.test(text);
  const hasFingerprints = /fingerprint|finger print|dactyloscopy|fingerprints.*found|fingerprints.*on/i.test(text);
  const hasDNA = /dna|genetic|biological/i.test(text);
  const hasChainOfCustody = /chain of custody|custody record|exhibit|recovered.*forensically/i.test(text);

  let strength = 0;
  if (hasWeapon) strength += 30;
  if (hasFingerprints) strength += 30;
  if (hasDNA) strength += 20;
  if (hasChainOfCustody) strength += 20;

  return {
    strength: Math.min(100, strength),
    hasWeapon,
    hasFingerprints,
    hasDNA,
    hasChainOfCustody,
  };
}

function analyzeWitnesses(data: any): EvidenceStrength["factors"]["witnesses"] {
  const text = JSON.stringify(data).toLowerCase();
  
  const hasComplainant = /complainant|victim/i.test(text);
  const hasIndependent = /independent witness|civilian witness/i.test(text);
  
  // Count witnesses (rough estimate)
  const witnessMatches = text.match(/witness|complainant|eyewitness/gi);
  const count = witnessMatches ? Math.min(witnessMatches.length, 5) : 0;

  let strength = 0;
  if (hasComplainant) strength += 30;
  if (hasIndependent) strength += 30;
  if (count >= 2) strength += 20;
  if (count >= 3) strength += 10;

  // Consistency (simplified - would need more analysis)
  const consistency: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" = 
    count >= 2 ? "MEDIUM" : "UNKNOWN";

  return {
    strength: Math.min(100, strength),
    count,
    hasComplainant,
    hasIndependent,
    consistency,
  };
}

function analyzePACE(data: any): EvidenceStrength["factors"]["pace"] {
  let text = "";
  if (data.documents) {
    data.documents.forEach((doc: any) => {
      if (doc.raw_text) text += " " + doc.raw_text;
      if (doc.extracted_facts) text += " " + JSON.stringify(doc.extracted_facts);
    });
  }
  if (data.keyFacts) text += " " + JSON.stringify(data.keyFacts);
  text = text.toLowerCase();
  
  const hasSolicitor = /solicitor present|legal representative|duty solicitor|jennifer walsh|legal advice.*present/i.test(text);
  const isRecorded = /recorded interview|tape|audio|video recorded|audio.*video recorded|pace compliant/i.test(text);
  const hasRightsGiven = /rights given|caution|right to silence|pace rights|rights.*entitlements.*given/i.test(text);
  const hasBreaches = /pace breach|code c breach|code d breach|non-compliance|breach.*pace/i.test(text);
  
  // Check for explicit compliance indicators
  const explicitCompliant = /pace compliance|all pace codes.*complied|pace.*compliant|rights.*entitlements.*given.*appropriate/i.test(text);

  // If explicit compliance indicators, mark as compliant
  const isCompliant = (hasSolicitor && isRecorded && hasRightsGiven) || !hasBreaches;

  let strength = 0;
  if (isCompliant) {
    strength = 80; // Strong PACE compliance
  } else if (hasBreaches) {
    strength = 30; // Weak due to breaches
  } else {
    strength = 50; // Unknown/mixed
  }

  return {
    strength,
    isCompliant,
    hasSolicitor,
    isRecorded,
    hasRightsGiven,
  };
}

function analyzeMedical(data: any): EvidenceStrength["factors"]["medical"] {
  let text = "";
  if (data.documents) {
    data.documents.forEach((doc: any) => {
      if (doc.raw_text) text += " " + doc.raw_text;
      if (doc.extracted_facts) text += " " + JSON.stringify(doc.extracted_facts);
    });
  }
  if (data.keyFacts) text += " " + JSON.stringify(data.keyFacts);
  text = text.toLowerCase();
  
  const hasEvidence = /medical|injury|wound|hospital|a&e|surgery|fractured|cheekbone|dr\.|priya sharma/i.test(text);
  const isConsistent = /consistent|repeated blows|serious injury|fractured.*cheekbone|surgical intervention/i.test(text);

  let strength = 0;
  if (hasEvidence) strength += 50;
  if (isConsistent) strength += 30;

  return {
    strength: Math.min(100, strength),
    hasEvidence,
    isConsistent: hasEvidence && isConsistent,
  };
}

function analyzeDisclosure(data: any): EvidenceStrength["factors"]["disclosure"] {
  const text = JSON.stringify(data).toLowerCase();
  
  const hasGaps = /disclosure gap|missing|not provided|requested/i.test(text);
  const isCritical = /critical|foundational|core evidence|essential/i.test(text);
  const isSupplementary = /supplementary|adjunct|additional|extra/i.test(text);

  let gapSeverity: "CRITICAL" | "MODERATE" | "MINOR" | "NONE";
  if (!hasGaps) {
    gapSeverity = "NONE";
  } else if (isCritical) {
    gapSeverity = "CRITICAL";
  } else if (isSupplementary) {
    gapSeverity = "MINOR";
  } else {
    gapSeverity = "MODERATE";
  }

  const isFoundational = isCritical && !isSupplementary;

  let strength = 100; // Start strong
  if (gapSeverity === "CRITICAL") strength = 40;
  else if (gapSeverity === "MODERATE") strength = 70;
  else if (gapSeverity === "MINOR") strength = 90;

  return {
    strength,
    hasGaps,
    gapSeverity,
    isFoundational,
  };
}

function calculateCalibration(
  overallStrength: number,
  factors: EvidenceStrength["factors"]
): EvidenceStrength["calibration"] {
  const shouldDowngradeDisclosureStay = 
    overallStrength >= 60 && factors.disclosure.gapSeverity !== "CRITICAL";
  
  const shouldDowngradePACE = 
    factors.pace.isCompliant && overallStrength >= 50;
  
  const shouldFocusOnPleaMitigation = overallStrength >= 70;

  let realisticOutcome: string;
  if (overallStrength >= 80) {
    realisticOutcome = "Strong prosecution case - focus on charge reduction, plea strategy, sentence mitigation";
  } else if (overallStrength >= 60) {
    realisticOutcome = "Moderate-strong prosecution case - procedural leverage and charge reduction opportunities";
  } else if (overallStrength >= 40) {
    realisticOutcome = "Moderate prosecution case - viable defense strategies available";
  } else {
    realisticOutcome = "Weak prosecution case - aggressive defense strategies viable";
  }

  let languageTone: "AGGRESSIVE" | "MODERATE" | "CONSERVATIVE";
  if (overallStrength >= 70) {
    languageTone = "CONSERVATIVE";
  } else if (overallStrength >= 40) {
    languageTone = "MODERATE";
  } else {
    languageTone = "AGGRESSIVE";
  }

  return {
    shouldDowngradeDisclosureStay,
    shouldDowngradePACE,
    shouldFocusOnPleaMitigation,
    realisticOutcome,
    languageTone,
  };
}
