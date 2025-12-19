/**
 * Move Sequencer
 * 
 * Orders moves by cost/benefit, adds dependencies, and identifies fork points.
 */

import type { Move, InvestigationAngle, MovePhase } from "./types";
import type { Severity } from "@/lib/types/casebrain";
import type { CaseAnchors } from "./case-anchors";
import { injectAnchors } from "./case-anchors";
import { dedupeByKey } from "../deduplication";

/**
 * Generate moves from investigation angles
 */
export function generateMoves(
  angles: InvestigationAngle[], 
  anchors?: CaseAnchors, 
  practiceArea?: string,
  _input?: any,
  _evidenceMap?: any
): Move[] {
  const moves: Move[] = [];
  
  angles.forEach((angle, index) => {
    // Determine move phase based on angle
    // First moves are information extraction, later ones may be escalation
    const phase: MovePhase = index < 3 ? "INFORMATION_EXTRACTION" : 
                             index < 5 ? "COMMITMENT_FORCING" : 
                             "ESCALATION";
    
    // Calculate cost based on phase
    const cost = phase === "INFORMATION_EXTRACTION" ? 50 : 
                 phase === "COMMITMENT_FORCING" ? 500 : 
                 2000;
    
    // Calculate commitment level
    const commitmentLevel: "LOW" | "MEDIUM" | "HIGH" = 
      phase === "INFORMATION_EXTRACTION" ? "LOW" :
      phase === "COMMITMENT_FORCING" ? "MEDIUM" :
      "HIGH";
    
    // Information gain is HIGH for first moves, decreases
    const informationGain: Severity = index < 2 ? "HIGH" :
                                    index < 4 ? "MEDIUM" :
                                    "LOW";
    
    const requested = practiceArea === "clinical_negligence" && anchors
      ? injectAnchors(angle.targetedRequest, anchors)
      : angle.targetedRequest;

    const action =
      practiceArea === "criminal"
        ? phase === "INFORMATION_EXTRACTION"
          ? `Send CPIA disclosure request to CPS / disclosure officer: ${requested}`
          : phase === "COMMITMENT_FORCING"
            ? `Case management request / application (disclosure & directions): ${requested}`
            : `Trial prep / PTR escalation point: raise missing material and seek directions`
        : phase === "INFORMATION_EXTRACTION"
          ? `Send letter requesting: ${requested}`
          : phase === "COMMITMENT_FORCING"
            ? `Make targeted disclosure application for: ${requested}`
            : `Consider expert instruction or formal escalation`;

    moves.push({
      order: index + 1,
      phase,
      action,
      evidenceRequested: requested,
      questionItForces: angle.hypothesis,
      expectedOpponentResponse: angle.expectedResponse,
      whyNow: index === 0 
        ? (practiceArea === "criminal"
            ? "Earliest, lowest-cost lever is disclosure: pin down what exists, in what format, and when it will be served."
            : "Cheapest way to test core theory. If they can't produce, you've won without expert spend.")
        : index === 1
        ? (practiceArea === "criminal"
            ? "Do this only if the first disclosure response is late/partial/unclear. Forces clarity before PTR/trial prep."
            : "Only do this if Move 1 fails or produces suspicious results. Tests whether failure was systematic.")
        : index === 2
        ? (practiceArea === "criminal"
            ? "Targets procedural integrity (PACE/CPIA/continuity). These issues often decide whether the case is trial-ready."
            : "Tests governance and compliance. Low cost, high leverage if gaps confirmed.")
        : (practiceArea === "criminal"
            ? "Escalate at case management/PTR only after you’ve documented chases and pinned down what is missing."
            : "Forces formal position and creates paper trail. Only after cheap moves have extracted what they can."),
      whatYouLoseIfOutOfOrder: index === 0
        ? (practiceArea === "criminal"
            ? "If you skip disclosure-first, you risk committing to a case theory without the CPS bundle and get ambushed by late material."
            : "If you skip this and go straight to expert, you spend £2000+ without knowing if key evidence exists.")
        : index === 1
        ? (practiceArea === "criminal"
            ? "If you escalate before a clean chase trail, you risk looking premature and losing credibility with the bench."
            : "If you do this before Move 1, you give opponent time to sanitize records. Also reveals your theory early.")
        : "If you escalate before information extraction, you lose chance to get information cheaply and give opponent time to prepare.",
      cost,
      commitmentLevel,
      informationGain,
      dependencies: index === 0 ? [] : [index], // Each move depends on previous
    });
  });
  
  return moves;
}

/**
 * Sequence moves by priority
 */
