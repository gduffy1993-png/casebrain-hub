/**
 * Multi-Path Strategy Generator
 * 
 * Maps multiple legitimate litigation pathways.
 * Shows Route A/B/C/D/E options for attack or defense.
 * 
 * All routes are legitimate and within CPR rules.
 */

import { detectOpponentVulnerabilities } from "./opponent-vulnerabilities";
import { analyzeTimePressure } from "./time-pressure";
import { detectOpponentWeakSpots } from "./weak-spots";
import { detectCaseRole, type CaseRole } from "./role-detection";
import { detectSubstantiveMerits } from "./substantive-merits";
import type { PracticeArea } from "../types/casebrain";
import type { StrategicInsightMeta } from "./types";
import { generateStrategyPathMeta } from "./meta-generator";

export type StrategyPath = {
  id: string;
  caseId: string;
  route: "A" | "B" | "C" | "D" | "E";
  title: string; // "Route A: Challenge on breach of duty"
  description: string;
  approach: string; // Detailed approach
  pros: string[];
  cons: string[];
  estimatedTimeframe: string;
  estimatedCost: string;
  successProbability: "HIGH" | "MEDIUM" | "LOW";
  recommendedFor: string; // When this route is best
  createdAt: string;
  meta?: StrategicInsightMeta; // Explanatory metadata
};

type StrategyPathInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
  bundleId?: string;
  hasChronology: boolean;
  hasHazardAssessment: boolean;
  nextHearingDate?: string;
  caseRole?: CaseRole; // Optional: if not provided, will be detected
};

/**
 * Generate multiple strategy paths for a case
 * 
 * Routes are role-aware:
 * - Claimant cases: Focus on liability admission, quantum resolution, PAP pressure
 * - Defendant cases: Focus on procedural leverage, strike-out, Part 36 offers
 */
