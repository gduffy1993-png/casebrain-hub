/**
 * Letter Template Generator
 * 
 * Generates copy-paste ready solicitor letters for each move.
 * Neutral, targeted, "If X was done, Y should exist" framing.
 */

import type { LetterTemplate, Move, InvestigationAngle } from "./types";
import type { MoveSequenceInput } from "./types";
import type { EvidenceMap } from "../evidence-maps/types";

/**
 * Determine recipient based on practice area and evidence type
 */
function determineRecipient(
  practiceArea: string,
  evidenceType: string
): string {
  if (practiceArea === "clinical_negligence") {
    if (evidenceType.toLowerCase().includes("radiology")) {
      return "Radiology Department / Trust Legal";
    }
    if (evidenceType.toLowerCase().includes("escalation") || evidenceType.toLowerCase().includes("incident")) {
      return "Trust Legal / Clinical Governance";
    }
    return "Trust Legal Department";
  }

  if (practiceArea === "housing_disrepair") {
    return "Landlord / Housing Association Legal";
  }

  if (practiceArea === "personal_injury") {
    return "Defendant's Insurers / Solicitors";
  }

  if (practiceArea === "criminal") {
    return "CPS / Disclosure Officer";
  }

  if (practiceArea === "family") {
    return "Local Authority Legal / Social Services";
  }

  return "Opponent's Solicitors";
}

/**
 * Generate subject line
 */
function generateSubjectLine(
  evidenceType: string,
  practiceArea: string
): string {
  const cleanType = evidenceType.replace("Missing expected evidence: ", "").replace("Request ", "");
  
  if (practiceArea === "clinical_negligence") {
    return `Request for Medical Records: ${cleanType}`;
  }

  if (practiceArea === "housing_disrepair") {
    return `Request for Property Records: ${cleanType}`;
  }

  if (practiceArea === "personal_injury") {
    return `Pre-Action Disclosure: ${cleanType}`;
  }

  if (practiceArea === "criminal") {
    return `Disclosure Request: ${cleanType}`;
  }

  return `Request for Documentation: ${cleanType}`;
}

/**
 * Generate letter body
 */
function generateLetterBody(
  move: Move,
  angle: InvestigationAngle,
  practiceArea: string,
  evidenceMap: EvidenceMap
): string {
  const matchingEvidence = evidenceMap.expectedEvidence.find(
    ev => angle.targetedRequest.toLowerCase().includes(ev.label.toLowerCase())
  );

  const evidenceLabel = matchingEvidence?.label || angle.targetedRequest.replace("Request ", "");

  // Base template - neutral, "If X then Y" framing
  let body = `Dear Sir/Madam,\n\n`;
  body += `We act for [CLIENT NAME] in relation to [CASE REFERENCE].\n\n`;

  // Practice area specific opening
  if (practiceArea === "clinical_negligence") {
    body += `In accordance with the Pre-Action Protocol for the Resolution of Clinical Disputes, we require the following documentation to assess the merits of this matter:\n\n`;
  } else if (practiceArea === "housing_disrepair") {
    body += `Pursuant to our client's claim for disrepair, we require the following documentation:\n\n`;
  } else if (practiceArea === "personal_injury") {
    body += `In accordance with the Pre-Action Protocol for Personal Injury Claims, we require the following documentation:\n\n`;
  } else {
    body += `We require the following documentation to progress this matter:\n\n`;
  }

  // Specific request - "If X was done, Y should exist"
  body += `${evidenceLabel}\n\n`;

  if (matchingEvidence?.whenExpected) {
    body += `If ${matchingEvidence.whenExpected.toLowerCase()}, then this documentation should exist. `;
  }

  body += `Please provide:\n\n`;
  body += `1. All ${evidenceLabel.toLowerCase()} for the relevant period;\n`;
  body += `2. Any related correspondence, notes, or communications;\n`;
  body += `3. Confirmation of the date each document was created.\n\n`;

  // Closing
  body += `We look forward to receiving this documentation within 14 days. If you are unable to provide any of the above, please explain the reason for its absence.\n\n`;
  body += `Yours faithfully,\n\n[SOLICITOR NAME]`;

  return body;
}

/**
 * Generate letter template for a move
 */
export function generateLetterTemplate(
  move: Move,
  angle: InvestigationAngle,
  input: MoveSequenceInput,
  evidenceMap: EvidenceMap
): LetterTemplate | null {
  // Only generate for information extraction and commitment forcing moves
  if (move.phase === "EXPERT_SPEND" || move.phase === "ESCALATION") {
    return null;
  }

  const recipient = determineRecipient(input.practiceArea, angle.targetedRequest);
  const subjectLine = generateSubjectLine(angle.targetedRequest, input.practiceArea);
  const body = generateLetterBody(move, angle, input.practiceArea, evidenceMap);

  return {
    recipient,
    subjectLine,
    body,
  };
}

