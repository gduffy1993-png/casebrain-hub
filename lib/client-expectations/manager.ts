/**
 * Client Expectation Manager
 * 
 * Generates proactive client updates and "What to Expect" timelines
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { PracticeArea } from "@/lib/types/casebrain";

export interface ClientTimelineStage {
  stage: string;
  stageNumber: number;
  totalStages: number;
  title: string;
  description: string;
  estimatedDuration: string;
  whatHappens: string[];
  whatYouNeedToDo: string[];
  typicalTimeline: string;
}

export interface ClientExpectationUpdate {
  caseId: string;
  caseTitle: string;
  currentStage: string;
  stageNumber: number;
  totalStages: number;
  progress: number; // percentage
  message: string;
  nextSteps: string[];
  estimatedCompletion: string;
  milestones: Array<{
    label: string;
    date: string | null;
    completed: boolean;
  }>;
}

/**
 * Generate "What to Expect" timeline for a case
 */
export async function generateClientTimeline(
  caseId: string,
  practiceArea: PracticeArea
): Promise<ClientTimelineStage[]> {
  const supabase = getSupabaseAdminClient();

  // Get case data
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, practice_area, created_at")
    .eq("id", caseId)
    .single();

  if (!caseData) return [];

  // Practice-area specific stages
  const stages: ClientTimelineStage[] = [];

  switch (practiceArea) {
    case "personal_injury":
      stages.push(
        {
          stage: "intake",
          stageNumber: 1,
          totalStages: 7,
          title: "Initial Assessment",
          description: "We review your case and gather initial information",
          estimatedDuration: "1-2 weeks",
          whatHappens: [
            "We review your medical records and accident details",
            "We assess liability and quantum",
            "We send initial correspondence to the opponent"
          ],
          whatYouNeedToDo: [
            "Provide all medical records",
            "Complete our intake questionnaire",
            "Keep us updated on any new developments"
          ],
          typicalTimeline: "Usually completed within 2 weeks"
        },
        {
          stage: "pre_action",
          stageNumber: 2,
          totalStages: 7,
          title: "Pre-Action Protocol",
          description: "We follow the pre-action protocol before issuing proceedings",
          estimatedDuration: "2-4 months",
          whatHappens: [
            "We send a Letter Before Action",
            "We request disclosure from the opponent",
            "We negotiate settlement if possible"
          ],
          whatYouNeedToDo: [
            "Attend medical examinations if required",
            "Respond to any questions we have",
            "Keep us informed of any changes"
          ],
          typicalTimeline: "Usually takes 2-4 months, but can be longer"
        },
        {
          stage: "litigation",
          stageNumber: 3,
          totalStages: 7,
          title: "Court Proceedings",
          description: "If settlement isn't reached, we issue court proceedings",
          estimatedDuration: "6-12 months",
          whatHappens: [
            "We issue a Claim Form at court",
            "The opponent files a Defence",
            "We exchange disclosure and witness statements",
            "We prepare for trial"
          ],
          whatYouNeedToDo: [
            "Review and approve court documents",
            "Attend any hearings if required",
            "Keep us updated on your condition"
          ],
          typicalTimeline: "Usually takes 6-12 months to reach trial"
        },
        {
          stage: "trial",
          stageNumber: 4,
          totalStages: 7,
          title: "Trial",
          description: "Your case goes to trial if not settled",
          estimatedDuration: "1-5 days",
          whatHappens: [
            "You give evidence in court",
            "The judge makes a decision",
            "Costs are determined"
          ],
          whatYouNeedToDo: [
            "Attend court on the trial date",
            "Give your evidence truthfully",
            "Follow our guidance on court procedure"
          ],
          typicalTimeline: "Trial usually lasts 1-5 days depending on complexity"
        },
        {
          stage: "judgment",
          stageNumber: 5,
          totalStages: 7,
          title: "Judgment",
          description: "The court delivers its judgment",
          estimatedDuration: "2-4 weeks",
          whatHappens: [
            "The judge delivers judgment",
            "We calculate the final award",
            "We deal with costs"
          ],
          whatYouNeedToDo: [
            "Wait for the judgment",
            "Review the outcome with us",
            "Decide on any appeals if necessary"
          ],
          typicalTimeline: "Judgment usually delivered within 2-4 weeks of trial"
        },
        {
          stage: "enforcement",
          stageNumber: 6,
          totalStages: 7,
          title: "Enforcement (if needed)",
          description: "If the opponent doesn't pay, we enforce the judgment",
          estimatedDuration: "1-3 months",
          whatHappens: [
            "We request payment from the opponent",
            "If they don't pay, we take enforcement action",
            "We recover your damages and costs"
          ],
          whatYouNeedToDo: [
            "Be patient - enforcement can take time",
            "Keep us updated on any contact from the opponent"
          ],
          typicalTimeline: "Usually takes 1-3 months to recover payment"
        },
        {
          stage: "closed",
          stageNumber: 7,
          totalStages: 7,
          title: "Case Closed",
          description: "Your case is complete",
          estimatedDuration: "N/A",
          whatHappens: [
            "All payments are received",
            "Final accounts are settled",
            "Case file is closed"
          ],
          whatYouNeedToDo: [
            "Review final settlement statement",
            "Keep your case documents safe"
          ],
          typicalTimeline: "Case is now complete"
        }
      );
      break;

    case "housing_disrepair":
      stages.push(
        {
          stage: "intake",
          stageNumber: 1,
          totalStages: 6,
          title: "Initial Assessment",
          description: "We assess your disrepair claim",
          estimatedDuration: "1-2 weeks",
          whatHappens: [
            "We review your property condition",
            "We assess Awaab's Law compliance",
            "We gather evidence of disrepair"
          ],
          whatYouNeedToDo: [
            "Provide photos and evidence",
            "Complete our intake form",
            "Allow access for inspections if needed"
          ],
          typicalTimeline: "Usually completed within 2 weeks"
        },
        {
          stage: "investigation",
          stageNumber: 2,
          totalStages: 6,
          title: "Awaab's Law Investigation",
          description: "Landlord must investigate within 14 days",
          estimatedDuration: "14 days",
          whatHappens: [
            "Landlord must investigate within 14 days",
            "We monitor their response",
            "We prepare pre-action letter if needed"
          ],
          whatYouNeedToDo: [
            "Allow access for landlord's inspection",
            "Keep us updated on any contact",
            "Document any new issues"
          ],
          typicalTimeline: "Landlord has 14 days to investigate"
        },
        {
          stage: "pre_action",
          stageNumber: 3,
          totalStages: 6,
          title: "Pre-Action Protocol",
          description: "We follow pre-action protocol before court",
          estimatedDuration: "2-3 months",
          whatHappens: [
            "We send pre-action protocol letter",
            "We request repairs and compensation",
            "We negotiate with the landlord"
          ],
          whatYouNeedToDo: [
            "Allow access for repairs if agreed",
            "Keep us updated on repair progress",
            "Document any ongoing issues"
          ],
          typicalTimeline: "Usually takes 2-3 months"
        },
        {
          stage: "litigation",
          stageNumber: 4,
          totalStages: 6,
          title: "Court Proceedings",
          description: "We issue court proceedings if needed",
          estimatedDuration: "6-12 months",
          whatHappens: [
            "We issue a Claim Form",
            "Landlord files Defence",
            "We exchange evidence and expert reports",
            "We prepare for trial"
          ],
          whatYouNeedToDo: [
            "Attend any hearings",
            "Allow access for expert inspections",
            "Keep us updated on property condition"
          ],
          typicalTimeline: "Usually takes 6-12 months to trial"
        },
        {
          stage: "settlement_or_trial",
          stageNumber: 5,
          totalStages: 6,
          title: "Settlement or Trial",
          description: "Case settles or goes to trial",
          estimatedDuration: "1-5 days (trial) or ongoing (settlement)",
          whatHappens: [
            "We negotiate final settlement",
            "Or case goes to trial",
            "Repairs are completed and compensation paid"
          ],
          whatYouNeedToDo: [
            "Attend trial if necessary",
            "Review settlement offers with us",
            "Ensure repairs are completed properly"
          ],
          typicalTimeline: "Settlement can happen at any stage, trial usually 1-5 days"
        },
        {
          stage: "closed",
          stageNumber: 6,
          totalStages: 6,
          title: "Case Closed",
          description: "Repairs completed and compensation received",
          estimatedDuration: "N/A",
          whatHappens: [
            "All repairs are completed",
            "Compensation is paid",
            "Case file is closed"
          ],
          whatYouNeedToDo: [
            "Confirm repairs are satisfactory",
            "Review final settlement",
            "Keep documents safe"
          ],
          typicalTimeline: "Case is now complete"
        }
      );
      break;

    default:
      // Generic stages for other practice areas
      stages.push(
        {
          stage: "intake",
          stageNumber: 1,
          totalStages: 5,
          title: "Initial Assessment",
          description: "We review your case",
          estimatedDuration: "1-2 weeks",
          whatHappens: ["We review your case", "We assess the issues", "We provide initial advice"],
          whatYouNeedToDo: ["Provide all relevant documents", "Complete our intake form"],
          typicalTimeline: "Usually completed within 2 weeks"
        },
        {
          stage: "pre_action",
          stageNumber: 2,
          totalStages: 5,
          title: "Pre-Action",
          description: "We follow pre-action protocol",
          estimatedDuration: "2-4 months",
          whatHappens: ["We send pre-action letters", "We negotiate with opponent"],
          whatYouNeedToDo: ["Respond to any questions", "Keep us updated"],
          typicalTimeline: "Usually takes 2-4 months"
        },
        {
          stage: "litigation",
          stageNumber: 3,
          totalStages: 5,
          title: "Court Proceedings",
          description: "We issue court proceedings if needed",
          estimatedDuration: "6-12 months",
          whatHappens: ["We issue proceedings", "We exchange evidence", "We prepare for trial"],
          whatYouNeedToDo: ["Attend hearings", "Review documents"],
          typicalTimeline: "Usually takes 6-12 months"
        },
        {
          stage: "resolution",
          stageNumber: 4,
          totalStages: 5,
          title: "Resolution",
          description: "Case settles or goes to trial",
          estimatedDuration: "Varies",
          whatHappens: ["Case settles or goes to trial", "Final outcome determined"],
          whatYouNeedToDo: ["Attend trial if necessary", "Review outcomes"],
          typicalTimeline: "Varies by case"
        },
        {
          stage: "closed",
          stageNumber: 5,
          totalStages: 5,
          title: "Case Closed",
          description: "Case is complete",
          estimatedDuration: "N/A",
          whatHappens: ["All matters resolved", "Case file closed"],
          whatYouNeedToDo: ["Review final outcome", "Keep documents"],
          typicalTimeline: "Case is now complete"
        }
      );
  }

  return stages;
}

