/**
 * Clause Red-Flag Detector
 * 
 * Analyses documents for dangerous clauses, unfair terms, hidden risks,
 * and red-flag obligations in contracts, leases, and agreements.
 */

import { getSupabaseAdminClient } from "./supabase";
import { getOpenAIClient } from "./openai";
import type {
  ClauseRedFlag,
  ClauseRedFlagSummary,
  ClauseRedFlagCategory,
} from "./types/casebrain";

// Categories and their detection patterns
const CATEGORY_PATTERNS: Record<ClauseRedFlagCategory, string[]> = {
  repair_obligation: [
    "tenant shall repair", "repair and maintain", "keep in repair",
    "responsible for repairs", "maintenance obligation", "repair covenant",
  ],
  break_clause: [
    "break clause", "early termination", "terminate this agreement",
    "break the lease", "notice to quit",
  ],
  rent_increase: [
    "rent review", "rent increase", "annual increase", "market rent",
    "adjustment of rent", "rental increase",
  ],
  unfair_term: [
    "notwithstanding", "regardless of", "irrevocable", "unconditional",
    "sole discretion", "without limitation",
  ],
  liability_cap: [
    "limit of liability", "liability cap", "maximum liability",
    "aggregate liability", "exclude liability",
  ],
  indemnity: [
    "indemnify", "hold harmless", "indemnification", "save harmless",
    "defend and indemnify",
  ],
  notice_requirement: [
    "notice period", "written notice", "days notice", "prior notice",
    "notice must be", "notice shall be",
  ],
  missing_signature: [
    "signature required", "unsigned", "not signed", "witness signature",
  ],
  inconsistent_term: [
    "notwithstanding the foregoing", "subject to", "except as",
  ],
  exclusion_clause: [
    "exclude", "excluding", "excluded", "does not include",
    "shall not be liable", "no liability",
  ],
  service_requirement: [
    "service charge", "service costs", "services provided",
    "maintenance charge", "reserve fund",
  ],
  other: [],
};

/**
 * Analyse a document for red flags
 */
export async function analyseDocumentForRedFlags(
  caseId: string,
  documentId: string,
  text: string,
  documentName: string,
): Promise<ClauseRedFlagSummary> {
  const redFlags: ClauseRedFlag[] = [];

  // Step 1: Quick pattern-based detection
  const patternFlags = detectPatternBasedFlags(caseId, documentId, text);
  redFlags.push(...patternFlags);

  // Step 2: AI-powered deep analysis for complex clauses
  const aiFlags = await analyseWithAI(caseId, documentId, text);
  redFlags.push(...aiFlags);

  // Deduplicate by clause text similarity
  const uniqueFlags = deduplicateFlags(redFlags);

  // Count by severity
  const totalCritical = uniqueFlags.filter(f => f.severity === "critical").length;
  const totalHigh = uniqueFlags.filter(f => f.severity === "high").length;
  const totalMedium = uniqueFlags.filter(f => f.severity === "medium").length;
  const totalLow = uniqueFlags.filter(f => f.severity === "low").length;

  return {
    caseId,
    documentId,
    documentName,
    redFlags: uniqueFlags,
    totalCritical,
    totalHigh,
    totalMedium,
    totalLow,
    analysedAt: new Date().toISOString(),
  };
}

/**
 * Pattern-based detection for common red flag terms
 */
function detectPatternBasedFlags(
  caseId: string,
  documentId: string,
  text: string,
): ClauseRedFlag[] {
  const flags: ClauseRedFlag[] = [];
  const lowerText = text.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === "other") continue;

    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();
      
      // Find sentences containing the pattern
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(lowerPattern)) {
          const severity = determineSeverity(category as ClauseRedFlagCategory, sentence);
          
          flags.push({
            id: `${documentId}-${category}-${flags.length}`,
            caseId,
            documentId,
            category: category as ClauseRedFlagCategory,
            clauseText: sentence.trim().slice(0, 500),
            explanation: getExplanation(category as ClauseRedFlagCategory),
            severity,
          });
          break; // One match per pattern per category is enough
        }
      }
    }
  }

  return flags;
}

/**
 * AI-powered analysis for complex clause detection
 */
