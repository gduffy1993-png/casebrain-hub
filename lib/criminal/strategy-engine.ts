/**
 * Criminal Strategy Engine
 * 
 * Generates intelligent criminal defence strategy routes from ANY uploaded PDF,
 * even when bundles are thin or disclosure is incomplete.
 * 
 * CORE PRINCIPLE: Strategy ≠ loopholes.
 * Strategy is a REASONED PLAN under uncertainty.
 * Loopholes are OPTIONAL accelerators.
 */

import type { CriminalEvidenceGraph } from "@/lib/case-evidence/merge-criminal-docs";

export type CriminalCharge = {
  offence: string; // e.g., "s18 OAPA", "s20 OAPA", "Assault"
  section?: string; // e.g., "18", "20", "47"
  description?: string;
};

export type DisclosureStatus = {
  isComplete: boolean;
  gaps: Array<{ category: string; item: string }>;
  mg6cDisclosed: boolean;
  cctvDisclosed: boolean;
};

export type CriminalStrategy = {
  id: string;
  title: string;
  theory: string; // Legal reasoning
  whenToUse: string;
  risks: string[];
  immediateActions: string[];
  disclosureDependency: boolean; // true if strategy depends on disclosure completing
  downgradeTarget: string | null; // e.g., "s18 → s20 → s47" or null
  provisional?: boolean; // true if based on incomplete disclosure
};

type StrategyInput = {
  charge: CriminalCharge | null;
  evidenceGraph: CriminalEvidenceGraph;
  disclosureStatus: DisclosureStatus;
  interviewStance?: "no_comment" | "answered" | "silent" | null;
};

/**
 * Generate criminal defence strategies from charge + evidence + disclosure status
 * 
 * ALWAYS returns at least 2 strategies, even for thin bundles.
 * Strategies are labeled PROVISIONAL if disclosure is incomplete.
 */
