/**
 * Criminal Law Loophole Detector
 * 
 * Finds PACE breaches, procedural errors, evidence weaknesses, and other
 * loopholes that can be exploited to get cases dismissed or clients acquitted.
 */

import "server-only";
import type { CriminalMeta } from "@/types/case";
import { getOpenAIClient } from "@/lib/openai";

export type LoopholeType =
  | "PACE_breach"
  | "procedural_error"
  | "evidence_weakness"
  | "disclosure_failure"
  | "identification_issue"
  | "contradiction"
  | "missing_evidence"
  | "chain_of_custody"
  | "hearsay"
  | "bad_character";

export type Loophole = {
  id: string;
  loopholeType: LoopholeType;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  exploitability: "low" | "medium" | "high";
  successProbability: number; // 0-100
  suggestedAction: string | null;
  legalArgument: string | null;
};

/**
 * Detect PACE breaches from criminal metadata
 */
export function detectPACEBreaches(criminalMeta: CriminalMeta | null | undefined): Loophole[] {
  const loopholes: Loophole[] = [];

  if (!criminalMeta?.paceCompliance) {
    return loopholes;
  }

  const pace = criminalMeta.paceCompliance;

  // Caution not given before questioning
  if (pace.cautionGiven === false || (pace.cautionGiven === true && pace.cautionGivenBeforeQuestioning === false)) {
    loopholes.push({
      id: `pace-caution-${Date.now()}`,
      loopholeType: "PACE_breach",
      title: "PACE Breach - Caution Not Given",
      description: "Caution was not given before questioning, or was given after questioning began. This is a fundamental breach of PACE.",
      severity: "CRITICAL",
      exploitability: "high",
      successProbability: 80,
      suggestedAction: "Apply to exclude confession/evidence under s.78 PACE. Without confession, prosecution case may collapse.",
      legalArgument: `Your Honour, I submit that the confession/evidence should be excluded under s.78 PACE. The caution was not given before questioning, which is a fundamental breach of the Police and Criminal Evidence Act 1984. Without this evidence, the prosecution has no case. I request the case be dismissed.`,
    });
  }

  // Interview not recorded
  if (pace.interviewRecorded === false) {
    loopholes.push({
      id: `pace-interview-${Date.now()}`,
      loopholeType: "PACE_breach",
      title: "PACE Breach - Interview Not Recorded",
      description: "Interview was not properly recorded. This breaches PACE Code of Practice.",
      severity: "HIGH",
      exploitability: "high",
      successProbability: 70,
      suggestedAction: "Challenge admissibility of interview evidence. Request voir dire hearing.",
      legalArgument: `Your Honour, the interview evidence should be excluded as it was not properly recorded in breach of PACE Code of Practice. I submit that without this evidence, the prosecution case is significantly weakened.`,
    });
  }

  // Right to solicitor denied
  if (pace.rightToSolicitor === false) {
    loopholes.push({
      id: `pace-solicitor-${Date.now()}`,
      loopholeType: "PACE_breach",
      title: "PACE Breach - Right to Solicitor Denied",
      description: "Client's right to consult with a solicitor was denied. This is a serious breach of PACE.",
      severity: "CRITICAL",
      exploitability: "high",
      successProbability: 85,
      suggestedAction: "Apply to exclude all evidence obtained after solicitor right was denied.",
      legalArgument: `Your Honour, my client's fundamental right to consult with a solicitor was denied, which is a serious breach of PACE. I submit that all evidence obtained after this breach should be excluded.`,
    });
  }

  // Detention time exceeded
  if (pace.detentionTime && pace.detentionTime > 24) {
    loopholes.push({
      id: `pace-detention-${Date.now()}`,
      loopholeType: "PACE_breach",
      title: "PACE Breach - Detention Time Exceeded",
      description: `Client was detained for ${pace.detentionTime} hours, exceeding the 24-hour limit without proper authorization.`,
      severity: "HIGH",
      exploitability: "medium",
      successProbability: 60,
      suggestedAction: "Challenge detention period. May support false imprisonment claim.",
      legalArgument: `Your Honour, my client was detained for ${pace.detentionTime} hours, which exceeds the 24-hour limit under PACE. This unlawful detention may render evidence obtained during this period inadmissible.`,
    });
  }

  return loopholes;
}

