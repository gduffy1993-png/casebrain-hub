"use server";

import type { ExtractedCaseFacts } from "@/types";
import { extractCaseFacts } from "@/lib/ai";

/**
 * Core Litigation Brain - Evidence Extraction
 * 
 * Extracts structured facts from evidence with source tracing.
 * This is the shared extraction engine used by all case-type modules.
 */
export type ExtractionResult = {
  facts: ExtractedCaseFacts;
  confidence: "high" | "medium" | "low";
  sources: Array<{
    documentId: string;
    documentName: string;
    extractedFields: string[];
    confidence: "high" | "medium" | "low";
  }>;
  uncertainties: string[];
};

export async function extractEvidence(
  documentText: string,
  documentName: string,
  documentId: string,
  orgId: string,
): Promise<ExtractionResult> {
  try {
    // Validate inputs
    if (!documentText || typeof documentText !== "string") {
      throw new Error("Invalid document text provided");
    }
    if (!documentId || !orgId) {
      throw new Error("Missing required parameters");
    }

    const facts = await extractCaseFacts({
      documentText,
      documentName: documentName || "Unknown document",
      orgId,
    });

    // Ensure facts has all required fields with safe defaults
    const safeFacts: ExtractedCaseFacts = {
      summary: facts?.summary || "",
      parties: Array.isArray(facts?.parties) ? facts.parties : [],
      dates: Array.isArray(facts?.dates) ? facts.dates : [],
      amounts: Array.isArray(facts?.amounts) ? facts.amounts : [],
      timeline: Array.isArray(facts?.timeline) ? facts.timeline : [],
      keyIssues: Array.isArray(facts?.keyIssues) ? facts.keyIssues : [],
      claimType: facts?.claimType || "unknown",
      housingMeta: facts?.housingMeta,
      piMeta: facts?.piMeta,
    };

    // Determine overall confidence based on data completeness
    let confidence: "high" | "medium" | "low" = "high";
    const uncertainties: string[] = [];

    if (!safeFacts.parties.length) {
      confidence = "low";
      uncertainties.push("No parties identified");
    }
    if (!safeFacts.dates.length) {
      confidence = confidence === "high" ? "medium" : "low";
      uncertainties.push("No key dates identified");
    }
    if (!safeFacts.summary || safeFacts.summary.length < 50) {
      confidence = confidence === "high" ? "medium" : "low";
      uncertainties.push("Summary may be incomplete");
    }

    return {
      facts: safeFacts,
      confidence,
      sources: [
        {
          documentId,
          documentName: documentName || "Unknown document",
          extractedFields: [
            ...(safeFacts.parties.length ? ["parties"] : []),
            ...(safeFacts.dates.length ? ["dates"] : []),
            ...(safeFacts.amounts.length ? ["amounts"] : []),
            ...(safeFacts.timeline.length ? ["timeline"] : []),
            ...(safeFacts.keyIssues.length ? ["keyIssues"] : []),
          ],
          confidence,
        },
      ],
      uncertainties,
    };
  } catch (error) {
    // Return safe fallback on any error
    console.error(`[extraction] Failed to extract evidence from ${documentName}:`, error);
    return {
      facts: {
        summary: `Extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        parties: [],
        dates: [],
        amounts: [],
        timeline: [],
        keyIssues: [],
        claimType: "unknown",
      },
      confidence: "low",
      sources: [
        {
          documentId,
          documentName: documentName || "Unknown document",
          extractedFields: [],
          confidence: "low",
        },
      ],
      uncertainties: [
        `Extraction encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}

