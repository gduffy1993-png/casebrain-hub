/**
 * Move Sequencing Engine
 * 
 * Main orchestrator for the move sequencing intelligence system.
 * Coordinates anomaly detection, hypothesis generation, and move sequencing.
 */

import type { MoveSequence, MoveSequenceInput } from "./types";
import { detectAnomalies } from "./anomaly-detector";
import { generateInvestigationAngles } from "./hypothesis-generator";
import { generateMoves, sequenceMoves, addForkPoints, generateWarnings, calculateCostAnalysis } from "./move-sequencer";
import { getEvidenceMap } from "../evidence-maps";
import { extractCaseAnchors, injectAnchors } from "./case-anchors";
import type { CaseAnchors } from "./case-anchors";
import { generatePartnerVerdict } from "./partner-verdict";
import { generateWinConditions, generateKillConditions } from "./win-kill-conditions";
import { generatePressureTriggers } from "./pressure-triggers";
import { generateLetterTemplate } from "./letter-templates";
import { detectAwaabsLawTriggers } from "./awaabs-law-detector";

/**
 * Generate complete move sequence for a case
 */
export async function generateMoveSequence(
  input: MoveSequenceInput
): Promise<MoveSequence> {
  // Get evidence map for practice area
  const evidenceMap = getEvidenceMap(input.practiceArea);
  
  // Step 1: Extract case anchors (for CN case-specific output)
  const anchors = extractCaseAnchors(input);
  
  // Step 2: Detect anomalies ("what stood out")
  const observations = detectAnomalies(input, evidenceMap);
  
  // Inject anchors into observations (for CN)
  const observationsWithAnchors = observations.map(obs => ({
    ...obs,
    description: input.practiceArea === "clinical_negligence" ? injectAnchors(obs.description, anchors) : obs.description,
    whatShouldExist: input.practiceArea === "clinical_negligence" ? injectAnchors(obs.whatShouldExist, anchors) : obs.whatShouldExist,
  }));
  
  // Step 3: Generate investigation angles
  const investigationAngles = generateInvestigationAngles(observationsWithAnchors, evidenceMap, input.practiceArea === "clinical_negligence" ? anchors : undefined);
  
  // Step 4: Generate moves
  let moves = generateMoves(investigationAngles, input.practiceArea === "clinical_negligence" ? anchors : undefined, input.practiceArea, input, evidenceMap);
  
  // Step 5: Sequence moves by priority
  moves = sequenceMoves(moves);
  
  // Step 6: Add fork points
  moves = addForkPoints(moves);
  
  // Step 7: Generate warnings
  const warnings = generateWarnings(moves);
  
  // Step 8: Calculate cost analysis (upgraded)
  const costAnalysis = calculateCostAnalysis(moves);

  // Step 9: Generate partner verdict
  const partnerVerdict = generatePartnerVerdict(input, observationsWithAnchors, evidenceMap);

  // Step 10: Generate win/kill conditions
  const winConditions = generateWinConditions(input, observationsWithAnchors, evidenceMap);
  const killConditions = generateKillConditions(input, observationsWithAnchors, evidenceMap);

  // Step 11: Generate pressure triggers
  const pressureTriggers = generatePressureTriggers(input, observationsWithAnchors, evidenceMap);

  // Step 12: Generate Awaab's Law status (housing only)
  let awaabsLawStatus: any = undefined;
  if (input.practiceArea === "housing_disrepair") {
    const awaabsTrigger = detectAwaabsLawTriggers(input);
    if (awaabsTrigger.applies) {
      awaabsLawStatus = {
        applies: true,
        breachDetected: awaabsTrigger.investigationBreached || awaabsTrigger.workStartBreached,
        countdownStatus: awaabsTrigger.countdownStatus,
        recommendedMove: awaabsTrigger.recommendedMove,
        triggers: awaabsTrigger.triggers,
      };
    }
  }

  // Step 13: Add letter templates to moves
  const movesWithTemplates = moves.map((move, index) => {
    const correspondingAngle = investigationAngles[index];
    if (correspondingAngle) {
      const template = generateLetterTemplate(move, correspondingAngle, input, evidenceMap);
      return { ...move, letterTemplate: template || undefined };
    }
    return move;
  });
  
  return {
    partnerVerdict: partnerVerdict || undefined,
    winConditions,
    killConditions,
    pressureTriggers,
    awaabsLawStatus,
    observations: observationsWithAnchors,
    investigationAngles,
    moveSequence: movesWithTemplates,
    warnings,
    costAnalysis,
  };
}