/**
 * Generate proactive client update
 */
export async function generateClientUpdate(
  caseId: string
): Promise<ClientExpectationUpdate | null> {
  const supabase = getSupabaseAdminClient();

  // Get case data
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, practice_area, created_at")
    .eq("id", caseId)
    .single();

  if (!caseData) return null;

  // Get case stage (simplified - would need case-specific data)
  let currentStage = "intake";
  let stageNumber = 1;

  if (caseData.practice_area === "personal_injury") {
    const { data: piCase } = await supabase
      .from("pi_cases")
      .select("stage")
      .eq("id", caseId)
      .single();

    if (piCase?.stage) {
      currentStage = piCase.stage;
    }
  } else if (caseData.practice_area === "housing_disrepair") {
    const { data: housingCase } = await supabase
      .from("housing_cases")
      .select("stage")
      .eq("id", caseId)
      .single();

    if (housingCase?.stage) {
      currentStage = housingCase.stage;
    }
  }

  // Get timeline stages
  const timeline = await generateClientTimeline(caseId, caseData.practice_area as PracticeArea);
  const currentStageData = timeline.find(s => s.stage === currentStage);
  const totalStages = timeline.length;
  stageNumber = currentStageData?.stageNumber || 1;
  const progress = (stageNumber / totalStages) * 100;

  // Generate message
  const caseAge = Math.floor((Date.now() - new Date(caseData.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const message = `Your case is at Stage ${stageNumber} of ${totalStages}: ${currentStageData?.title || currentStage}. ${currentStageData?.description || ""} Based on similar cases, this typically takes ${currentStageData?.estimatedDuration || "varies"}.`;

  // Get milestones
  const milestones = timeline.map(stage => ({
    label: stage.title,
    date: stage.stage === currentStage ? new Date().toISOString().split("T")[0] : null,
    completed: (stage.stageNumber || 0) < stageNumber,
  }));

  return {
    caseId,
    caseTitle: caseData.title,
    currentStage,
    stageNumber,
    totalStages,
    progress: Math.round(progress),
    message,
    nextSteps: currentStageData?.whatYouNeedToDo || [],
    estimatedCompletion: "Varies by case complexity",
    milestones,
  };
}

