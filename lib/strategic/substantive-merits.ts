/**
 * Substantive Merits Detection for Clinical Negligence
 * 
 * Detects and scores substantive case strengths for claimant clinical negligence cases:
 * - NICE guideline breaches
 * - Delay in diagnosis/treatment
 * - Expert confirmation of avoidability
 * - Serious harm indicators (ICU, sepsis, surgery)
 * - Psychological injury
 */

import { getSupabaseAdminClient } from "../supabase";

type SubstantiveMeritsInput = {
  caseId: string;
  orgId: string;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
};

export type SubstantiveMerits = {
  guidelineBreaches: {
    detected: boolean;
    count: number;
    details: string[];
    score: number;
  };
  delayCausation: {
    detected: boolean;
    count: number;
    details: string[];
    score: number;
  };
  expertConfirmation: {
    detected: boolean;
    count: number;
    details: string[];
    score: number;
  };
  seriousHarm: {
    detected: boolean;
    indicators: string[];
    score: number;
  };
  psychologicalInjury: {
    detected: boolean;
    score: number;
  };
  totalScore: number;
};

/**
 * Detect substantive merits for clinical negligence claimant cases
 */
export async function detectSubstantiveMerits(
  input: SubstantiveMeritsInput,
): Promise<SubstantiveMerits> {
  const supabase = getSupabaseAdminClient();
  
  // Collect all text for analysis
  const documentNames = input.documents.map(d => d.name.toLowerCase());
  const timelineDescriptions = input.timeline.map(t => t.description.toLowerCase());
  let allText = [...documentNames, ...timelineDescriptions].join(" ");
  
  // Try to get extracted facts from documents
  try {
    const { data: documentsWithFacts } = await supabase
      .from("documents")
      .select("id, extracted_json, raw_text, name")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId)
      .limit(10);
    
    if (documentsWithFacts) {
      for (const doc of documentsWithFacts) {
        const extracted = doc.extracted_json as any;
        const rawText = (doc.raw_text || "").toLowerCase();
        
        // Add extracted content to analysis
        if (extracted) {
          allText += " " + JSON.stringify(extracted).toLowerCase();
        }
        if (rawText) {
          allText += " " + rawText;
        }
      }
    }
  } catch (error) {
    console.warn("[substantive-merits] Failed to load document content:", error);
  }
  
  const textLower = allText.toLowerCase();
  
  // 1. NICE GUIDELINE BREACHES (+30 per confirmed breach)
  const guidelineKeywords = [
    "nice guideline",
    "nice guidelines",
    "national institute",
    "clinical excellence",
    "ncg", // National Clinical Guideline
    "guideline breach",
    "guidelines not followed",
    "departed from guidelines",
    "failed to follow",
    "guideline compliance",
    "sepsis pathway",
    "sepsis 6",
    "sepsis bundle",
    "triage protocol",
    "red flag",
    "amber flag",
    "early warning score",
    "news score",
    "mews score",
    "observe protocol",
    "monitoring protocol",
  ];
  
  const guidelineBreaches: string[] = [];
  for (const keyword of guidelineKeywords) {
    if (textLower.includes(keyword)) {
      guidelineBreaches.push(keyword);
    }
  }
  
  // Check for specific breach language
  const breachIndicators = [
    "breach of",
    "failed to comply",
    "not followed",
    "departed from",
    "non-compliance",
    "non compliance",
    "should have",
    "ought to have",
  ];
  
  let guidelineBreachScore = 0;
  for (const indicator of breachIndicators) {
    if (textLower.includes(indicator)) {
      // Check if it's in context of guidelines
      const context = textLower.substring(
        Math.max(0, textLower.indexOf(indicator) - 100),
        Math.min(textLower.length, textLower.indexOf(indicator) + 200)
      );
      if (
        context.includes("guideline") ||
        context.includes("protocol") ||
        context.includes("standard") ||
        context.includes("policy")
      ) {
        guidelineBreachScore += 30;
        guidelineBreaches.push(`Breach indicated: ${indicator}`);
        break; // Count once per document set
      }
    }
  }
  
  // If we found guideline keywords, add base score
  if (guidelineBreaches.length > 0 && guidelineBreachScore === 0) {
    guidelineBreachScore = 30; // Default score if keywords found but no explicit breach language
  }
  
  // 2. DELAY IN DIAGNOSIS/TREATMENT (+25 per delay-caused injury)
  const delayKeywords = [
    "delay in diagnosis",
    "delayed diagnosis",
    "delay in treatment",
    "delayed treatment",
    "missed diagnosis",
    "failure to diagnose",
    "diagnostic delay",
    "treatment delay",
    "delayed referral",
    "delay to referral",
    "should have been",
    "earlier diagnosis",
    "earlier treatment",
    "timely treatment",
    "timely diagnosis",
    "time to treatment",
    "door to needle",
    "door to antibiotic",
    "symptom to diagnosis",
  ];
  
  const delayDetails: string[] = [];
  let delayScore = 0;
  for (const keyword of delayKeywords) {
    if (textLower.includes(keyword)) {
      delayDetails.push(keyword);
      // Check if delay is linked to harm
      const context = textLower.substring(
        Math.max(0, textLower.indexOf(keyword) - 100),
        Math.min(textLower.length, textLower.indexOf(keyword) + 200)
      );
      if (
        context.includes("caused") ||
        context.includes("result") ||
        context.includes("avoidable") ||
        context.includes("injury") ||
        context.includes("harm") ||
        context.includes("outcome")
      ) {
        delayScore += 25;
      }
    }
  }
  
  // Deduplicate delay details
  const uniqueDelays = Array.from(new Set(delayDetails));
  
  // 3. EXPERT CONFIRMATION OF AVOIDABILITY (+40 per expert confirmation)
  const expertKeywords = [
    "expert report",
    "expert opinion",
    "expert confirms",
    "expert concludes",
    "expert states",
    "expert opines",
    "breach report",
    "causation report",
    "liability report",
    "expert evidence",
    "expert witness",
  ];
  
  const expertConfirmations: string[] = [];
  let expertScore = 0;
  
  for (const keyword of expertKeywords) {
    if (textLower.includes(keyword)) {
      // Check context for positive causation language
      const context = textLower.substring(
        Math.max(0, textLower.indexOf(keyword) - 150),
        Math.min(textLower.length, textLower.indexOf(keyword) + 300)
      );
      
      const positiveIndicators = [
        "confirmed",
        "established",
        "breach",
        "causation",
        "avoidable",
        "negligent",
        "below standard",
        "substandard",
        "fell below",
        "did not meet",
        "material contribution",
        "but for",
      ];
      
      for (const indicator of positiveIndicators) {
        if (context.includes(indicator)) {
          expertScore += 40;
          expertConfirmations.push(`${keyword}: ${indicator}`);
          break; // Count once per expert reference
        }
      }
    }
  }
  
  // Also check for explicit "avoidable" language
  if (textLower.includes("avoidable") && expertScore === 0) {
    expertScore += 20; // Lower score if avoidable mentioned but not in expert context
  }
  
  // 4. SERIOUS HARM INDICATORS (+20 per indicator)
  const seriousHarmIndicators: string[] = [];
  let seriousHarmScore = 0;
  
  const harmKeywords = [
    { term: "icu", score: 20 },
    { term: "intensive care", score: 20 },
    { term: "critical care", score: 20 },
    { term: "sepsis", score: 20 },
    { term: "septic", score: 20 },
    { term: "septic shock", score: 25 },
    { term: "surgery", score: 15 },
    { term: "surgical", score: 15 },
    { term: "abscess", score: 15 },
    { term: "infection", score: 10 },
    { term: "amputation", score: 30 },
    { term: "permanent disability", score: 25 },
    { term: "life threatening", score: 25 },
    { term: "life-threatening", score: 25 },
    { term: "cardiac arrest", score: 25 },
    { term: "stroke", score: 20 },
    { term: "brain injury", score: 25 },
    { term: "spinal injury", score: 25 },
  ];
  
  for (const { term, score } of harmKeywords) {
    if (textLower.includes(term)) {
      seriousHarmIndicators.push(term);
      seriousHarmScore += score;
    }
  }
  
  // Deduplicate - don't double count similar terms
  const uniqueHarmIndicators = Array.from(new Set(seriousHarmIndicators));
  // Adjust score if we double-counted (e.g., "sepsis" and "septic")
  if (uniqueHarmIndicators.includes("sepsis") && uniqueHarmIndicators.includes("septic")) {
    seriousHarmScore -= 10; // Remove double-counting
  }
  
  // 5. PSYCHOLOGICAL INJURY (+15 if present)
  const psychKeywords = [
    "psychological",
    "psychiatric",
    "ptsd",
    "post-traumatic",
    "anxiety",
    "depression",
    "trauma",
    "emotional distress",
    "psychological harm",
    "psychiatric injury",
    "mental health",
    "psychologist",
    "psychiatrist",
  ];
  
  let psychScore = 0;
  for (const keyword of psychKeywords) {
    if (textLower.includes(keyword)) {
      psychScore = 15;
      break;
    }
  }
  
  const totalScore = guidelineBreachScore + delayScore + expertScore + seriousHarmScore + psychScore;
  
  return {
    guidelineBreaches: {
      detected: guidelineBreaches.length > 0 || guidelineBreachScore > 0,
      count: guidelineBreaches.length,
      details: guidelineBreaches.slice(0, 5), // Limit to top 5
      score: guidelineBreachScore,
    },
    delayCausation: {
      detected: uniqueDelays.length > 0 || delayScore > 0,
      count: uniqueDelays.length,
      details: uniqueDelays.slice(0, 5),
      score: delayScore,
    },
    expertConfirmation: {
      detected: expertConfirmations.length > 0 || expertScore > 0,
      count: expertConfirmations.length,
      details: expertConfirmations.slice(0, 5),
      score: expertScore,
    },
    seriousHarm: {
      detected: uniqueHarmIndicators.length > 0,
      indicators: uniqueHarmIndicators.slice(0, 10),
      score: seriousHarmScore,
    },
    psychologicalInjury: {
      detected: psychScore > 0,
      score: psychScore,
    },
    totalScore,
  };
}

