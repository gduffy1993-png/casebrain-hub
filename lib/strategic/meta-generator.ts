/**
 * Strategic Insight Meta Generator
 * 
 * Generates explanatory metadata for strategic insights based on case data
 */

import type { PracticeArea } from "../types/casebrain";
import type { StrategicInsightMeta } from "./types";

type MetaGeneratorInput = {
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
  hasChronology: boolean;
  hasMedicalEvidence: boolean;
  hasExpertReports: boolean;
  hasDisclosure: boolean;
  hasPreActionLetter: boolean;
  missingEvidence?: Array<{ type: string; priority: string }>;
  contradictions?: Array<{ description: string; confidence: string }>;
  vulnerabilities?: Array<{ type: string; description: string }>;
  nextHearingDate?: string;
};

/**
 * Generate meta for a procedural leverage point
 */
export function generateLeverageMeta(
  leverageType: string,
  description: string,
  evidence: string[],
  input: MetaGeneratorInput
): StrategicInsightMeta {
  const practiceArea = input.practiceArea;
  const isHousing = practiceArea === "housing_disrepair";
  const isPI = practiceArea === "personal_injury" || practiceArea === "clinical_negligence";
  const isCriminal = practiceArea === "criminal";

  let whyRecommended = "";
  let triggeredBy: string[] = [];
  let alternatives: Array<{ label: string; description: string; unlockedBy?: string[] }> = [];
  let riskIfIgnored = "";
  let bestStageToUse = "";
  let howThisHelpsYouWin = "";

  // Determine triggeredBy from evidence and documents
  triggeredBy = [...evidence];
  
  if (leverageType === "LATE_RESPONSE") {
    const lastLetter = input.letters[input.letters.length - 1];
    if (lastLetter) {
      triggeredBy.push(`Last letter sent: ${new Date(lastLetter.created_at).toLocaleDateString()}`);
    }
    triggeredBy.push("No response received within reasonable time");
    
    whyRecommended = `The opponent has failed to respond within a reasonable timeframe. This procedural failure gives you a clear advantage — the court expects timely responses and will view delays unfavorably.`;
    
    alternatives = [
      {
        label: "Settlement-focused route",
        description: "If the opponent responds promptly, focus shifts to substantive settlement negotiations rather than procedural pressure.",
        unlockedBy: ["Opponent response letter", "Settlement proposal"]
      },
      {
        label: "Mediation route",
        description: "If both parties are responsive, mediation becomes a viable alternative to procedural applications.",
        unlockedBy: ["Opponent response", "Mediation agreement"]
      }
    ];
    
    riskIfIgnored = "You lose a major leverage point. The opponent may continue to delay, and you miss the opportunity to apply for costs or enforcement. The court may see your inaction as acceptance of their delay.";
    
    bestStageToUse = isCriminal ? "At next hearing" : "CCMC / case management";
    
    howThisHelpsYouWin = isCriminal
      ? "Gives you grounds to request costs at the next hearing and demonstrates the opponent's non-compliance to the court."
      : "Gives you grounds to apply for costs, unless orders, or strike-out. This procedural advantage can force settlement or result in favorable court orders.";
  } else if (leverageType === "MISSING_PRE_ACTION") {
    triggeredBy.push("Pre-action protocol letter not found");
    if (isHousing) {
      triggeredBy.push("Awaab's Law compliance check");
    }
    
    whyRecommended = isHousing
      ? `The opponent has failed to comply with pre-action protocol requirements. In housing disrepair cases, this is particularly significant as it may indicate broader non-compliance with Awaab's Law and housing standards.`
      : `The opponent has failed to comply with pre-action protocol requirements. This is a fundamental procedural failure that the court takes seriously — non-compliance can result in costs sanctions and may affect the opponent's credibility.`;
    
    alternatives = [
      {
        label: "Protocol-compliant route",
        description: "If the opponent sends a compliant pre-action response, the case proceeds through standard protocol stages.",
        unlockedBy: ["Pre-action protocol response", "Compliant disclosure"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to highlight the opponent's procedural failures. The court may not be aware of their non-compliance, and you miss a chance to seek costs sanctions or procedural advantages.";
    
    bestStageToUse = "Early PAP stage";
    
    howThisHelpsYouWin = isHousing
      ? "Demonstrates systematic non-compliance with housing law requirements. This strengthens your case on liability and quantum, and may support aggravated damages claims."
      : "Gives you grounds to seek costs sanctions and demonstrates the opponent's non-compliance. This can affect the court's view of their case and create settlement pressure.";
  } else if (leverageType === "DISCLOSURE_FAILURE") {
    triggeredBy.push("Disclosure list not provided");
    triggeredBy.push("CPR 31.10 requirements not met");
    
    whyRecommended = `The opponent has failed to provide proper disclosure as required under CPR 31.10. This is a serious procedural failure that can significantly weaken their case and give you tactical advantages.`;
    
    alternatives = [
      {
        label: "Full disclosure route",
        description: "If the opponent provides comprehensive disclosure, focus shifts to analyzing the disclosed documents for substantive weaknesses.",
        unlockedBy: ["Complete disclosure list", "All relevant documents provided"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to challenge their disclosure failures. The court may not be aware of their non-compliance, and you miss a chance to seek disclosure orders or costs.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Gives you grounds to apply for specific disclosure orders, challenge their case on the basis of incomplete evidence, and seek costs. This can force them to disclose damaging documents or face sanctions.";
  } else {
    // Generic leverage point
    whyRecommended = `This procedural leverage point was identified based on the opponent's actions (or lack thereof) in your case. It represents a legitimate opportunity to apply pressure and seek favorable court orders.`;
    
    triggeredBy = evidence.length > 0 ? evidence : ["Case documents", "Timeline analysis"];
    
    alternatives = [
      {
        label: "Standard litigation route",
        description: "If the procedural issue is resolved, the case proceeds through standard litigation stages.",
        unlockedBy: ["Opponent compliance", "Issue resolution"]
      }
    ];
    
    riskIfIgnored = "You lose a tactical advantage. The opponent may continue their non-compliance, and you miss an opportunity to strengthen your position.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Gives you grounds to seek court orders, costs, or other procedural advantages. This can create settlement pressure or result in favorable outcomes.";
  }

  return {
    whyRecommended,
    triggeredBy,
    alternatives,
    riskIfIgnored,
    bestStageToUse,
    howThisHelpsYouWin,
  };
}

/**
 * Generate meta for a weak spot
 */
export function generateWeakSpotMeta(
  weakSpotType: string,
  description: string,
  evidence: string[],
  input: MetaGeneratorInput
): StrategicInsightMeta {
  const practiceArea = input.practiceArea;
  const isPI = practiceArea === "personal_injury" || practiceArea === "clinical_negligence";
  const isHousing = practiceArea === "housing_disrepair";

  let whyRecommended = "";
  let triggeredBy: string[] = [...evidence];
  let alternatives: Array<{ label: string; description: string; unlockedBy?: string[] }> = [];
  let riskIfIgnored = "";
  let bestStageToUse = "";
  let howThisHelpsYouWin = "";

  if (weakSpotType === "CONTRADICTION") {
    const contradictions = input.contradictions || [];
    triggeredBy.push(...contradictions.map(c => `Contradiction: ${c.description}`));
    
    whyRecommended = `The opponent's evidence contains clear contradictions. These inconsistencies undermine their credibility and provide you with powerful ammunition for cross-examination or challenging their case.`;
    
    alternatives = [
      {
        label: "Consistent evidence route",
        description: "If the opponent's evidence is consistent, focus shifts to challenging substantive legal or factual arguments rather than credibility.",
        unlockedBy: ["Consistent witness statements", "Aligned documentary evidence"]
      },
      {
        label: "Expert evidence route",
        description: "If contradictions are resolved through expert clarification, the case may focus on expert evidence rather than credibility.",
        unlockedBy: ["Expert clarification", "Updated expert reports"]
      }
    ];
    
    riskIfIgnored = "You lose a major opportunity to challenge the opponent's credibility. Contradictions are powerful tools in litigation — ignoring them means the opponent's inconsistent evidence may go unchallenged.";
    
    bestStageToUse = "At trial / cross-examination";
    
    howThisHelpsYouWin = isPI
      ? "Gives you powerful cross-examination material. Contradictions in medical evidence or witness statements can undermine causation or quantum arguments. This can lead to reduced damages or liability findings."
      : "Gives you powerful cross-examination material. Contradictions undermine the opponent's credibility and can weaken their entire case. This can lead to favorable judgments or settlement on better terms.";
  } else if (weakSpotType === "MISSING_EVIDENCE") {
    const missing = input.missingEvidence || [];
    triggeredBy.push(...missing.map(m => `Missing: ${m.type}`));
    
    whyRecommended = `The opponent's case is missing critical evidence. Without this evidence, they cannot properly discharge their burden of proof, giving you a strong position to challenge liability or quantum.`;
    
    alternatives = [
      {
        label: "Complete evidence route",
        description: "If the opponent provides all missing evidence, the case shifts to analyzing the substantive strength of their complete case.",
        unlockedBy: missing.map(m => `Upload ${m.type}`)
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to challenge their case on the basis of missing evidence. The court may not be aware of these gaps, and you miss a chance to argue they cannot prove their case.";
    
    bestStageToUse = isPI ? "Pre-trial review" : "CCMC / case management";
    
    howThisHelpsYouWin = isPI
      ? "Gives you grounds to challenge liability or quantum. Without medical records, accident statements, or expert reports, they cannot prove causation or damages. This can lead to reduced awards or liability findings."
      : "Gives you grounds to challenge their case as having no credible foundation. Without key evidence, they cannot discharge their burden of proof. This can lead to strike-out applications or favorable judgments.";
  } else if (weakSpotType === "POOR_EXPERT") {
    triggeredBy.push("Expert report analysis");
    triggeredBy.push("Expert qualifications review");
    
    whyRecommended = `The opponent's expert evidence has significant weaknesses. Poor expert evidence can be challenged on admissibility, methodology, or conclusions, giving you a strong position to undermine their case.`;
    
    alternatives = [
      {
        label: "Strong expert evidence route",
        description: "If the opponent provides strong expert evidence, focus shifts to challenging it through your own expert or substantive arguments.",
        unlockedBy: ["Updated expert report", "Qualified expert", "Robust methodology"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to challenge weak expert evidence. Poor expert reports can be excluded or given little weight — ignoring this means the opponent's weak evidence may be accepted.";
    
    bestStageToUse = "Pre-trial review / At trial";
    
    howThisHelpsYouWin = "Gives you grounds to challenge expert admissibility under CPR 35.4, cross-examine on methodology, or argue the expert's conclusions should be given little weight. This can significantly weaken the opponent's case.";
  } else {
    // Generic weak spot
    whyRecommended = `This weakness in the opponent's case was identified through analysis of their evidence and documents. It represents a legitimate opportunity to challenge their position.`;
    
    triggeredBy = evidence.length > 0 ? evidence : ["Case analysis", "Evidence review"];
    
    alternatives = [
      {
        label: "Strong opponent case route",
        description: "If the opponent addresses this weakness, the case proceeds with a stronger opponent position.",
        unlockedBy: ["Opponent evidence update", "Issue resolution"]
      }
    ];
    
    riskIfIgnored = "You lose an opportunity to exploit a weakness in the opponent's case. This may strengthen their position if not challenged.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Gives you grounds to challenge the opponent's case and strengthen your position. This can lead to favorable outcomes or settlement on better terms.";
  }

  return {
    whyRecommended,
    triggeredBy,
    alternatives,
    riskIfIgnored,
    bestStageToUse,
    howThisHelpsYouWin,
  };
}

/**
 * Generate meta for a strategy path
 */
export function generateStrategyPathMeta(
  route: string,
  title: string,
  description: string,
  input: MetaGeneratorInput
): StrategicInsightMeta {
  const practiceArea = input.practiceArea;
  const isHousing = practiceArea === "housing_disrepair";
  const isPI = practiceArea === "personal_injury" || practiceArea === "clinical_negligence";
  const isCriminal = practiceArea === "criminal";

  let whyRecommended = "";
  let triggeredBy: string[] = [];
  let alternatives: Array<{ label: string; description: string; unlockedBy?: string[] }> = [];
  let riskIfIgnored = "";
  let bestStageToUse = "";
  let howThisHelpsYouWin = "";

  if (route === "A") {
    // Procedural attack route
    triggeredBy.push("Opponent delays detected");
    triggeredBy.push("Non-compliance identified");
    if (input.vulnerabilities) {
      triggeredBy.push(...input.vulnerabilities.map(v => v.description));
    }
    
    whyRecommended = `This route is recommended because your case shows clear procedural failures by the opponent (delays, missing disclosure, non-compliance). These failures give you strong grounds for procedural applications and create significant leverage.`;
    
    alternatives = [
      {
        label: "Settlement-focused route",
        description: "If the opponent becomes responsive and compliant, focus shifts to substantive settlement negotiations.",
        unlockedBy: ["Opponent compliance", "Responsive communication"]
      },
      {
        label: "Substantive challenge route",
        description: "If procedural issues are resolved, the case may focus on challenging substantive legal or factual arguments.",
        unlockedBy: ["Procedural compliance", "Complete disclosure"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to exploit procedural failures. The opponent may continue their non-compliance, and you miss chances to seek costs, unless orders, or strike-out applications.";
    
    bestStageToUse = isCriminal ? "At next hearing" : "CCMC / case management";
    
    howThisHelpsYouWin = isCriminal
      ? "Gives you grounds to request costs and demonstrate non-compliance. This can affect the court's view of the opponent and create pressure for favorable outcomes."
      : "Gives you grounds to apply for costs, unless orders, or strike-out. This procedural advantage can force settlement or result in favorable court orders that significantly strengthen your position.";
  } else if (route === "B" && isHousing) {
    // Awaab's Law route
    triggeredBy.push("Awaab's Law compliance check");
    triggeredBy.push("Category 1 hazards identified");
    triggeredBy.push("Social landlord / under-5s detected");
    
    whyRecommended = `This route is recommended because your case involves a social landlord, children under 5, and Category 1 hazards — triggering Awaab's Law requirements. This creates a strong statutory position and safety urgency that gives you significant leverage.`;
    
    alternatives = [
      {
        label: "Standard housing route",
        description: "If Awaab's Law doesn't apply (private landlord or no under-5s), focus shifts to standard housing disrepair arguments.",
        unlockedBy: ["Private landlord confirmation", "No under-5s in property"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to leverage Awaab's Law compliance failures. This statutory framework provides strong support for your case — ignoring it means missing a significant advantage.";
    
    bestStageToUse = "Early PAP stage / Pre-trial review";
    
    howThisHelpsYouWin = "Gives you strong statutory support under Awaab's Law, creates safety urgency that affects quantum, and demonstrates systematic non-compliance. This can lead to higher damages awards and stronger liability findings.";
  } else if (route === "C") {
    // Expert contradiction route
    triggeredBy.push("Contradictions detected");
    triggeredBy.push("Expert weaknesses identified");
    if (input.contradictions) {
      triggeredBy.push(...input.contradictions.map(c => `Contradiction: ${c.description}`));
    }
    
    whyRecommended = `This route is recommended because your case shows clear contradictions in the opponent's evidence or weaknesses in their expert reports. These inconsistencies provide powerful material for cross-examination and challenging their case.`;
    
    alternatives = [
      {
        label: "Consistent evidence route",
        description: "If the opponent's evidence is consistent and expert reports are strong, focus shifts to challenging substantive legal arguments.",
        unlockedBy: ["Consistent evidence", "Strong expert reports"]
      },
      {
        label: "Mediation route",
        description: "If contradictions are resolved through clarification, mediation may become a viable alternative.",
        unlockedBy: ["Evidence clarification", "Contradiction resolution"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to exploit contradictions and expert weaknesses. These are powerful tools in litigation — ignoring them means the opponent's inconsistent evidence may go unchallenged.";
    
    bestStageToUse = "Pre-trial review / At trial";
    
    howThisHelpsYouWin = isPI
      ? "Gives you powerful cross-examination material that can undermine causation or quantum arguments. Contradictions in medical evidence can lead to reduced damages or favorable liability findings."
      : "Gives you powerful cross-examination material that undermines the opponent's credibility and weakens their entire case. This can lead to favorable judgments or settlement on significantly better terms.";
  } else if (route === "D") {
    // Settlement pressure route
    triggeredBy.push("Significant opponent delays");
    triggeredBy.push("Approaching hearing date");
    if (input.nextHearingDate) {
      triggeredBy.push(`Next hearing: ${input.nextHearingDate}`);
    }
    
    whyRecommended = `This route is recommended because your case shows significant opponent delays and an approaching hearing. This time pressure creates strong leverage for settlement negotiations — the opponent is under pressure to resolve before the hearing.`;
    
    alternatives = [
      {
        label: "Trial preparation route",
        description: "If settlement negotiations fail, focus shifts to comprehensive trial preparation.",
        unlockedBy: ["Settlement rejected", "Trial confirmed"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to leverage time pressure for settlement. The opponent may prepare for trial, and you miss a chance to resolve on favorable terms before incurring trial costs.";
    
    bestStageToUse = "Pre-trial review / Settlement window";
    
    howThisHelpsYouWin = "Gives you strong negotiating position due to time pressure. The opponent is incentivized to settle to avoid trial costs and risks. This can lead to favorable settlement terms and faster resolution.";
  } else {
    // Generic route
    whyRecommended = `This strategic route was identified based on the specific circumstances of your case. It represents a legitimate litigation pathway that aligns with your case's strengths and the opponent's weaknesses.`;
    
    triggeredBy = ["Case analysis", "Evidence review"];
    
    alternatives = [
      {
        label: "Alternative strategic route",
        description: "If case circumstances change, alternative routes may become more appropriate.",
        unlockedBy: ["New evidence", "Changed circumstances"]
      }
    ];
    
    riskIfIgnored = "You may miss an opportunity to pursue the most effective litigation strategy for your case.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Provides a structured approach to your litigation that maximizes your chances of a favorable outcome.";
  }

  return {
    whyRecommended,
    triggeredBy,
    alternatives,
    riskIfIgnored,
    bestStageToUse,
    howThisHelpsYouWin,
  };
}

/**
 * Generate meta for a judicial expectation
 */
export function generateJudicialExpectationMeta(
  expectation: string,
  status: string,
  input: MetaGeneratorInput
): StrategicInsightMeta {
  const practiceArea = input.practiceArea;
  const isHousing = practiceArea === "housing_disrepair";
  const isPI = practiceArea === "personal_injury" || practiceArea === "clinical_negligence";

  let whyRecommended = "";
  let triggeredBy: string[] = [];
  let alternatives: Array<{ label: string; description: string; unlockedBy?: string[] }> = [];
  let riskIfIgnored = "";
  let bestStageToUse = "";
  let howThisHelpsYouWin = "";

  if (expectation.toLowerCase().includes("pre-action")) {
    triggeredBy.push("Pre-action protocol requirements");
    if (isHousing) {
      triggeredBy.push("Awaab's Law compliance");
    }
    
    whyRecommended = `Judges expect pre-action protocol compliance before proceedings are issued. ${status === "NOT_MET" ? "Your case currently lacks this — addressing it is critical to avoid costs sanctions and demonstrate procedural compliance." : "Your case shows compliance, which strengthens your position."}`;
    
    alternatives = [
      {
        label: "Post-issue route",
        description: "If pre-action protocol is not completed, the case may proceed but with potential costs consequences.",
        unlockedBy: ["Proceedings issued", "Protocol bypassed"]
      }
    ];
    
    riskIfIgnored = status === "NOT_MET"
      ? "You risk costs sanctions and the court may view your case unfavorably. Non-compliance with pre-action protocol is taken seriously by judges."
      : "Maintaining compliance is essential to avoid costs sanctions.";
    
    bestStageToUse = "Early PAP stage";
    
    howThisHelpsYouWin = "Demonstrates procedural compliance and professionalism. This strengthens your position with the court and may affect costs orders in your favor.";
  } else if (expectation.toLowerCase().includes("chronology")) {
    triggeredBy.push("Timeline analysis");
    triggeredBy.push("Case chronology requirements");
    
    whyRecommended = `Judges expect a clear, structured chronology to understand the case timeline. ${input.hasChronology ? "Your case has this, which helps the court understand your position." : "Your case currently lacks this — creating a chronology will significantly help the court understand your case."}`;
    
    alternatives = [
      {
        label: "Narrative route",
        description: "If chronology is not available, the case may rely more heavily on narrative evidence.",
        unlockedBy: ["Narrative statements", "Alternative timeline format"]
      }
    ];
    
    riskIfIgnored = "The court may struggle to understand your case timeline, which can weaken your position and affect the judge's understanding of key events.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Helps the court understand your case clearly and demonstrates thorough preparation. This can affect the judge's view of your case and support favorable outcomes.";
  } else if (expectation.toLowerCase().includes("disclosure")) {
    triggeredBy.push("CPR 31.10 requirements");
    triggeredBy.push("Disclosure obligations");
    
    whyRecommended = `Judges expect proper disclosure as required under CPR 31.10. ${input.hasDisclosure ? "Your case shows compliance." : "Your case currently lacks proper disclosure — addressing this is essential."}`;
    
    alternatives = [
      {
        label: "Limited disclosure route",
        description: "If full disclosure is not possible, the case may proceed with limited disclosure but with potential consequences.",
        unlockedBy: ["Limited disclosure agreement", "Court order"]
      }
    ];
    
    riskIfIgnored = status === "NOT_MET"
      ? "You risk disclosure orders, costs sanctions, and the court may view your case unfavorably. Non-compliance with disclosure obligations is serious."
      : "Maintaining compliance is essential.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Demonstrates compliance with disclosure obligations and strengthens your position. This can affect costs orders and the court's view of your case.";
  } else {
    // Generic expectation
    whyRecommended = `This judicial expectation is based on standard practice in ${practiceArea} cases. ${status === "NOT_MET" ? "Addressing it will strengthen your case." : "Your case shows compliance."}`;
    
    triggeredBy = ["Judicial standards", "Case stage requirements"];
    
    alternatives = [
      {
        label: "Alternative compliance route",
        description: "If this expectation cannot be met, alternative approaches may be available.",
        unlockedBy: ["Court permission", "Alternative compliance"]
      }
    ];
    
    riskIfIgnored = status === "NOT_MET"
      ? "You risk costs sanctions and the court may view your case unfavorably."
      : "Maintaining compliance is important.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Demonstrates compliance with judicial expectations and strengthens your position with the court.";
  }

  return {
    whyRecommended,
    triggeredBy,
    alternatives,
    riskIfIgnored,
    bestStageToUse,
    howThisHelpsYouWin,
  };
}

/**
 * Generate meta for a time pressure point
 */
export function generateTimePressureMeta(
  issue: string,
  input: MetaGeneratorInput
): StrategicInsightMeta {
  const practiceArea = input.practiceArea;
  const isHousing = practiceArea === "housing_disrepair";
  const isPI = practiceArea === "personal_injury" || practiceArea === "clinical_negligence";

  let whyRecommended = "";
  let triggeredBy: string[] = [];
  let alternatives: Array<{ label: string; description: string; unlockedBy?: string[] }> = [];
  let riskIfIgnored = "";
  let bestStageToUse = "";
  let howThisHelpsYouWin = "";

  if (issue.toLowerCase().includes("opponent") || issue.toLowerCase().includes("delay")) {
    triggeredBy.push("Opponent delays detected");
    triggeredBy.push("Response time analysis");
    
    whyRecommended = `This time pressure point was identified because the opponent has created delays that give you tactical advantages. Acting now maximizes your leverage before the situation changes.`;
    
    alternatives = [
      {
        label: "Responsive opponent route",
        description: "If the opponent becomes responsive, focus shifts to substantive negotiations rather than procedural pressure.",
        unlockedBy: ["Opponent response", "Timely communication"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to leverage the opponent's delays. The window for maximum leverage may pass, and you miss chances to seek costs or enforcement.";
    
    bestStageToUse = "Now / Next available hearing";
    
    howThisHelpsYouWin = "Gives you grounds to apply for costs, unless orders, or enforcement. This creates pressure on the opponent and can lead to favorable outcomes or settlement.";
  } else if (issue.toLowerCase().includes("disclosure")) {
    triggeredBy.push("Disclosure deadline analysis");
    triggeredBy.push("CPR 31.10 requirements");
    
    whyRecommended = `This time pressure point relates to disclosure obligations. The opponent's failure to provide disclosure on time creates leverage and tactical advantages.`;
    
    alternatives = [
      {
        label: "Timely disclosure route",
        description: "If disclosure is provided on time, focus shifts to analyzing the disclosed documents.",
        unlockedBy: ["Complete disclosure", "Timely provision"]
      }
    ];
    
    riskIfIgnored = "You lose the opportunity to challenge disclosure failures. The court may not be aware of delays, and you miss chances to seek disclosure orders or costs.";
    
    bestStageToUse = "CCMC / case management";
    
    howThisHelpsYouWin = "Gives you grounds to apply for specific disclosure orders and costs. This can force the opponent to disclose documents or face sanctions.";
  } else {
    // Generic time pressure
    whyRecommended = `This time pressure point was identified based on deadlines and timing in your case. Acting at the right moment maximizes your tactical advantages.`;
    
    triggeredBy = ["Deadline analysis", "Timing review"];
    
    alternatives = [
      {
        label: "Extended timeline route",
        description: "If deadlines are extended, the timing pressure may change.",
        unlockedBy: ["Deadline extension", "Court order"]
      }
    ];
    
    riskIfIgnored = "You may miss the optimal window for action, reducing your leverage and tactical advantages.";
    
    bestStageToUse = "As soon as possible";
    
    howThisHelpsYouWin = "Maximizes your tactical advantages by acting at the optimal time. This can lead to favorable outcomes or settlement on better terms.";
  }

  return {
    whyRecommended,
    triggeredBy,
    alternatives,
    riskIfIgnored,
    bestStageToUse,
    howThisHelpsYouWin,
  };
}

