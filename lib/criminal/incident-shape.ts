/**
 * Incident Shape Classifier
 * 
 * Classifies the alleged incident form deterministically based on evidence.
 * No predictions - only describes what the evidence indicates.
 */

export type IncidentShape = 
  | "single_impulsive_blow"
  | "brief_chaotic_scuffle"
  | "sustained_targeted_attack"
  | "unclear_disclosure_dependent";

export type IncidentShapeAnalysis = {
  shape: IncidentShape;
  explanation: string;
  evidenceBasis: string[];
};

/**
 * Classify incident shape from documents and timeline
 */
export function classifyIncidentShape(
  documents: Array<{ name: string; extracted_json?: unknown }>,
  timeline?: Array<{ label: string; description?: string }>,
  evidenceImpactMap?: Array<{ evidenceItem: { name: string } }>
): IncidentShapeAnalysis {
  const corpus = documents
    .map((d) => {
      const name = d.name.toLowerCase();
      const json = typeof d.extracted_json === "string" 
        ? d.extracted_json.toLowerCase()
        : JSON.stringify(d.extracted_json || {}).toLowerCase();
      return `${name} ${json}`;
    })
    .join(" ");

  const timelineText = timeline
    ?.map((t) => `${t.label} ${t.description || ""}`.toLowerCase())
    .join(" ") || "";

  const fullText = `${corpus} ${timelineText}`.toLowerCase();

  // Check for single strike indicators
  const singleStrikePatterns = [
    /(?:single|one|once|single\s*blow|one\s*strike|one\s*punch|single\s*strike)/i,
    /(?:struck\s*once|hit\s*once|punched\s*once|struck\s*one\s*time)/i,
  ];

  // Check for multiple strikes/sustained attack
  const sustainedPatterns = [
    /(?:multiple|repeated|several|numerous|many)\s*(?:blows|strikes|punches|hits|attacks)/i,
    /(?:continued|ongoing|sustained|prolonged)\s*(?:attack|assault|violence)/i,
    /(?:repeatedly|again\s*and\s*again|over\s*and\s*over)/i,
  ];

  // Check for chaotic/scuffle indicators
  const scufflePatterns = [
    /(?:scuffle|struggle|altercation|melee|chaotic|unclear\s*sequence)/i,
    /(?:both\s*parties|mutual|exchanged|back\s*and\s*forth)/i,
  ];

  // Check for targeted/intentional indicators
  const targetedPatterns = [
    /(?:targeted|deliberate|intentional|premeditated|planned)/i,
    /(?:aimed\s*at|directed\s*towards|specifically)/i,
  ];

  // Check for duration evidence
  const hasDurationEvidence = /(?:duration|lasted|continued\s*for|over\s*the\s*course\s*of)/i.test(fullText);

  // Check for sequence evidence
  const hasSequenceEvidence = /(?:sequence|timeline|order\s*of\s*events|chronology)/i.test(fullText);

  // Check if disclosure-dependent
  const isDisclosureDependent = evidenceImpactMap?.some((impact) => {
    const item = impact.evidenceItem.name.toLowerCase();
    return item.includes("cctv") || 
           item.includes("sequence") || 
           item.includes("timeline") ||
           item.includes("duration");
  }) || !hasSequenceEvidence;

  const evidenceBasis: string[] = [];

  // Classification logic
  if (isDisclosureDependent && !hasSequenceEvidence) {
    return {
      shape: "unclear_disclosure_dependent",
      explanation: "Insufficient evidence to classify incident shape. Classification depends on disclosure of sequence evidence, CCTV, or timeline data.",
      evidenceBasis: ["Sequence evidence not present", "CCTV or timeline data may clarify incident shape"],
    };
  }

  if (singleStrikePatterns.some((p) => p.test(fullText)) && !hasDurationEvidence) {
    evidenceBasis.push("Single strike mentioned in evidence");
    if (!hasDurationEvidence) {
      evidenceBasis.push("No duration evidence contradicts single strike");
    }
    return {
      shape: "single_impulsive_blow",
      explanation: "Evidence indicates a single impulsive blow. No evidence of multiple strikes or sustained attack.",
      evidenceBasis,
    };
  }

  if (sustainedPatterns.some((p) => p.test(fullText)) || hasDurationEvidence) {
    evidenceBasis.push("Multiple strikes or duration evidence present");
    if (targetedPatterns.some((p) => p.test(fullText))) {
      evidenceBasis.push("Targeted or intentional indicators present");
      return {
        shape: "sustained_targeted_attack",
        explanation: "Evidence indicates a sustained, targeted attack with multiple strikes or prolonged duration.",
        evidenceBasis,
      };
    }
    return {
      shape: "brief_chaotic_scuffle",
      explanation: "Evidence indicates multiple strikes or chaotic sequence, but not clearly targeted or sustained.",
      evidenceBasis,
    };
  }

  if (scufflePatterns.some((p) => p.test(fullText))) {
    evidenceBasis.push("Scuffle or chaotic sequence indicators present");
    return {
      shape: "brief_chaotic_scuffle",
      explanation: "Evidence indicates a brief chaotic scuffle or altercation.",
      evidenceBasis,
    };
  }

  // Default to unclear if insufficient evidence
  return {
    shape: "unclear_disclosure_dependent",
    explanation: "Insufficient evidence to classify incident shape. Requires further disclosure or evidence.",
    evidenceBasis: ["Insufficient sequence or duration evidence"],
  };
}
