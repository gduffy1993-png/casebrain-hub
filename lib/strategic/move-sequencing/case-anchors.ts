/**
 * Case Anchors Extractor
 * 
 * Extracts case-specific anchors (ankle, fracture, radiology, delay, surgery)
 * from documents to make CN output more case-specific.
 */

import type { MoveSequenceInput } from "./types";

export type CaseAnchors = {
  bodyPart?: string;      // e.g., "ankle", "limb", "knee"
  injuryType?: string;    // e.g., "fracture", "missed fracture"
  evidenceType?: string;  // e.g., "radiology report", "addendum"
  delayDays?: number;     // e.g., 5, 10
  procedure?: string;     // e.g., "surgery", "fixation"
};

/**
 * Extract case anchors from documents
 */
export function extractCaseAnchors(
  input: MoveSequenceInput
): CaseAnchors {
  const anchors: CaseAnchors = {};
  
  // Combine all document text
  const allText = input.documents
    .map(d => {
      const name = d.name?.toLowerCase() || "";
      const extracted = d.extracted_json as any;
      const rawText = extracted?.raw_text || extracted?.summary || "";
      return `${name} ${rawText}`.toLowerCase();
    })
    .join(" ");
  
  // Extract body part
  const bodyParts = ["ankle", "knee", "hip", "wrist", "shoulder", "elbow", "limb", "leg", "arm", "foot", "hand"];
  for (const part of bodyParts) {
    if (allText.includes(part)) {
      anchors.bodyPart = part;
      break;
    }
  }
  
  // Extract injury type
  if (allText.includes("fracture")) {
    if (allText.includes("missed") || allText.includes("undiagnosed")) {
      anchors.injuryType = "missed fracture";
    } else {
      anchors.injuryType = "fracture";
    }
  } else if (allText.includes("dislocation")) {
    anchors.injuryType = "dislocation";
  } else if (allText.includes("injury")) {
    anchors.injuryType = "injury";
  }
  
  // Extract evidence type
  if (allText.includes("radiology") || allText.includes("x-ray") || allText.includes("xray")) {
    anchors.evidenceType = "radiology report";
    if (allText.includes("addendum")) {
      anchors.evidenceType = "radiology report/addendum";
    }
  }
  
  // Extract delay (look for "delay", "days", numbers)
  const delayMatch = allText.match(/(\d+)\s*(day|days).*delay|delay.*(\d+)\s*(day|days)/i);
  if (delayMatch) {
    const days = parseInt(delayMatch[1] || delayMatch[3] || "0");
    if (days > 0) {
      anchors.delayDays = days;
    }
  }
  
  // Extract procedure
  if (allText.includes("surgery") || allText.includes("operation")) {
    anchors.procedure = "surgery";
  } else if (allText.includes("fixation")) {
    anchors.procedure = "fixation";
  } else if (allText.includes("procedure")) {
    anchors.procedure = "procedure";
  }
  
  return anchors;
}

/**
 * Inject anchors into text
 */
export function injectAnchors(text: string, anchors: CaseAnchors): string {
  let result = text;
  
  // Inject body part if present
  if (anchors.bodyPart && !result.toLowerCase().includes(anchors.bodyPart)) {
    // Try to inject after "injury" or "fracture"
    result = result.replace(
      /(injury|fracture|dislocation)/i,
      `$1 (${anchors.bodyPart})`
    );
  }
  
  // Inject injury type if present
  if (anchors.injuryType && !result.toLowerCase().includes(anchors.injuryType)) {
    // Try to inject after "radiology" or "report"
    if (result.includes("radiology") || result.includes("report")) {
      result = result.replace(
        /(radiology|report)/i,
        `$1 (${anchors.injuryType})`
      );
    }
  }
  
  // Inject delay days if present
  if (anchors.delayDays) {
    result = result.replace(
      /(delay|delayed)/i,
      `$1 (${anchors.delayDays} days)`
    );
  }
  
  return result;
}

