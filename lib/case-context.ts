/**
 * Case Context Builder
 * 
 * Single source of truth for case + documents + diagnostics.
 * All routes should use this instead of doing their own lookups.
 * 
 * NON-NEGOTIABLES:
 * - Never query documents with a different org_id than the case's resolved org_id
 * - If case cannot be found in resolved scope, return banner + reasonCode and stop
 * - Facts-first, strategy-second: never generate strategy if Key Facts inputs are missing/thin
 */

import "server-only";
import { getOrgScopeOrFallback, findCaseByIdScoped, findDocumentsByCaseIdScoped } from "@/lib/db/case-lookup";
import type { OrgScope, CaseRow } from "@/lib/db/case-lookup";

export type CaseContext = {
  case: CaseRow | null;
  orgScope: {
    orgIdResolved: string; // The actual org_id to use for queries
    method: "org_uuid" | "solo_fallback" | "owner_override"; // How org_id was resolved
  };
  documents: Array<{
    id: string;
    name: string;
    created_at: string;
    raw_text?: string;
    extracted_json?: unknown;
  }>;
  diagnostics: {
    docCount: number;
    rawCharsTotal: number;
    jsonCharsTotal: number;
    avgRawCharsPerDoc: number;
    suspectedScanned: boolean; // true if docs exist but rawCharsTotal < 800 and jsonCharsTotal < 400
    reasonCodes: string[]; // CASE_NOT_FOUND, DOCS_NONE, TEXT_THIN, SCANNED_SUSPECTED, OK
  };
  canGenerateAnalysis: boolean; // false if rawCharsTotal === 0 OR suspectedScanned OR textThin
  banner?: {
    severity: "warning" | "error" | "info";
    title?: string;
    message: string;
  };
};

export type AuthContext = {
  userId: string;
};

/**
 * Build canonical case context - the ONLY place that resolves org scope + case + documents
 * 
 * Deterministic behavior: same inputs -> same outputs
 * Never queries documents with different org_id than case's resolved org_id
 */