async function analyseWithAI(
  caseId: string,
  documentId: string,
  text: string,
): Promise<ClauseRedFlag[]> {
  // Only use AI for longer documents where pattern matching may miss nuance
  if (text.length < 500) return [];

  try {
    const client = getOpenAIClient();

    // Take a representative sample for efficiency
    const sampleText = text.length > 8000 
      ? text.slice(0, 4000) + "\n...[truncated]...\n" + text.slice(-4000)
      : text;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a legal document analyst specializing in identifying dangerous clauses, unfair terms, and red-flag provisions in contracts and legal documents.

Analyse the document and identify any clauses that could be problematic. For each issue found, provide:
- category: one of: repair_obligation, break_clause, rent_increase, unfair_term, liability_cap, indemnity, notice_requirement, missing_signature, inconsistent_term, exclusion_clause, service_requirement, other
- clauseText: the exact text of the problematic clause (max 300 chars)
- explanation: why this is a red flag (max 150 chars)
- severity: low, medium, high, or critical

Return JSON: { "flags": [...] }

Focus on:
- Unfair terms under Consumer Rights Act
- Onerous repair obligations
- Hidden costs or charges
- Unusual notice requirements
- Liability exclusions
- Indemnity clauses
- Break clause restrictions
- Service charge provisions

Be conservative - only flag genuinely concerning clauses.`,
        },
        {
          role: "user",
          content: `Analyse this document for dangerous clauses:\n\n${sampleText}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const result = JSON.parse(content);
    const flags: ClauseRedFlag[] = [];

    if (Array.isArray(result.flags)) {
      for (const flag of result.flags) {
        if (flag.category && flag.clauseText && flag.explanation) {
          flags.push({
            id: `${documentId}-ai-${flags.length}`,
            caseId,
            documentId,
            category: validateCategory(flag.category),
            clauseText: String(flag.clauseText).slice(0, 500),
            explanation: String(flag.explanation).slice(0, 200),
            severity: validateSeverity(flag.severity),
          });
        }
      }
    }

    return flags;
  } catch (error) {
    console.error("AI clause analysis failed:", error);
    return [];
  }
}

/**
 * Determine severity based on category and content
 */
function determineSeverity(
  category: ClauseRedFlagCategory,
  clauseText: string,
): "low" | "medium" | "high" | "critical" {
  const text = clauseText.toLowerCase();

  // Critical patterns
  if (text.includes("unconditional") || text.includes("irrevocable")) {
    return "critical";
  }
  if (text.includes("unlimited liability") || text.includes("all costs")) {
    return "critical";
  }

  // High severity categories
  if (category === "indemnity" || category === "liability_cap") {
    return "high";
  }
  if (category === "unfair_term" || category === "exclusion_clause") {
    return "high";
  }

  // Medium severity
  if (category === "repair_obligation" || category === "notice_requirement") {
    return "medium";
  }
  if (category === "service_requirement" || category === "rent_increase") {
    return "medium";
  }

  // Low severity
  return "low";
}

/**
 * Get explanation for a category
 */
function getExplanation(category: ClauseRedFlagCategory): string {
  const explanations: Record<ClauseRedFlagCategory, string> = {
    repair_obligation: "This clause may impose significant repair responsibilities on the tenant.",
    break_clause: "Break clause conditions may restrict early termination rights.",
    rent_increase: "This clause allows for rent increases that may be above market rate.",
    unfair_term: "This term may be unenforceable under the Consumer Rights Act 2015.",
    liability_cap: "Liability limitations may restrict recovery in case of breach.",
    indemnity: "Indemnity clauses can create significant financial exposure.",
    notice_requirement: "Notice requirements may be onerous or easily missed.",
    missing_signature: "Document appears to lack required signatures or witnessing.",
    inconsistent_term: "This term may conflict with other provisions in the document.",
    exclusion_clause: "Exclusion clauses may limit important rights or remedies.",
    service_requirement: "Service charge provisions may lead to unexpected costs.",
    other: "This clause requires careful review.",
  };

  return explanations[category];
}

/**
 * Validate category from AI response
 */
function validateCategory(category: string): ClauseRedFlagCategory {
  const valid: ClauseRedFlagCategory[] = [
    "repair_obligation", "break_clause", "rent_increase", "unfair_term",
    "liability_cap", "indemnity", "notice_requirement", "missing_signature",
    "inconsistent_term", "exclusion_clause", "service_requirement", "other",
  ];

  return valid.includes(category as ClauseRedFlagCategory)
    ? (category as ClauseRedFlagCategory)
    : "other";
}

/**
 * Validate severity from AI response
 */
function validateSeverity(severity: string): "low" | "medium" | "high" | "critical" {
  const valid = ["low", "medium", "high", "critical"];
  return valid.includes(severity) ? (severity as "low" | "medium" | "high" | "critical") : "medium";
}

/**
 * Deduplicate flags by similar clause text
 */
function deduplicateFlags(flags: ClauseRedFlag[]): ClauseRedFlag[] {
  const seen = new Set<string>();
  const unique: ClauseRedFlag[] = [];

  for (const flag of flags) {
    // Create a normalized key from the first 100 chars
    const key = flag.clauseText.toLowerCase().slice(0, 100).replace(/\s+/g, " ");
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(flag);
    }
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return unique;
}

/**
 * Get stored red flags for a document
 */
export async function getDocumentRedFlags(
  caseId: string,
  documentId: string,
): Promise<ClauseRedFlagSummary | null> {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("documents")
    .select("id, name, red_flags_json")
    .eq("id", documentId)
    .eq("case_id", caseId)
    .single();

  if (!data?.red_flags_json) return null;

  return data.red_flags_json as ClauseRedFlagSummary;
}

/**
 * Store red flags for a document
 */
export async function storeDocumentRedFlags(
  documentId: string,
  summary: ClauseRedFlagSummary,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  await supabase
    .from("documents")
    .update({ red_flags_json: summary })
    .eq("id", documentId);
}