export function generateCriminalStrategies(input: StrategyInput): {
  strategies: CriminalStrategy[];
} {
  const { charge, evidenceGraph, disclosureStatus, interviewStance } = input;

  const strategies: CriminalStrategy[] = [];

  // Determine if bundle is thin
  const isThin = evidenceGraph.readiness.reasons.some(
    (r) => r.includes("Insufficient text") || r.includes("No extractable text")
  );

  // Extract charge section for s18/s20/s47 logic
  const chargeSection = charge?.section || extractSectionFromOffence(charge?.offence || "");
  const isViolentOffence = chargeSection === "18" || chargeSection === "20" || chargeSection === "47" || 
                          charge?.offence?.toLowerCase().includes("assault") ||
                          charge?.offence?.toLowerCase().includes("grievous") ||
                          charge?.offence?.toLowerCase().includes("bodily harm");

  // STRATEGY A — Intent Downgrade (s18 → s20)
  if (chargeSection === "18" || (isViolentOffence && chargeSection !== "20")) {
    strategies.push({
      id: "strategy-intent-downgrade",
      title: "Intent Downgrade (s18 → s20)",
      theory: `Under s18 OAPA 1861, the prosecution must prove specific intent to cause grievous bodily harm. Medical severity alone does not establish mens rea. The distinction between s18 (specific intent) and s20 (recklessness) turns on the defendant's state of mind at the time of the act. Where the incident is brief, chaotic, or involves a single blow, the inference of recklessness (s20) is more appropriate than specific intent (s18). ${isThin ? "Note: This analysis is provisional pending full disclosure and evidence review." : "Case law supports this distinction where intent cannot be clearly established from the circumstances."} ${interviewStance === "no_comment" ? "A no comment interview preserves the defendant's position and prevents the prosecution from inferring intent from admissions or explanations." : interviewStance === "answered" ? "Any admissions made in interview must be carefully assessed for whether they support specific intent or merely recklessness." : ""}`,
      whenToUse: "When prosecution relies on inference of intent, incident is chaotic/short, no admissions, and no expert evidence on intent exists.",
      risks: [
        "Prosecution may argue planning/premeditation if evidence emerges",
        "Medical severity alone may influence jury",
        "Weapon use may support intent inference"
      ],
      immediateActions: [
        "Request full medical causation narrative from prosecution",
        "Request CPS intent basis (written confirmation of why s18 not s20)",
        "Prepare s18→s20 written representations to CPS",
        "Obtain medical records to assess injury severity and mechanism",
        "Consider expert evidence on intent if medical evidence is ambiguous"
      ],
      disclosureDependency: false, // Can pursue even with incomplete disclosure
      downgradeTarget: chargeSection === "18" ? "s20" : chargeSection === "20" ? "s47" : null,
      provisional: isThin || !disclosureStatus.isComplete,
    });
  }

  // STRATEGY B — Disclosure Pressure / Trial Readiness Attack
  if (disclosureStatus.gaps.length > 0 || !disclosureStatus.mg6cDisclosed || !disclosureStatus.cctvDisclosed) {
    strategies.push({
      id: "strategy-disclosure-pressure",
      title: "Disclosure Pressure / Trial Readiness Attack",
      theory: `The Criminal Procedure and Investigations Act 1996 (CPIA) and Criminal Procedure Rules impose strict disclosure obligations on the prosecution. Under s3 CPIA, the prosecution must disclose all material that might reasonably be considered capable of undermining the prosecution case or assisting the defence. Failure to disclose CCTV footage, MG6 schedules, unused material, or forensic methodology constitutes a breach of disclosure obligations and may render the trial unfair under Article 6 ECHR. ${isThin ? "This strategy is provisional pending full disclosure review." : "Disclosure failures can lead to abuse of process applications and stays of proceedings where material is significant."} Where disclosure is incomplete, the prosecution is not trial-ready, creating adjournment pressure and potential narrowing of the prosecution case.`,
      whenToUse: "When CCTV not fully disclosed, MG6/unused material unclear, forensic methodology missing, or disclosure gaps exist.",
      risks: [
        "Court may grant adjournment rather than stay",
        "Prosecution may serve material late but before trial",
        "Disclosure failures may not be severe enough for stay"
      ],
      immediateActions: [
        "Send CPIA s7A letter requesting outstanding material",
        "Challenge MG6C/D schedules for completeness",
        "Demand CCTV continuity and full disclosure",
        "Request forensic methodology and chain of custody",
        "Consider abuse of process application if disclosure failures persist"
      ],
      disclosureDependency: true, // Strategy depends on disclosure gaps
      downgradeTarget: null,
      provisional: isThin || !disclosureStatus.isComplete,
    });
  }

  // STRATEGY C — Identification Reliability Attack
  const hasIDEvidence = evidenceGraph.evidenceItems.some(
    (item) => item.type === "ID" && item.disclosureStatus !== "not_disclosed"
  );
  const hasCCTV = evidenceGraph.evidenceItems.some(
    (item) => item.type === "CCTV" && item.disclosureStatus !== "not_disclosed"
  );

  if (hasIDEvidence || hasCCTV) {
    strategies.push({
      id: "strategy-identification-attack",
      title: "Identification Reliability Attack",
      theory: `Code D PACE 1984 and the Turnbull guidelines require identification evidence to be reliable and properly obtained. VIPER procedures must comply with Code D Annex E. Facial recognition technology is investigative only and not admissible as positive identification evidence. ${isThin ? "This analysis is provisional pending full disclosure of identification procedures and evidence." : "Identification evidence obtained in breach of Code D may be excluded under s78 PACE. Contamination, confidence inflation, and procedural breaches undermine identification reliability and may render evidence inadmissible or require a Turnbull direction to the jury."}`,
      whenToUse: "When VIPER used, CCTV/facial recognition involved, or identification evidence lacks expert validation.",
      risks: [
        "Identification may be strong despite procedural issues",
        "Court may admit identification with warning rather than exclude",
        "Multiple witnesses may support identification"
      ],
      immediateActions: [
        "Request full VIPER pack and procedure documentation",
        "Request facial recognition methodology and confidence scores",
        "Request all CCTV footage and continuity evidence",
        "Consider Turnbull direction preparation",
        "Assess identification procedure compliance with Code D"
      ],
      disclosureDependency: true,
      downgradeTarget: null,
      provisional: isThin || !disclosureStatus.isComplete,
    });
  }

  // STRATEGY D — Controlled Plea Position (OPTIONAL, risk-averse)
  if (chargeSection === "18" || chargeSection === "20") {
    strategies.push({
      id: "strategy-controlled-plea",
      title: "Controlled Plea Position (Risk-Averse Option)",
      theory: "If weapon + injury are strong but intent is weak, a controlled plea to s20 preserves credit, caps sentencing exposure, and avoids jury inference of intent. This strategy is OPTIONAL and should only be pursued if client is risk-averse and medical evidence supports downgrade.",
      whenToUse: "When weapon + injury are strong but intent is weak, and client is risk-averse. NEVER default - always optional.",
      risks: [
        "Client may plead to offence they could have defended",
        "Sentencing credit may be less than full trial acquittal",
        "May miss opportunity to challenge prosecution case"
      ],
      immediateActions: [
        "Prepare basis of plea to s20 (if s18 charged)",
        "Obtain medical clarification on injury mechanism",
        "Advise client on sentencing bands and credit",
        "Consider expert evidence on intent before plea",
        "Ensure client fully understands risks and benefits"
      ],
      disclosureDependency: true,
      downgradeTarget: chargeSection === "18" ? "s20" : chargeSection === "20" ? "s47" : null,
      provisional: true, // Always provisional - requires full advice
    });
  }

  // STRATEGY E — PACE Breach / Interview Exclusion (if interview exists)
  const hasInterview = evidenceGraph.evidenceItems.some(
    (item) => item.type === "PACE" && item.disclosureStatus !== "not_disclosed"
  );
  if (hasInterview && interviewStance === "no_comment") {
    strategies.push({
      id: "strategy-pace-breach",
      title: "PACE Breach / Interview Exclusion",
      theory: `PACE Code C requires a caution before questioning, the right to consult a solicitor, and proper recording of interviews. Breaches of PACE may render interview evidence inadmissible under s76(2) PACE (oppression) or s78 PACE (unfairness). ${isThin ? "This analysis is provisional pending full disclosure of custody records and interview recordings." : "Oppression includes any conduct that makes it likely that a confession is unreliable. A no comment interview preserves the defendant's position and prevents the prosecution from using silence against the defendant under s34 Criminal Justice and Public Order Act 1994, provided the defendant was properly advised."}`,
      whenToUse: "When interview exists, PACE compliance is questionable, or caution/solicitor rights were breached.",
      risks: [
        "Court may admit interview with warning rather than exclude",
        "PACE breaches may not be severe enough for exclusion",
        "Prosecution may argue no prejudice"
      ],
      immediateActions: [
        "Request full custody record and interview recording",
        "Assess PACE compliance (caution, solicitor, recording)",
        "Request disclosure of all interview-related material",
        "Consider s76/s78 PACE exclusion application",
        "Prepare submissions on admissibility"
      ],
      disclosureDependency: true,
      downgradeTarget: null,
      provisional: isThin || !disclosureStatus.isComplete,
    });
  }

  // STRATEGY F — Evidence Weakness / No Case to Answer (fallback for any charge)
  if (strategies.length < 2) {
    strategies.push({
      id: "strategy-evidence-weakness",
      title: "Evidence Weakness / No Case to Answer",
      theory: `The prosecution must prove all elements of the offence beyond reasonable doubt. Weak evidence, contradictions, or missing elements may support a submission of no case to answer or acquittal. ${isThin ? "This analysis is provisional pending full disclosure and evidence review." : "The test for no case to answer is where there is no evidence that the crime has been committed, or the evidence is so weak that no reasonable jury could convict. Even strong-looking cases may have weaknesses that emerge on closer examination of the evidence."}`,
      whenToUse: "When evidence is weak, contradictions exist, or elements of offence are not clearly proven.",
      risks: [
        "Evidence may strengthen with disclosure",
        "Court may find case sufficient despite weaknesses",
        "Jury may convict despite weak evidence"
      ],
      immediateActions: [
        "Identify missing elements of offence",
        "Request all evidence supporting each element",
        "Prepare no case to answer submission",
        "Identify contradictions in prosecution case",
        "Consider expert evidence to challenge prosecution case"
      ],
      disclosureDependency: true,
      downgradeTarget: null,
      provisional: isThin || !disclosureStatus.isComplete,
    });
  }

  // Ensure at least 2 strategies (fallback)
  if (strategies.length < 2) {
    strategies.push({
      id: "strategy-disclosure-first",
      title: "Disclosure-First Strategy",
      theory: "Until disclosure is complete, the defence position cannot be fully determined. All strategies are provisional and subject to disclosure completion. Focus on securing all material, assessing prosecution case, and preserving all options.",
      whenToUse: "When disclosure is incomplete or bundle is thin.",
      risks: [
        "Strategy may change significantly with disclosure",
        "May miss opportunities if too cautious",
        "Client may want more certainty"
      ],
      immediateActions: [
        "Request all outstanding disclosure",
        "Assess prosecution case as disclosed",
        "Preserve all defence options",
        "Advise client on provisional nature of strategy",
        "Review strategy once disclosure completes"
      ],
      disclosureDependency: true,
      downgradeTarget: null,
      provisional: true,
    });
  }

  return { strategies };
}

/**
 * Extract section number from offence string
 */
function extractSectionFromOffence(offence: string): string {
  const match = offence.match(/s(?:ection\s+)?(\d+)/i);
  return match ? match[1] : "";
}