export function sequenceMoves(moves: Move[]): Move[] {
  // Calculate priority score for each move
  const scoredMoves = moves.map(move => {
    const leverageOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const commitmentPenalty = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    
    const priority = (leverageOrder[move.informationGain] / (move.cost / 100)) * 
                     (move.phase === "INFORMATION_EXTRACTION" ? 2 : 1) -
                     commitmentPenalty[move.commitmentLevel];
    
    return { move, priority };
  });
  
  // Sort by priority (highest first)
  scoredMoves.sort((a, b) => b.priority - a.priority);
  
  // Re-assign order numbers
  const sequenced = scoredMoves.map((item, index) => ({
    ...item.move,
    order: index + 1,
    dependencies: item.move.dependencies.map(dep => {
      // Find new order number for dependency
      const depMove = scoredMoves.find(sm => sm.move.order === dep);
      return depMove ? scoredMoves.indexOf(depMove) + 1 : dep;
    }).filter(d => d < index + 1), // Only include dependencies that come before
  }));
  
  // Deduplicate moves by evidenceRequested (stable key)
  const deduplicated = dedupeByKey(sequenced, (move) => move.evidenceRequested);
  
  // Re-assign order numbers after deduplication
  return deduplicated.map((move, index) => ({
    ...move,
    order: index + 1,
  }));
}

/**
 * Add fork points to moves
 */
export function addForkPoints(moves: Move[]): Move[] {
  // Identify moves that can have multiple outcomes
  // Typically information extraction moves can lead to admit/deny/silence
  
  return moves.map((move, index) => {
    if (move.phase === "INFORMATION_EXTRACTION" && index < moves.length - 1) {
      // This move can lead to fork
      const nextMove = moves[index + 1];
      const forkAfter = moves.find(m => m.order === move.order + 2);
      
      return {
        ...move,
        forkPoint: {
          ifAdmit: nextMove ? nextMove.order : move.order + 1,
          ifDeny: forkAfter ? forkAfter.order : move.order + 2,
          ifSilence: nextMove ? nextMove.order : move.order + 1, // Silence treated like admit for sequencing
        },
      };
    }
    return move;
  });
}

/**
 * Generate warnings about out-of-order execution
 */
export function generateWarnings(moves: Move[]): string[] {
  const warnings: string[] = [];
  
  // Check if expert instruction comes before information extraction
  const expertMove = moves.find(m => m.phase === "EXPERT_SPEND" || m.cost > 1000);
  const infoMoves = moves.filter(m => m.phase === "INFORMATION_EXTRACTION");
  
  if (expertMove && infoMoves.length > 0) {
    const expertOrder = expertMove.order;
    const firstInfoOrder = Math.min(...infoMoves.map(m => m.order));
    
    if (expertOrder < firstInfoOrder) {
      warnings.push(`❌ Expert instruction (Move ${expertOrder}) comes before information extraction (Move ${firstInfoOrder}). You'd spend £${expertMove.cost}+ without knowing if key evidence exists. Do cheap information extraction first.`);
    }
  }
  
  // Check if escalation comes before information extraction
  const escalationMoves = moves.filter(m => m.phase === "ESCALATION");
  if (escalationMoves.length > 0 && infoMoves.length > 0) {
    const firstEscalation = Math.min(...escalationMoves.map(m => m.order));
    const firstInfo = Math.min(...infoMoves.map(m => m.order));
    
    if (firstEscalation < firstInfo) {
      warnings.push(`❌ Escalation (Move ${firstEscalation}) comes before information extraction (Move ${firstInfo}). You lose chance to get information cheaply and give opponent time to prepare.`);
    }
  }
  
  // Add move-specific warnings
  moves.forEach(move => {
    if (move.whatYouLoseIfOutOfOrder && move.order > 1) {
      // Only add if it's a meaningful warning
      if (move.whatYouLoseIfOutOfOrder.length > 50) {
        warnings.push(`⚠️ Move ${move.order}: ${move.whatYouLoseIfOutOfOrder}`);
      }
    }
  });
  
  return warnings;
}

/**
 * Calculate cost analysis (upgraded logic)
 */
export function calculateCostAnalysis(moves: Move[]): {
  costBeforeExpert: number;
  expertTriggeredOnlyIf: string;
  unnecessarySpendAvoidedIfGapConfirmed: number;
} {
  // Cost of all moves before expert instruction
  const infoExtractionMoves = moves.filter(m => m.phase === "INFORMATION_EXTRACTION");
  const commitmentMoves = moves.filter(m => m.phase === "COMMITMENT_FORCING");
  const escalationMoves = moves.filter(m => m.phase === "ESCALATION");
  
  const costBeforeExpert = [
    ...infoExtractionMoves,
    ...commitmentMoves,
    ...escalationMoves,
  ].reduce((sum, m) => sum + m.cost, 0);

  // Expert should only be triggered if gaps are confirmed
  const hasHighLeverageGaps = moves.some(m => 
    m.informationGain === "HIGH" || m.informationGain === "CRITICAL"
  );

  const expertTriggeredOnlyIf = hasHighLeverageGaps
    ? "Key evidence gaps are confirmed (evidence cannot be produced or is late-created)"
    : "All information extraction moves fail to resolve case theory";

  // Calculate savings: if gaps confirmed early, avoid expert spend
  const expertCost = 2000; // Standard expert instruction cost
  const unnecessarySpendAvoidedIfGapConfirmed = hasHighLeverageGaps
    ? Math.max(0, expertCost - costBeforeExpert)
    : 0; // If no high-leverage gaps, expert may still be needed

  return {
    costBeforeExpert,
    expertTriggeredOnlyIf,
    unnecessarySpendAvoidedIfGapConfirmed,
  };
}