export async function generateStrategyPaths(
  input: StrategyPathInput,
): Promise<StrategyPath[]> {
  const paths: StrategyPath[] = [];
  const now = new Date().toISOString();
  
  // Detect case role if not provided
  let caseRole = input.caseRole;
  if (!caseRole) {
    try {
      caseRole = await detectCaseRole({
        caseId: input.caseId,
        orgId: input.orgId,
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
      });
    } catch (error) {
      console.warn("[strategy-paths] Failed to detect case role, defaulting to claimant:", error);
      caseRole = "claimant"; // Default to claimant
    }
  }
  
  const isClaimant = caseRole === "claimant";
  const isClinicalNeg = input.practiceArea === "clinical_negligence";

  // Get strategic intelligence
  const vulnerabilities = await detectOpponentVulnerabilities({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    documents: input.documents,
    letters: input.letters,
    deadlines: input.deadlines,
    timeline: input.timeline,
    bundleId: input.bundleId,
    hasChronology: input.hasChronology,
    hasHazardAssessment: input.hasHazardAssessment,
  });

  const timePressure = await analyzeTimePressure({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    timeline: input.timeline,
    deadlines: input.deadlines,
    letters: input.letters,
    nextHearingDate: input.nextHearingDate,
  });

  const weakSpots = await detectOpponentWeakSpots({
    caseId: input.caseId,
    orgId: input.orgId,
    practiceArea: input.practiceArea,
    documents: input.documents,
    timeline: input.timeline,
    bundleId: input.bundleId,
  });

  // ============================================
  // CLAIMANT-SPECIFIC ROUTES (Clinical Negligence)
  // ============================================
  if (isClaimant && isClinicalNeg) {
    // Route A: Early liability admission → quantum resolution
    let merits: Awaited<ReturnType<typeof detectSubstantiveMerits>> | null = null;
    try {
      merits = await detectSubstantiveMerits({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
    } catch (error) {
      console.warn("[strategy-paths] Failed to detect substantive merits:", error);
    }
    
    if (merits && (merits.guidelineBreaches.detected || merits.expertConfirmation.detected || merits.delayCausation.detected)) {
      const path: StrategyPath = {
        id: `strategy-route-a-${input.caseId}`,
        caseId: input.caseId,
        route: "A",
        title: "Route A: Early liability admission pressure using guideline breaches and expert evidence",
        description: "High-merit liability case with strong breach/causation evidence (guideline breaches, expert confirmation, delay-caused harm). Use this leverage to seek early liability admission and move to quantum resolution.",
        approach: "1. Serve Letter of Claim highlighting guideline breaches and expert confirmation of avoidability. 2. Request admission of liability within 21 days under PAP. 3. If admission received, proceed to quantum negotiation. 4. If liability denied, proceed to trial on liability with strong evidential position. 5. Use guideline breaches and expert evidence as primary leverage in negotiations and at trial.",
        pros: [
          "Strong evidential position on breach and causation",
          "Guideline breaches create strong liability foundation",
          "Expert confirmation strengthens case",
          "Early admission reduces costs and time",
          "High success probability given substantive merits",
        ],
        cons: [
          "Defendant may resist despite strong evidence",
          "Requires expert evidence (costs)",
          "May require full liability trial if admission not received",
        ],
        estimatedTimeframe: "3-6 months (if admission) or 12-18 months (if trial)",
        estimatedCost: "Medium-High (expert reports, potentially trial)",
        successProbability: merits.totalScore >= 80 ? "HIGH" : "MEDIUM",
        recommendedFor: "Cases with confirmed guideline breaches, expert causation evidence, or delay-caused harm. Most effective when multiple substantive merits are present.",
        createdAt: now,
      };
      
      path.meta = generateStrategyPathMeta(
        "A",
        path.title,
        path.description,
        {
          practiceArea: input.practiceArea,
          documents: input.documents,
          timeline: input.timeline,
          letters: input.letters,
          deadlines: input.deadlines,
          hasChronology: input.hasChronology,
          hasMedicalEvidence: true,
          hasExpertReports: true,
          hasDisclosure: false,
          hasPreActionLetter: input.letters.some(l => 
            l.template_id?.toLowerCase().includes("pre_action") ||
            l.template_id?.toLowerCase().includes("protocol")
          ),
        }
      );
      
      paths.push(path);
    }
    
    // Route B: PAP pressure strategy (claimant-specific)
    const hasPAPLetter = input.letters.some(l => 
      l.template_id?.toLowerCase().includes("pre_action") ||
      l.template_id?.toLowerCase().includes("protocol")
    );
    
    if (!hasPAPLetter && merits && merits.totalScore > 0) {
      const path: StrategyPath = {
        id: `strategy-route-b-${input.caseId}`,
        caseId: input.caseId,
        route: "B",
        title: "Route B: Pre-Action Protocol pressure strategy",
        description: "Use PAP to apply maximum pressure on defendant before proceedings. Serve strong Letter of Claim highlighting substantive merits and request admission within 21 days.",
        approach: "1. Serve detailed Letter of Claim under PAP highlighting guideline breaches, expert evidence, and delay-caused harm. 2. Request full admission of liability within 21 days. 3. Threaten proceedings if admission not received. 4. Use PAP breach as leverage for costs if proceedings issued. 5. Negotiate quantum if admission received.",
        pros: [
          "PAP creates time pressure on defendant",
          "Strong substantive merits in Letter of Claim create pressure",
          "May achieve admission without proceedings",
          "Lower costs if resolved at PAP stage",
        ],
        cons: [
          "Defendant may deny and force proceedings",
          "Requires strong Letter of Claim preparation",
        ],
        estimatedTimeframe: "1-2 months (if admission) or proceed to proceedings",
        estimatedCost: "Low-Medium (Letter of Claim only if admission received)",
        successProbability: merits.totalScore >= 60 ? "HIGH" : "MEDIUM",
        recommendedFor: "Cases with strong substantive merits that have not yet served PAP Letter of Claim. Effective when guideline breaches or expert evidence is clear.",
        createdAt: now,
      };
      
      path.meta = generateStrategyPathMeta(
        "B",
        path.title,
        path.description,
        {
          practiceArea: input.practiceArea,
          documents: input.documents,
          timeline: input.timeline,
          letters: input.letters,
          deadlines: input.deadlines,
          hasChronology: input.hasChronology,
          hasMedicalEvidence: true,
          hasExpertReports: true,
          hasDisclosure: false,
          hasPreActionLetter: false,
        }
      );
      
      paths.push(path);
    }
    
    // Route C: Litigation to liability judgment (claimant-specific)
    if (merits && merits.totalScore >= 50) {
      const path: StrategyPath = {
        id: `strategy-route-c-${input.caseId}`,
        caseId: input.caseId,
        route: "C",
        title: "Route C: Litigation to liability judgment using substantive merits",
        description: "High-merit case suitable for liability trial if admission resisted. Use guideline breaches, expert evidence, and delay-caused harm as primary trial arguments.",
        approach: "1. Issue proceedings if admission not received. 2. Focus Particulars of Claim on guideline breaches and expert confirmation. 3. Use delay-caused harm to strengthen causation. 4. Prepare for liability trial with strong evidential foundation. 5. Seek costs if liability judgment obtained. 6. Proceed to quantum if liability established.",
        pros: [
          "Strong substantive merits support liability trial",
          "Guideline breaches provide clear liability foundation",
          "Expert evidence strengthens position",
          "High probability of liability judgment",
        ],
        cons: [
          "Full trial costs",
          "Longer timeframe (12-18 months)",
          "Requires comprehensive trial preparation",
        ],
        estimatedTimeframe: "12-18 months to liability judgment",
        estimatedCost: "High (trial costs, expert evidence)",
        successProbability: merits.totalScore >= 70 ? "HIGH" : "MEDIUM",
        recommendedFor: "Cases with strong substantive merits where defendant resists admission. Most effective when guideline breaches and expert causation are clearly established.",
        createdAt: now,
      };
      
      path.meta = generateStrategyPathMeta(
        "C",
        path.title,
        path.description,
        {
          practiceArea: input.practiceArea,
          documents: input.documents,
          timeline: input.timeline,
          letters: input.letters,
          deadlines: input.deadlines,
          hasChronology: input.hasChronology,
          hasMedicalEvidence: true,
          hasExpertReports: true,
          hasDisclosure: false,
          hasPreActionLetter: input.letters.some(l => 
            l.template_id?.toLowerCase().includes("pre_action") ||
            l.template_id?.toLowerCase().includes("protocol")
          ),
        }
      );
      
      paths.push(path);
    }
    
    // Route D: Settlement leverage using guideline breaches (claimant-specific)
    if (merits && merits.guidelineBreaches.detected && input.nextHearingDate) {
      const path: StrategyPath = {
        id: `strategy-route-d-${input.caseId}`,
        caseId: input.caseId,
        route: "D",
        title: "Route D: Settlement leverage using guideline breaches and approaching hearing",
        description: "Use guideline breaches and approaching hearing to create settlement pressure. Make Part 36 offer or settlement proposal highlighting substantive merits.",
        approach: "1. Serve Part 36 offer or settlement proposal highlighting guideline breaches and expert evidence. 2. Emphasize approaching hearing and time pressure. 3. Negotiate from position of strength using substantive merits. 4. Use guideline breaches as primary settlement leverage. 5. Achieve favorable settlement before trial.",
        pros: [
          "Guideline breaches create strong settlement leverage",
          "Faster resolution than trial",
          "Lower costs",
          "Defendant under pressure from approaching hearing",
        ],
        cons: [
          "May require compromise on quantum",
          "Depends on defendant's willingness to settle",
        ],
        estimatedTimeframe: "1-3 months to settlement",
        estimatedCost: "Low-Medium (negotiation only)",
        successProbability: merits.guidelineBreaches.score >= 30 ? "HIGH" : "MEDIUM",
        recommendedFor: "Cases with clear guideline breaches and approaching hearing. Effective when substantive merits are strong but defendant may be open to settlement.",
        createdAt: now,
      };
      
      path.meta = generateStrategyPathMeta(
        "D",
        path.title,
        path.description,
        {
          practiceArea: input.practiceArea,
          documents: input.documents,
          timeline: input.timeline,
          letters: input.letters,
          deadlines: input.deadlines,
          hasChronology: input.hasChronology,
          hasMedicalEvidence: true,
          hasExpertReports: true,
          hasDisclosure: false,
          hasPreActionLetter: input.letters.some(l => 
            l.template_id?.toLowerCase().includes("pre_action") ||
            l.template_id?.toLowerCase().includes("protocol")
          ),
        }
      );
      
      paths.push(path);
    }
  }
  
  // ============================================
  // DEFENDANT-SPECIFIC ROUTES
  // ============================================
  if (!isClaimant) {
    // Route A: Procedural attack via opponent delays/non-compliance (defendant-specific)
    const hasProceduralVulnerabilities = vulnerabilities.some(v => 
      v.type === "LATE_RESPONSE" || 
      v.type === "INCOMPLETE_DISCLOSURE" ||
      v.type === "MISSING_PRE_ACTION"
    );

    if (hasProceduralVulnerabilities) {
    const path: StrategyPath = {
      id: `strategy-route-a-${input.caseId}`,
      caseId: input.caseId,
      route: "A",
      title: "Route A: Procedural attack via opponent delays and non-compliance",
      description: "Focus on opponent's procedural failures (delays, missing disclosure, non-compliance) to apply pressure and seek costs/strike-out.",
      approach: "1. Document all opponent delays and non-compliance. 2. Apply for unless order or costs order. 3. Use procedural failures to support case and create leverage. 4. If opponent fails to comply, seek strike-out.",
      pros: [
        "Strong procedural position",
        "Clear evidence of opponent failures",
        "Court likely to grant applications given delays",
        "Creates maximum pressure on opponent",
      ],
      cons: [
        "May delay case resolution",
        "Requires court applications (costs)",
        "Opponent may comply at last minute",
      ],
      estimatedTimeframe: "2-4 months",
      estimatedCost: "Medium (court application fees)",
      successProbability: "HIGH",
      recommendedFor: "Cases with clear opponent delays and non-compliance",
      createdAt: now,
    };
    
    // Generate meta
    path.meta = generateStrategyPathMeta(
      "A",
      path.title,
      path.description,
      {
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
        letters: input.letters,
        deadlines: input.deadlines,
        hasChronology: input.hasChronology,
        hasMedicalEvidence: false,
        hasExpertReports: false,
        hasDisclosure: false,
        hasPreActionLetter: input.letters.some(l => 
          l.template_id?.toLowerCase().includes("pre_action") ||
          l.template_id?.toLowerCase().includes("protocol")
        ),
        vulnerabilities: vulnerabilities.map(v => ({
          type: v.type,
          description: v.description,
        })),
      }
    );
    
    paths.push(path);
  }
  } // Close if (!isClaimant) block

  // Route B: Awaab's Law / Hazard breach leverage (housing only - applies to both claimant and defendant)
  if (input.practiceArea === "housing_disrepair") {
    const hasAwaabVulnerabilities = vulnerabilities.some(v => 
      v.type === "MISSING_RECORDS" ||
      v.description.toLowerCase().includes("awaab")
    );

    const hasHazards = input.timeline.some(e => 
      e.description.toLowerCase().includes("hazard") ||
      e.description.toLowerCase().includes("mold") ||
      e.description.toLowerCase().includes("damp")
    );

    if (hasAwaabVulnerabilities || hasHazards) {
      const path: StrategyPath = {
        id: `strategy-route-b-${input.caseId}`,
        caseId: input.caseId,
        route: "B",
        title: "Route B: Leverage Awaab's Law hazard breach",
        description: "Focus on Awaab's Law compliance failures and Category 1 hazards to create urgency and leverage.",
        approach: "1. Establish Awaab's Law breach (social landlord, under-5s, Category 1 hazards). 2. Highlight urgency and safety concerns. 3. Use breach to support quantum and liability. 4. Leverage safety urgency to pressure opponent.",
        pros: [
          "Strong statutory position (Awaab's Law)",
          "Safety urgency creates leverage",
          "Clear compliance failures",
          "High public interest angle",
        ],
        cons: [
          "Only applies to social landlords",
          "Requires Category 1 hazards",
          "May require expert evidence",
        ],
        estimatedTimeframe: "3-6 months",
        estimatedCost: "Medium-High (expert reports)",
        successProbability: "HIGH",
        recommendedFor: "Housing cases with social landlords, under-5s, and Category 1 hazards",
        createdAt: now,
      };
      
      // Generate meta
      path.meta = generateStrategyPathMeta(
        "B",
        path.title,
        path.description,
        {
          practiceArea: input.practiceArea,
          documents: input.documents,
          timeline: input.timeline,
          letters: input.letters,
          deadlines: input.deadlines,
          hasChronology: input.hasChronology,
          hasMedicalEvidence: false,
          hasExpertReports: false,
          hasDisclosure: false,
          hasPreActionLetter: input.letters.some(l => 
            l.template_id?.toLowerCase().includes("pre_action") ||
            l.template_id?.toLowerCase().includes("protocol")
          ),
          vulnerabilities: vulnerabilities.filter(v => 
            v.type === "MISSING_RECORDS" ||
            v.description.toLowerCase().includes("awaab")
          ).map(v => ({
            type: v.type,
            description: v.description,
          })),
        }
      );
      
      paths.push(path);
    }
  }

  // Route C: Expert contradiction / cross-examination (applies to both claimant and defendant)
  const hasExpertWeakSpots = weakSpots.some(w => 
    w.type === "POOR_EXPERT" ||
    w.description.toLowerCase().includes("expert")
  );

  const hasContradictions = weakSpots.some(w => w.type === "CONTRADICTION");

  if (hasExpertWeakSpots || hasContradictions) {
    const contradictionDetails = weakSpots.filter(w => w.type === "CONTRADICTION");
    const expertDetails = weakSpots.filter(w => w.type === "POOR_EXPERT");
    
    let detailedApproach = "";
    let specificQuestions = "";
    
    if (contradictionDetails.length > 0) {
      detailedApproach = `Step 1: Document all contradictions in detail — identify where the opponent's evidence conflicts (e.g., statement vs statement, timeline vs evidence, medical vs factual). Step 2: Request clarification under CPR 18.1 within 14 days — ask specific questions about the contradictions. Step 3: If not clarified, apply for further information under CPR 18.1 with costs. Step 4: Prepare cross-examination questions targeting each contradiction — use the CPR 18.1 responses to pin down their position. Step 5: At trial, challenge their credibility by highlighting the contradictions — argue that inconsistent evidence undermines their case.`;
      
      specificQuestions = "Example questions: 'In your statement dated [X], you said [Y], but in your letter dated [Z], you said [W]. Which is correct?' 'Your timeline shows [A], but your medical records show [B]. How do you explain this discrepancy?' 'You claim [C], but your own documents state [D]. Which version should the court believe?'";
    } else if (expertDetails.length > 0) {
      detailedApproach = `Step 1: Identify expert weaknesses — look for: (a) lack of qualifications, (b) insufficient reasoning, (c) failure to consider alternative explanations, (d) reliance on incomplete information. Step 2: Request expert's full report under CPR 35.10 within 14 days. Step 3: If weaknesses are significant, consider challenging admissibility under CPR 35.4 or applying for permission to call your own expert. Step 4: Prepare cross-examination questions targeting the weaknesses — focus on methodology, assumptions, and alternative explanations. Step 5: At trial, challenge the expert's credibility and the reliability of their conclusions.`;
      
      specificQuestions = "Example questions: 'What qualifications do you have in [relevant field]?' 'Did you consider [alternative explanation]?' 'What methodology did you use to reach this conclusion?' 'How do you explain the discrepancy between your report and [other evidence]?'";
    } else {
      detailedApproach = "Step 1: Identify contradictions and expert weaknesses. Step 2: Request clarification or further information. Step 3: Prepare cross-examination questions. Step 4: Use contradictions to challenge opponent's case at hearing.";
      specificQuestions = "Prepare questions targeting any inconsistencies in the opponent's evidence.";
    }
    
    const path: StrategyPath = {
      id: `strategy-route-c-${input.caseId}`,
      caseId: input.caseId,
      route: "C",
      title: "Route C: Push expert contradiction for cross-examination",
      description: "Focus on contradictions and expert weaknesses to challenge opponent's evidence and credibility. This route exploits inconsistencies in the opponent's case to weaken their position and create leverage for settlement or favorable judgment.",
      approach: detailedApproach,
      pros: [
        "Weakens opponent's evidence — contradictions undermine credibility",
        "Challenges credibility — inconsistent evidence suggests unreliability",
        "Strong position for cross-examination — specific questions can expose weaknesses",
        "May lead to settlement — opponent may settle rather than face cross-examination",
        "Legal basis: CPR 18.1 (further information), CPR 35.10 (expert disclosure)",
      ],
      cons: [
        "Requires careful preparation — must identify and document contradictions precisely",
        "May require expert evidence — to challenge opponent's expert effectively",
        "Depends on quality of contradictions — weak contradictions may not be effective",
        "Time and cost — cross-examination requires hearing preparation",
      ],
      estimatedTimeframe: "4-6 months",
      estimatedCost: "Medium-High (expert evidence, hearing preparation, court time)",
      successProbability: contradictionDetails.length >= 2 || expertDetails.length >= 1 ? "HIGH" : "MEDIUM",
      recommendedFor: `Cases with clear contradictions (${contradictionDetails.length} found) or expert weaknesses (${expertDetails.length} found). Most effective when contradictions are significant and well-documented.`,
      createdAt: now,
    };
    
    // Generate meta
    path.meta = generateStrategyPathMeta(
      "C",
      path.title,
      path.description,
      {
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
        letters: input.letters,
        deadlines: input.deadlines,
        hasChronology: input.hasChronology,
        hasMedicalEvidence: false,
        hasExpertReports: false,
        hasDisclosure: false,
        hasPreActionLetter: input.letters.some(l => 
          l.template_id?.toLowerCase().includes("pre_action") ||
          l.template_id?.toLowerCase().includes("protocol")
        ),
        contradictions: contradictionDetails.map(c => ({
          description: c.description,
          confidence: c.severity === "CRITICAL" ? "high" : "medium",
        })),
      }
    );
    
    paths.push(path);
  }

  // Route D: Settlement pressure route
  const hasSignificantDelays = timePressure.some(t => 
    t.severity === "CRITICAL" || t.severity === "HIGH"
  );

  if (hasSignificantDelays && input.nextHearingDate) {
    const path: StrategyPath = {
      id: `strategy-route-d-${input.caseId}`,
      caseId: input.caseId,
      route: "D",
      title: "Route D: Settlement pressure route — opponent's delay strengthens leverage",
      description: "Use opponent's delays and approaching hearing to create settlement pressure and negotiate favorable terms.",
      approach: "1. Document all opponent delays. 2. Make Part 36 offer or settlement proposal. 3. Highlight delays and approaching hearing. 4. Negotiate from position of strength.",
      pros: [
        "Faster resolution",
        "Lower costs",
        "Opponent under time pressure",
        "Strong negotiating position",
      ],
      cons: [
        "May require compromise",
        "Depends on opponent's willingness",
        "May not achieve full value",
      ],
      estimatedTimeframe: "1-2 months",
      estimatedCost: "Low (negotiation only)",
      successProbability: "MEDIUM",
      recommendedFor: "Cases with significant opponent delays and approaching hearing",
      createdAt: now,
    };
    
    // Generate meta
    path.meta = generateStrategyPathMeta(
      "D",
      path.title,
      path.description,
      {
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
        letters: input.letters,
        deadlines: input.deadlines,
        hasChronology: input.hasChronology,
        hasMedicalEvidence: false,
        hasExpertReports: false,
        hasDisclosure: false,
        hasPreActionLetter: input.letters.some(l => 
          l.template_id?.toLowerCase().includes("pre_action") ||
          l.template_id?.toLowerCase().includes("protocol")
        ),
      }
    );
    
    paths.push(path);
  }

  // Route E: Hybrid approach (combine multiple routes)
  if (paths.length >= 2) {
    const path: StrategyPath = {
      id: `strategy-route-e-${input.caseId}`,
      caseId: input.caseId,
      route: "E",
      title: "Route E: Hybrid approach — combine procedural, substantive, and settlement pressure",
      description: "Combine multiple strategies: procedural attacks, substantive challenges, and settlement pressure to maximize leverage.",
      approach: "1. Apply procedural pressure (unless orders, costs). 2. Challenge substantive weaknesses (contradictions, expert evidence). 3. Maintain settlement discussions. 4. Use all leverage points simultaneously.",
      pros: [
        "Maximum leverage",
        "Multiple pressure points",
        "Flexible approach",
        "Best chance of favorable outcome",
      ],
      cons: [
        "More complex",
        "Higher costs",
        "Requires careful coordination",
      ],
      estimatedTimeframe: "3-6 months",
      estimatedCost: "Medium-High (multiple applications)",
      successProbability: "HIGH",
      recommendedFor: "Complex cases with multiple leverage points",
      createdAt: now,
    };
    
    // Generate meta
    path.meta = generateStrategyPathMeta(
      "E",
      path.title,
      path.description,
      {
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
        letters: input.letters,
        deadlines: input.deadlines,
        hasChronology: input.hasChronology,
        hasMedicalEvidence: false,
        hasExpertReports: false,
        hasDisclosure: false,
        hasPreActionLetter: input.letters.some(l => 
          l.template_id?.toLowerCase().includes("pre_action") ||
          l.template_id?.toLowerCase().includes("protocol")
        ),
      }
    );
    
    paths.push(path);
  }

  // If no specific routes identified, provide default route
  if (paths.length === 0) {
    const path: StrategyPath = {
      id: `strategy-route-default-${input.caseId}`,
      caseId: input.caseId,
      route: "A",
      title: "Route A: Standard litigation pathway",
      description: "Follow standard litigation process: gather evidence, comply with protocols, prepare for hearing.",
      approach: "1. Complete pre-action protocol. 2. Gather all evidence. 3. Issue proceedings if necessary. 4. Prepare for hearing.",
      pros: [
        "Standard approach",
        "Lower risk",
        "Predictable timeline",
      ],
      cons: [
        "May be slower",
        "Less leverage",
        "Standard costs",
      ],
      estimatedTimeframe: "6-12 months",
      estimatedCost: "Medium",
      successProbability: "MEDIUM",
      recommendedFor: "Cases without clear leverage points",
      createdAt: now,
    };
    
    // Generate meta
    path.meta = generateStrategyPathMeta(
      "A",
      path.title,
      path.description,
      {
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
        letters: input.letters,
        deadlines: input.deadlines,
        hasChronology: input.hasChronology,
        hasMedicalEvidence: false,
        hasExpertReports: false,
        hasDisclosure: false,
        hasPreActionLetter: input.letters.some(l => 
          l.template_id?.toLowerCase().includes("pre_action") ||
          l.template_id?.toLowerCase().includes("protocol")
        ),
      }
    );
    
    paths.push(path);
  }

  return paths;
}