/**
 * Detect evidence weaknesses
 */
export function detectEvidenceWeaknesses(criminalMeta: CriminalMeta | null | undefined): Loophole[] {
  const loopholes: Loophole[] = [];

  if (!criminalMeta?.prosecutionEvidence) {
    return loopholes;
  }

  // Check for weak identification evidence
  const idEvidence = criminalMeta.prosecutionEvidence.filter(
    (e) => e.type === "witness_statement" && e.issues?.some((i) => ["distance", "lighting", "time"].includes(i.toLowerCase()))
  );

  if (idEvidence.length > 0) {
    const issues = idEvidence.flatMap((e) => e.issues || []).filter((i) => ["distance", "lighting", "time"].includes(i.toLowerCase()));
    
    loopholes.push({
      id: `weak-id-${Date.now()}`,
      loopholeType: "identification_issue",
      title: "Weak Identification Evidence",
      description: `Identification evidence is weak due to: ${issues.join(", ")}. This falls below the standard required for reliable identification.`,
      severity: "HIGH",
      exploitability: "high",
      successProbability: 70,
      suggestedAction: "Challenge identification evidence under Turnbull Guidelines. Request voir dire hearing.",
      legalArgument: `Your Honour, I submit that the identification evidence should be excluded under the Turnbull Guidelines. The witness identified my client from a significant distance, in poor lighting conditions, for only a brief period. This falls far below the standard required for reliable identification. Without this evidence, the prosecution has no case.`,
    });
  }

  // Check for contradictory evidence
  const witnessStatements = criminalMeta.prosecutionEvidence.filter((e) => e.type === "witness_statement");
  if (witnessStatements.length > 1) {
    // Simple check - if multiple witnesses with different accounts
    const contradictions = witnessStatements.some((w1, i) =>
      witnessStatements.slice(i + 1).some((w2) => w1.content && w2.content && w1.content !== w2.content)
    );

    if (contradictions) {
      loopholes.push({
        id: `contradiction-${Date.now()}`,
        loopholeType: "contradiction",
        title: "Contradictory Witness Evidence",
        description: "Witness statements contradict each other on key facts, demonstrating unreliability.",
        severity: "MEDIUM",
        exploitability: "medium",
        successProbability: 55,
        suggestedAction: "Highlight contradictions in cross-examination. Argue evidence is unreliable.",
        legalArgument: `Your Honour, the prosecution witnesses cannot even agree on the basic facts of the case. This demonstrates the unreliability of the identification evidence. I submit that no reasonable jury could convict on such contradictory evidence.`,
      });
    }
  }

  // Check for missing evidence
  const hasCCTV = criminalMeta.prosecutionEvidence.some((e) => e.type === "CCTV");
  if (!hasCCTV) {
    loopholes.push({
      id: `missing-cctv-${Date.now()}`,
      loopholeType: "missing_evidence",
      title: "Missing CCTV Evidence",
      description: "No CCTV evidence from key locations. This could prove alibi or contradict prosecution case.",
      severity: "MEDIUM",
      exploitability: "medium",
      successProbability: 50,
      suggestedAction: "Request disclosure of all CCTV. Argue prosecution failed to investigate evidence that could prove innocence.",
      legalArgument: `Your Honour, the prosecution has failed to obtain CCTV evidence from key locations that could prove my client's innocence or contradict the prosecution case. This failure to investigate creates reasonable doubt.`,
    });
  }

  return loopholes;
}

/**
 * Detect disclosure failures
 */
export function detectDisclosureFailures(criminalMeta: CriminalMeta | null | undefined): Loophole[] {
  const loopholes: Loophole[] = [];

  // This would typically check against a disclosure tracker
  // For now, we'll return empty and let the disclosure tracker handle it
  // This function can be expanded when disclosure data is available

  return loopholes;
}

/**
 * Main function to detect all loopholes
 * 
 * FIX (Dec 2024): Added documents parameter and LLM fallback
 * When criminalMeta is null (e.g. defence review PDFs), fall back to analyzing raw_text
 */
