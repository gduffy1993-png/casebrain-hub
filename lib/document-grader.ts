/**
 * Document Strength Grader
 * 
 * Scores documents based on:
 * - Coverage of key points
 * - Missing essentials
 * - Clarity of issues
 */

import type { Severity } from "./types/casebrain";

export type DocumentType = 
  | "LETTER_OF_CLAIM"
  | "SCHEDULE_OF_LOSS"
  | "WITNESS_STATEMENT"
  | "EXPERT_REPORT"
  | "PARTICULARS_OF_CLAIM"
  | "DEFENCE"
  | "REPLY"
  | "PRE_ACTION_LETTER"
  | "GENERAL";

export type GradeLevel = "A" | "B" | "C" | "D" | "F";

export type DocumentCriterion = {
  id: string;
  label: string;
  description: string;
  weight: number;
  isPassed: boolean;
  feedback?: string;
};

export type DocumentGrade = {
  documentId: string;
  documentName: string;
  documentType: DocumentType;
  overallGrade: GradeLevel;
  overallScore: number; // 0-100
  criteria: DocumentCriterion[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  gradedAt: string;
};

// Criteria templates by document type
const DOCUMENT_CRITERIA: Record<DocumentType, Array<Omit<DocumentCriterion, "isPassed" | "feedback">>> = {
  LETTER_OF_CLAIM: [
    { id: "liability", label: "Clear liability statement", description: "Sets out basis of claim clearly", weight: 20 },
    { id: "breach", label: "Identifies breach/negligence", description: "Specifies what duty was breached", weight: 15 },
    { id: "causation", label: "Causation explained", description: "Links breach to damage suffered", weight: 15 },
    { id: "losses", label: "Losses quantified", description: "Sets out financial losses claimed", weight: 15 },
    { id: "timeline", label: "Chronology included", description: "Key dates and events listed", weight: 10 },
    { id: "evidence", label: "Evidence referenced", description: "References supporting documents", weight: 10 },
    { id: "remedy", label: "Clear remedy sought", description: "States what is being claimed", weight: 10 },
    { id: "protocol", label: "Protocol compliance", description: "Meets pre-action protocol requirements", weight: 5 },
  ],
  SCHEDULE_OF_LOSS: [
    { id: "general_damages", label: "General damages", description: "Pain, suffering, loss of amenity", weight: 20 },
    { id: "special_damages", label: "Special damages itemized", description: "Past losses with evidence", weight: 25 },
    { id: "future_losses", label: "Future losses calculated", description: "Ongoing/future financial impact", weight: 20 },
    { id: "supporting_docs", label: "Evidence attached", description: "Receipts, invoices, payslips", weight: 15 },
    { id: "calculations", label: "Clear calculations", description: "Math is correct and explained", weight: 10 },
    { id: "formatting", label: "Professional format", description: "Well-organized and readable", weight: 10 },
  ],
  WITNESS_STATEMENT: [
    { id: "statement_of_truth", label: "Statement of truth", description: "Properly signed and dated", weight: 15 },
    { id: "first_person", label: "First person narrative", description: "Written in witness's own words", weight: 10 },
    { id: "chronological", label: "Chronological order", description: "Events in logical sequence", weight: 15 },
    { id: "specific_facts", label: "Specific facts", description: "Dates, times, names included", weight: 20 },
    { id: "relevant", label: "Relevance to issues", description: "Addresses key issues in dispute", weight: 20 },
    { id: "credibility", label: "Credibility markers", description: "Acknowledges gaps in knowledge", weight: 10 },
    { id: "exhibits", label: "Exhibits referenced", description: "Documents properly exhibited", weight: 10 },
  ],
  EXPERT_REPORT: [
    { id: "qualifications", label: "Expert qualifications", description: "CV and expertise stated", weight: 10 },
    { id: "instructions", label: "Instructions summarized", description: "What was asked of expert", weight: 10 },
    { id: "methodology", label: "Methodology explained", description: "How conclusions reached", weight: 15 },
    { id: "findings", label: "Clear findings", description: "Opinions clearly stated", weight: 25 },
    { id: "reasoning", label: "Reasoning explained", description: "Why expert reached conclusions", weight: 20 },
    { id: "cpr35", label: "CPR 35 compliant", description: "Duty to court acknowledged", weight: 10 },
    { id: "limitations", label: "Limitations stated", description: "Gaps/uncertainty acknowledged", weight: 10 },
  ],
  PARTICULARS_OF_CLAIM: [
    { id: "parties", label: "Parties identified", description: "Claimant and defendant named", weight: 10 },
    { id: "cause_of_action", label: "Cause of action stated", description: "Legal basis for claim", weight: 20 },
    { id: "material_facts", label: "Material facts pleaded", description: "All essential facts included", weight: 25 },
    { id: "breach", label: "Breach particularised", description: "Specific allegations made", weight: 15 },
    { id: "damage", label: "Damage pleaded", description: "Loss and damage described", weight: 15 },
    { id: "remedy", label: "Remedy claimed", description: "What claimant seeks", weight: 10 },
    { id: "interest", label: "Interest claimed", description: "Statutory interest pleaded", weight: 5 },
  ],
  DEFENCE: [
    { id: "admissions", label: "Admissions clear", description: "What is admitted/not admitted", weight: 20 },
    { id: "denials", label: "Denials reasoned", description: "Reasons for denials given", weight: 20 },
    { id: "version_of_events", label: "Alternative version", description: "Defendant's account of facts", weight: 20 },
    { id: "causation_dispute", label: "Causation challenged", description: "If disputing causation", weight: 15 },
    { id: "contributory", label: "Contributory negligence", description: "If alleging contrib neg", weight: 10 },
    { id: "quantum_dispute", label: "Quantum challenged", description: "If disputing damages", weight: 15 },
  ],
  REPLY: [
    { id: "responds", label: "Responds to defence", description: "Addresses defence points", weight: 30 },
    { id: "new_matters", label: "New matters only", description: "Only raises genuinely new points", weight: 25 },
    { id: "maintains", label: "Case maintained", description: "Claimant's position restated", weight: 25 },
    { id: "issues_joined", label: "Issues joined", description: "Disputes clearly identified", weight: 20 },
  ],
  PRE_ACTION_LETTER: [
    { id: "complaint", label: "Complaint clear", description: "What is being complained about", weight: 20 },
    { id: "remedy", label: "Remedy requested", description: "What is being sought", weight: 20 },
    { id: "deadline", label: "Response deadline", description: "Time for response stated", weight: 15 },
    { id: "consequences", label: "Consequences stated", description: "What will happen if ignored", weight: 15 },
    { id: "evidence_summary", label: "Evidence summarized", description: "Key supporting evidence", weight: 15 },
    { id: "contact", label: "Contact details", description: "How to respond", weight: 15 },
  ],
  GENERAL: [
    { id: "purpose", label: "Purpose clear", description: "Document purpose is obvious", weight: 25 },
    { id: "complete", label: "Information complete", description: "Contains all relevant info", weight: 25 },
    { id: "accurate", label: "Appears accurate", description: "No obvious errors", weight: 25 },
    { id: "formatted", label: "Well formatted", description: "Professional presentation", weight: 25 },
  ],
};

/**
 * Grade a document based on its content and type
 */
export function gradeDocument(params: {
  documentId: string;
  documentName: string;
  documentType: DocumentType;
  content: string;
  practiceArea?: string;
}): DocumentGrade {
  const { documentId, documentName, documentType, content } = params;
  const criteriaTemplate = DOCUMENT_CRITERIA[documentType] ?? DOCUMENT_CRITERIA.GENERAL;
  const contentLower = content.toLowerCase();

  // Evaluate each criterion (simple keyword-based for now)
  const criteria: DocumentCriterion[] = criteriaTemplate.map((criterion) => {
    const passed = evaluateCriterion(criterion, contentLower, documentType);
    return {
      ...criterion,
      isPassed: passed,
      feedback: passed 
        ? undefined 
        : `Consider adding: ${criterion.description}`,
    };
  });

  // Calculate overall score
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = criteria
    .filter(c => c.isPassed)
    .reduce((sum, c) => sum + c.weight, 0);
  const overallScore = Math.round((earnedWeight / totalWeight) * 100);

  // Determine grade
  const overallGrade = scoreToGrade(overallScore);

  // Generate strengths and weaknesses
  const strengths = criteria
    .filter(c => c.isPassed)
    .map(c => c.label);
  
  const weaknesses = criteria
    .filter(c => !c.isPassed)
    .map(c => c.label);

  // Generate suggestions
  const suggestions = criteria
    .filter(c => !c.isPassed && c.weight >= 15)
    .map(c => `Add ${c.label.toLowerCase()}: ${c.description}`);

  return {
    documentId,
    documentName,
    documentType,
    overallGrade,
    overallScore,
    criteria,
    strengths,
    weaknesses,
    suggestions,
    gradedAt: new Date().toISOString(),
  };
}

function evaluateCriterion(
  criterion: Omit<DocumentCriterion, "isPassed" | "feedback">,
  content: string,
  documentType: DocumentType,
): boolean {
  // Simple keyword-based evaluation (would use AI in production)
  const keywordMaps: Record<string, string[]> = {
    liability: ["liable", "liability", "responsible", "responsibility", "negligent", "negligence"],
    breach: ["breach", "breached", "failed to", "failure", "did not"],
    causation: ["caused", "result of", "consequence", "because", "as a result"],
    losses: ["loss", "damage", "£", "compensation", "expenses", "costs"],
    timeline: ["on", "dated", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
    evidence: ["evidence", "document", "exhibit", "attached", "enclosed"],
    remedy: ["seek", "claim", "request", "require", "compensation"],
    protocol: ["protocol", "pre-action", "pap", "respond within"],
    general_damages: ["pain", "suffering", "inconvenience", "distress", "psla"],
    special_damages: ["receipt", "invoice", "payslip", "expense"],
    statement_of_truth: ["statement of truth", "i believe", "signed"],
    first_person: ["i ", "my ", "me "],
    qualifications: ["qualified", "experience", "years", "expert in"],
    methodology: ["method", "approach", "examined", "inspected", "reviewed"],
    findings: ["find", "opinion", "conclude", "view", "assessment"],
    cpr35: ["duty to the court", "cpr 35", "overriding duty"],
  };

  const keywords = keywordMaps[criterion.id] ?? [criterion.id.replace(/_/g, " ")];
  return keywords.some(keyword => content.includes(keyword));
}

function scoreToGrade(score: number): GradeLevel {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