export async function buildCaseContext(
  caseId: string,
  authContext: AuthContext,
): Promise<CaseContext> {
  const reasonCodes: string[] = [];

  // 1. Resolve org scope
  const orgScope = await getOrgScopeOrFallback(authContext.userId);
  
  // Determine resolution method
  let method: "org_uuid" | "solo_fallback" | "owner_override" = "solo_fallback";
  if (orgScope.orgId) {
    method = "org_uuid";
  }

  // 2. Find case with scoped lookup
  const caseRow = await findCaseByIdScoped(caseId, orgScope);

  if (!caseRow) {
    reasonCodes.push("CASE_NOT_FOUND");
    const orgIdResolved = orgScope.orgId || orgScope.externalRef || "";
    
    return {
      case: null,
      orgScope: {
        orgIdResolved,
        method,
      },
      documents: [],
      diagnostics: {
        docCount: 0,
        rawCharsTotal: 0,
        jsonCharsTotal: 0,
        avgRawCharsPerDoc: 0,
        suspectedScanned: false,
        reasonCodes: ["CASE_NOT_FOUND"],
      },
      canGenerateAnalysis: false,
      banner: {
        severity: "error",
        title: "Case not found",
        message: "Case not found for your org scope. This may be due to an org_id mismatch. Re-upload or contact support.",
      },
    };
  }

  // 3. Resolve the actual org_id to use (from case or scope fallback)
  // Never query documents with different org_id than case's resolved org_id
  const orgIdResolved = caseRow.org_id || orgScope.orgId || orgScope.externalRef || "";
  
  // If case has org_id that matches orgScope.orgId, use "org_uuid"
  // If case has org_id that matches orgScope.externalRef, use "solo_fallback"
  // If case has org_id that doesn't match either, use "owner_override" (edge case)
  if (caseRow.org_id === orgScope.orgId) {
    method = "org_uuid";
  } else if (caseRow.org_id === orgScope.externalRef) {
    method = "solo_fallback";
  } else if (caseRow.org_id && caseRow.org_id !== orgScope.orgId && caseRow.org_id !== orgScope.externalRef) {
    method = "owner_override";
  }

  // 4. Find documents with scoped lookup (pass case's org_id as fallback)
  // This ensures documents use SAME org_id as case
  const documents = await findDocumentsByCaseIdScoped(caseId, orgScope, caseRow.org_id);

  if (documents.length === 0) {
    reasonCodes.push("DOCS_NONE");
  }

  // 5. Compute diagnostics
  let rawCharsTotal = 0;
  let jsonCharsTotal = 0;

  for (const doc of documents) {
    const rawText = doc.raw_text ?? "";
    const textLength = typeof rawText === "string" ? rawText.length : 0;
    rawCharsTotal += textLength;

    const extractedJson = doc.extracted_json;
    if (extractedJson) {
      try {
        const jsonStr = typeof extractedJson === "string" ? extractedJson : JSON.stringify(extractedJson);
        jsonCharsTotal += jsonStr.length;
      } catch {
        // Ignore JSON stringify errors
      }
    }

    // Debug logging: print extraction char counts and preview (capped in production)
    const previewLength = process.env.NODE_ENV === "production" ? 200 : 500;
    const preview = typeof rawText === "string" && rawText.length > 0 
      ? rawText.substring(0, previewLength).replace(/\n/g, " ") 
      : "[EMPTY]";
    if (process.env.NODE_ENV !== "production" || textLength > 0) {
      console.log(`[case-context] docId=${doc.id}, name=${doc.name}, rawChars=${textLength}, jsonChars=${extractedJson ? (typeof extractedJson === "string" ? extractedJson.length : JSON.stringify(extractedJson).length) : 0}, preview="${preview}"`);
    }
  }

  const docCount = documents.length;
  const avgRawCharsPerDoc = docCount > 0 ? Math.floor(rawCharsTotal / docCount) : 0;
  
  // Suspect scanned if very low character counts (threshold: rawCharsTotal < 800 and jsonCharsTotal < 400)
  const suspectedScanned = docCount > 0 && rawCharsTotal < 800 && jsonCharsTotal < 400;
  const textThin = docCount > 0 && rawCharsTotal < 800;

  if (suspectedScanned) {
    reasonCodes.push("SCANNED_SUSPECTED");
  } else if (textThin) {
    reasonCodes.push("TEXT_THIN");
  }

  // If no issues found, mark as OK
  if (reasonCodes.length === 0 && docCount > 0) {
    reasonCodes.push("OK");
  } else if (reasonCodes.length === 0 && docCount === 0) {
    // This shouldn't happen (DOCS_NONE should be set above), but safety check
    reasonCodes.push("DOCS_NONE");
  }

  // Determine if analysis can be generated
  // NEVER generate analysis if: no text, suspected scanned, or text too thin
  const canGenerateAnalysis = 
    rawCharsTotal > 0 && 
    !suspectedScanned && 
    !textThin && 
    reasonCodes.includes("OK");

  // Build banner based on reason codes
  let banner: CaseContext["banner"] | undefined;
  if (reasonCodes.includes("CASE_NOT_FOUND")) {
    banner = {
      severity: "error",
      title: "Case not found",
      message: "Case not found for your org scope. This may be due to an org_id mismatch. Re-upload or contact support.",
    };
  } else if (reasonCodes.includes("DOCS_NONE")) {
    banner = {
      severity: "info",
      title: "No documents found",
      message: "No documents found for this case. Upload documents to generate full analysis.",
    };
  } else if (reasonCodes.includes("SCANNED_SUSPECTED")) {
    banner = {
      severity: "warning",
      title: "No extractable text detected",
      message: "This PDF appears scanned/image-only. Upload a text-based PDF or run OCR, then re-analyse.",
    };
  } else if (reasonCodes.includes("TEXT_THIN")) {
    banner = {
      severity: "warning",
      title: "Insufficient text extracted",
      message: "Very little text was extracted from the documents. Upload text-based PDFs or run OCR for better analysis.",
    };
  }

  // Log reason codes and summary diagnostics for debugging
  console.log(`[case-context] caseId=${caseId}, method=${method}, reasonCodes=[${reasonCodes.join(", ")}], docCount=${docCount}, rawCharsTotal=${rawCharsTotal}, jsonCharsTotal=${jsonCharsTotal}, avgRawCharsPerDoc=${avgRawCharsPerDoc}, suspectedScanned=${suspectedScanned}`);

  return {
    case: caseRow,
    orgScope: {
      orgIdResolved,
      method,
    },
    documents,
    diagnostics: {
      docCount,
      rawCharsTotal,
      jsonCharsTotal,
      avgRawCharsPerDoc,
      suspectedScanned,
      reasonCodes,
    },
    canGenerateAnalysis,
    banner,
  };
}

/**
 * Guard function to check if analysis can be generated from context
 * Throws an error with banner info if analysis cannot be generated
 * Use this in routes to ensure consistent gating
 */
export function guardAnalysis(context: CaseContext): void {
  if (!context.canGenerateAnalysis) {
    const banner = context.banner || {
      severity: "warning" as const,
      title: "Insufficient text extracted",
      message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
    };
    throw new AnalysisGateError(banner, context.diagnostics);
  }
}

/**
 * Error class for analysis gating
 * Contains banner and diagnostics for consistent error responses
 */
export class AnalysisGateError extends Error {
  constructor(
    public banner: CaseContext["banner"],
    public diagnostics: CaseContext["diagnostics"],
  ) {
    super(banner?.message || "Analysis cannot be generated");
    this.name = "AnalysisGateError";
  }
}

