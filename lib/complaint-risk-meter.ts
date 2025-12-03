/**
 * Complaint Risk Meter
 * 
 * Calculates a complaint risk score for a case based on multiple factors:
 * - Communication patterns
 * - Deadline compliance
 * - Evidence gaps
 * - Risk flags
 * - Opponent behaviour
 * - Task completion
 */

import { getSupabaseAdminClient } from "./supabase";
import { buildCorrespondenceTimeline } from "./correspondence";
import { buildOpponentActivitySnapshot } from "./opponent-radar";
import { findMissingEvidence } from "./missing-evidence";
import { findContradictions, getBundleStatus } from "./bundle-navigator";
import type {
  ComplaintRiskScore,
  ComplaintRiskLevel,
  ComplaintRiskFactor,
} from "./types/casebrain";

// Weight factors for risk calculation
const WEIGHTS = {
  noClientUpdate: 15,
  noOpponentChase: 10,
  breachedDeadline: 20,
  missingEvidence: 10,
  missingSignature: 15,
  longSilence: 12,
  overdueTask: 15,
  highRiskFlag: 18,
  opponentAnomaly: 8,
  contradiction: 5,
};

/**
 * Calculate complaint risk score for a case
 */
export async function calculateComplaintRisk(
  caseId: string,
  orgId: string,
): Promise<ComplaintRiskScore> {
  const supabase = getSupabaseAdminClient();
  const factors: ComplaintRiskFactor[] = [];
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let riskScore = 0;

  // 1. Check correspondence timeline
  try {
    const correspondence = await buildCorrespondenceTimeline(caseId, orgId);
    
    // Check for long gaps in client communication
    const clientItems = correspondence.items.filter(i => i.party === "client");
    if (clientItems.length > 0) {
      const lastClientContact = new Date(clientItems[clientItems.length - 1].createdAt);
      const daysSinceClient = Math.floor(
        (Date.now() - lastClientContact.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceClient > 28) {
        riskScore += WEIGHTS.noClientUpdate;
        factors.push({
          factor: "No client update",
          impact: "negative",
          weight: WEIGHTS.noClientUpdate,
          description: `${daysSinceClient} days since last client contact`,
        });
        reasons.push(`No client contact for ${daysSinceClient} days`);
        suggestions.push("Send a client update letter or make a courtesy call");
      }
    } else {
      riskScore += WEIGHTS.noClientUpdate;
      factors.push({
        factor: "No client communication recorded",
        impact: "negative",
        weight: WEIGHTS.noClientUpdate,
        description: "No client correspondence found in case records",
      });
      reasons.push("No client correspondence recorded");
    }

    // Check for long gaps in opponent chasing
    const opponentOutbound = correspondence.items.filter(
      i => i.party === "opponent" && i.direction === "outbound"
    );
    if (opponentOutbound.length > 0) {
      const lastChase = new Date(opponentOutbound[opponentOutbound.length - 1].createdAt);
      const daysSinceChase = Math.floor(
        (Date.now() - lastChase.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceChase > 21) {
        riskScore += WEIGHTS.noOpponentChase;
        factors.push({
          factor: "No recent chase to opponent",
          impact: "negative",
          weight: WEIGHTS.noOpponentChase,
          description: `${daysSinceChase} days since last opponent contact`,
        });
        reasons.push(`Opponent not chased for ${daysSinceChase} days`);
        suggestions.push("Send a chaser letter to opponent");
      }
    }

    // Check for communication gaps
    if (correspondence.longGaps.length > 2) {
      riskScore += WEIGHTS.longSilence;
      factors.push({
        factor: "Multiple communication gaps",
        impact: "negative",
        weight: WEIGHTS.longSilence,
        description: `${correspondence.longGaps.length} periods of 14+ days silence`,
      });
      reasons.push("Multiple gaps of 14+ days in correspondence");
    }
  } catch (error) {
    // Continue if correspondence check fails
  }

  // 2. Check tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, is_complete, due_at")
    .eq("case_id", caseId)
    .eq("is_complete", false);

  if (tasks) {
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.due_at && new Date(t.due_at) < now);
    
    if (overdueTasks.length > 0) {
      const impact = Math.min(overdueTasks.length * WEIGHTS.overdueTask, 45); // Cap at 45
      riskScore += impact;
      factors.push({
        factor: "Overdue tasks",
        impact: "negative",
        weight: impact,
        description: `${overdueTasks.length} task(s) past due date`,
      });
      reasons.push(`${overdueTasks.length} overdue task(s)`);
      suggestions.push("Complete or reschedule overdue tasks");
    }
  }

  // 3. Check risk flags
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("id, flag_type, severity, resolved")
    .eq("case_id", caseId)
    .eq("resolved", false);

  if (riskFlags) {
    const criticalFlags = riskFlags.filter(f => f.severity === "critical");
    const highFlags = riskFlags.filter(f => f.severity === "high");
    
    if (criticalFlags.length > 0) {
      riskScore += WEIGHTS.highRiskFlag * 1.5;
      factors.push({
        factor: "Critical risk flags",
        impact: "negative",
        weight: WEIGHTS.highRiskFlag * 1.5,
        description: `${criticalFlags.length} critical risk flag(s) unresolved`,
      });
      reasons.push(`${criticalFlags.length} critical risk flag(s) outstanding`);
      suggestions.push("Address critical risk flags immediately");
    }
    
    if (highFlags.length > 0) {
      riskScore += WEIGHTS.highRiskFlag;
      factors.push({
        factor: "High risk flags",
        impact: "negative",
        weight: WEIGHTS.highRiskFlag,
        description: `${highFlags.length} high-priority risk flag(s)`,
      });
      reasons.push(`${highFlags.length} high risk flag(s) unresolved`);
    }
  }

  // 4. Check deadlines
  const { data: deadlines } = await supabase
    .from("deadlines")
    .select("id, title, due_date, status")
    .eq("case_id", caseId);

  if (deadlines) {
    const now = new Date();
    const breached = deadlines.filter(d => 
      d.status !== "completed" && 
      new Date(d.due_date) < now
    );
    
    if (breached.length > 0) {
      riskScore += WEIGHTS.breachedDeadline;
      factors.push({
        factor: "Breached deadlines",
        impact: "negative",
        weight: WEIGHTS.breachedDeadline,
        description: `${breached.length} deadline(s) missed`,
      });
      reasons.push(`${breached.length} deadline(s) breached`);
      suggestions.push("Review missed deadlines and take remedial action");
    }
  }

  // 5. Check missing evidence
  const missingEvidence = findMissingEvidence(caseId, "pi", []);
  const criticalMissing = missingEvidence.filter(e => 
    e.status === "MISSING" && e.priority === "HIGH"
  );
  
  if (criticalMissing.length > 0) {
    riskScore += WEIGHTS.missingEvidence;
    factors.push({
      factor: "Missing evidence",
      impact: "negative",
      weight: WEIGHTS.missingEvidence,
      description: `${criticalMissing.length} high-priority evidence item(s) missing`,
    });
    reasons.push(`${criticalMissing.length} critical evidence item(s) not obtained`);
    suggestions.push("Request missing evidence");
  }

  // 6. Check opponent behaviour
  try {
    const opponent = await buildOpponentActivitySnapshot(caseId, orgId);
    
    if (opponent.currentSilenceDays > 42) {
      riskScore += WEIGHTS.opponentAnomaly;
      factors.push({
        factor: "Extended opponent silence",
        impact: "negative",
        weight: WEIGHTS.opponentAnomaly,
        description: `${opponent.currentSilenceDays} days without opponent response`,
      });
      reasons.push("Opponent unresponsive for extended period");
      suggestions.push("Consider escalation or formal chase");
    }
  } catch {
    // Continue if opponent check fails
  }

  // 7. Check for contradictions
  try {
    const bundle = await getBundleStatus(caseId, orgId);
    if (bundle && bundle.status === "completed") {
      const contradictions = await findContradictions(bundle.id);
      if (contradictions.length > 2) {
        riskScore += WEIGHTS.contradiction;
        factors.push({
          factor: "Evidence contradictions",
          impact: "negative",
          weight: WEIGHTS.contradiction,
          description: `${contradictions.length} contradictions in bundle`,
        });
        reasons.push("Multiple contradictions in evidence");
      }
    }
  } catch {
    // Continue if bundle check fails
  }

  // 8. Check case notes recency
  const { data: recentNotes } = await supabase
    .from("case_notes")
    .select("created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recentNotes && recentNotes.length > 0) {
    const lastNote = new Date(recentNotes[0].created_at);
    const daysSinceNote = Math.floor(
      (Date.now() - lastNote.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceNote > 30) {
      riskScore += 8;
      factors.push({
        factor: "Stale case notes",
        impact: "negative",
        weight: 8,
        description: `No case notes for ${daysSinceNote} days`,
      });
      reasons.push(`No attendance notes for ${daysSinceNote} days`);
      suggestions.push("Add a case note documenting current status");
    }
  }

  // Add positive factors to reduce score
  if (factors.length === 0) {
    factors.push({
      factor: "Good case management",
      impact: "positive",
      weight: 0,
      description: "No significant risk factors detected",
    });
    suggestions.push("Continue regular case management");
  }

  // Cap score at 100
  riskScore = Math.min(riskScore, 100);

  // Determine level
  let level: ComplaintRiskLevel;
  if (riskScore >= 70) level = "critical";
  else if (riskScore >= 50) level = "high";
  else if (riskScore >= 25) level = "medium";
  else level = "low";

  return {
    caseId,
    score: Math.round(riskScore),
    level,
    factors,
    reasons,
    suggestions,
    calculatedAt: new Date().toISOString(),
  };
}