export async function detectAllLoopholes(
  criminalMeta: CriminalMeta | null | undefined,
  documents?: Array<{ raw_text?: string; extracted_json?: unknown; name?: string }>,
): Promise<Loophole[]> {
  const allLoopholes: Loophole[] = [];

  // FIX: If criminalMeta is null/empty, try LLM fallback on raw text
  if (!criminalMeta && documents && documents.length > 0) {
    const rawText = documents
      .map((doc) => doc.raw_text || "")
      .filter((text) => text.length > 100) // Only use documents with substantial text
      .join("\n\n");

    if (rawText.length > 500) {
      // Use LLM to extract loopholes from raw text
      const llmLoopholes = await extractLoopholesFromText(rawText);
      allLoopholes.push(...llmLoopholes);
    }
  }

  // Detect PACE breaches
  allLoopholes.push(...detectPACEBreaches(criminalMeta));

  // Detect evidence weaknesses
  allLoopholes.push(...detectEvidenceWeaknesses(criminalMeta));

  // Detect disclosure failures
  allLoopholes.push(...detectDisclosureFailures(criminalMeta));

  return allLoopholes;
}

/**
 * LLM FALLBACK: Extract loopholes from raw text when criminalMeta is missing
 * This allows the system to work with defence review PDFs and any document type
 */
async function extractLoopholesFromText(rawText: string): Promise<Loophole[]> {
  const loopholes: Loophole[] = [];
  
  try {
    const client = getOpenAIClient();
    
    // Truncate text if too long (keep first and last parts for context)
    const maxLength = 12000;
    const textToAnalyze = rawText.length > maxLength
      ? rawText.slice(0, maxLength / 2) + "\n\n...[middle section truncated]...\n\n" + rawText.slice(-maxLength / 2)
      : rawText;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a criminal defence solicitor analyzing case documents to identify loopholes, weaknesses, and procedural errors.

Extract loopholes from the document text. Look for:
1. PACE breaches (caution not given, interview not recorded, rights not given, detention time exceeded)
2. Disclosure failures (missing CCTV, missing MG6C, late disclosure, outstanding material)
3. Evidence weaknesses (weak identification, unreliable witnesses, forensic issues, missing evidence)
4. Identification issues (Turnbull issues, distance, lighting, time, brief observation)
5. Procedural errors (abuse of process, human rights breaches, chain of custody issues)
6. Contradictions in evidence
7. Missing evidence that could prove innocence

For each loophole found, return JSON with:
- loopholeType: one of PACE_breach, procedural_error, evidence_weakness, disclosure_failure, identification_issue, contradiction, missing_evidence, chain_of_custody
- title: Short descriptive title
- description: Detailed description of the loophole
- severity: CRITICAL, HIGH, MEDIUM, or LOW
- exploitability: low, medium, or high
- successProbability: 0-100 (realistic estimate)
- suggestedAction: What action to take to exploit this loophole
- legalArgument: Ready-to-use legal argument to use

Return JSON: { "loopholes": [...] }

Be aggressive but realistic. Only extract loopholes that are genuinely present in the text.`,
        },
        {
          role: "user",
          content: `Analyze this criminal case document for loopholes and weaknesses:\n\n${textToAnalyze}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return loopholes;

    const result = JSON.parse(content);
    const extractedLoopholes = result.loopholes || [];

    // Convert LLM output to Loophole format
    for (const loophole of extractedLoopholes) {
      if (!loophole.loopholeType || !loophole.title) continue;

      loopholes.push({
        id: `loophole-llm-${loophole.loopholeType.toLowerCase()}-${Date.now()}`,
        loopholeType: loophole.loopholeType as LoopholeType,
        title: loophole.title,
        description: loophole.description || loophole.title,
        severity: (loophole.severity || "MEDIUM") as Loophole["severity"],
        exploitability: (loophole.exploitability || "medium") as Loophole["exploitability"],
        successProbability: Math.min(100, Math.max(0, loophole.successProbability || 50)),
        suggestedAction: loophole.suggestedAction || "Review case documents and identify exploitation strategy",
        legalArgument: loophole.legalArgument || null,
      });
    }
  } catch (error) {
    console.error("[loophole-detector] LLM fallback error:", error);
    // Don't throw - return empty array so system can continue
  }

  return loopholes;
}

