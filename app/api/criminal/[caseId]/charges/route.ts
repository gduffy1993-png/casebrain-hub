import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseContext } from "@/lib/case-context";
import { extractCriminalCaseMeta } from "@/lib/criminal/structured-extractor";
import { makeOk, makeGateFail, makeNotFound, makeError, type ApiResponse } from "@/lib/api/response";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/charges
 * Fetch all charges for the case
 * If DB table is empty, extracts from raw_text using buildCaseContext (same as Evidence Strength Analyzer)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { caseId } = await params;
  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    // Build case context (same source as Evidence Strength Analyzer)
    const context = await buildCaseContext(caseId, { userId });

    if (!context.case) {
      return makeNotFound<{ charges: any[] }>(context, caseId);
    }

    // Check analysis gate (hard gating)
    const gateResult = checkAnalysisGate(context);
    if (!gateResult.ok) {
      return makeGateFail<{ charges: any[] }>(
        {
          severity: gateResult.banner?.severity || "warning",
          title: gateResult.banner?.title || "Insufficient text extracted",
          detail: gateResult.banner?.detail,
        },
        context,
        caseId,
      );
    }

    // Verify case access
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError) {
      console.error("[criminal/charges] Case lookup error:", caseError);
      return makeError<{ charges: any[] }>(
        "CHARGES_ERROR",
        "Failed to fetch charges",
        context,
        caseId,
      );
    }
    if (!caseRecord) {
      return makeNotFound<{ charges: any[] }>(context, caseId);
    }

    // Fetch charges from DB (prefer org_id filter if it works; fall back to case_id only)
    let charges: any[] | null = null;
    let error: any = null;

    const withOrg = await supabase
      .from("criminal_charges")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("charge_date", { ascending: false });

    if (!withOrg.error) {
      charges = withOrg.data ?? [];
    } else {
      const withoutOrg = await supabase
        .from("criminal_charges")
        .select("*")
        .eq("case_id", caseId)
        .order("charge_date", { ascending: false });
      charges = withoutOrg.data ?? [];
      error = withoutOrg.error ?? withOrg.error;
    }

    // If DB table is empty, extract from raw_text (same approach as Evidence Strength Analyzer)
    if ((!charges || charges.length === 0) && context.documents.length > 0) {
      // Combine all raw_text from documents
      let combinedText = "";
      for (const doc of context.documents) {
        if (doc.raw_text && typeof doc.raw_text === "string" && doc.raw_text.length > 0) {
          combinedText += " " + doc.raw_text;
        }
      }

      if (combinedText.length > 100) {
        // Try structured extraction first
        const meta = extractCriminalCaseMeta({
          text: combinedText,
          documentName: "Combined Bundle",
          now: new Date(),
        });

        if (meta.charges.length > 0) {
          // Convert extracted charges to response format
          charges = meta.charges.map((c, idx) => ({
            id: `extracted-${idx}`,
            offence: c.offence,
            section: c.statute,
            chargeDate: c.chargeDate,
            location: c.location,
            value: null,
            details: null,
            status: c.status || "pending",
            extracted: true,
            confidence: c.confidence,
          }));
        } else {
          // Conservative fallback: parse ONLY explicit statute/section strings from document text
          // RULE: A valid extracted charge MUST include explicit section number (e.g. s18, s.20, section 18)
          // Statute-only mentions (e.g. "Offences Against the Person Act 1861") MUST NOT create a charge row
          const chargePatterns: Array<{ pattern: RegExp; offence: string; section: string }> = [
            // OAPA 1861 patterns - ONLY patterns with explicit section numbers
            { pattern: /\bs\.?\s*18\b/i, offence: "Wounding with intent (OAPA 1861)", section: "s18" },
            { pattern: /\bsection\s+18\b/i, offence: "Wounding with intent (OAPA 1861)", section: "s18" },
            { pattern: /\bs\.?\s*20\b/i, offence: "Unlawful wounding (OAPA 1861)", section: "s20" },
            { pattern: /\bsection\s+20\b/i, offence: "Unlawful wounding (OAPA 1861)", section: "s20" },
            // Theft Act patterns - ONLY patterns with explicit section numbers
            { pattern: /\bs\.?\s*1\b.*\btheft\b/i, offence: "Theft (Theft Act 1968)", section: "s1" },
            { pattern: /\bsection\s+1\b.*\btheft\b/i, offence: "Theft (Theft Act 1968)", section: "s1" },
          ];

          const foundCharges: Array<{ offence: string; section: string; altSection?: string }> = [];
          
          for (const { pattern, offence, section } of chargePatterns) {
            if (pattern.test(combinedText)) {
              // Check for "Alt:" variants (e.g., "s18 (Alt: s.20)")
              const altMatch = combinedText.match(/\b(?:alt|alternative):\s*(?:s\.?|section)\s*(\d+)\b/i);
              const altSection = altMatch ? `s${altMatch[1]}` : undefined;
              
              // Avoid duplicates
              const existing = foundCharges.find(c => 
                c.offence === offence && c.section === section
              );
              if (!existing) {
                foundCharges.push({ offence, section, altSection });
              }
            }
          }

          // RULE: Only create charges if explicit section numbers found
          // All fallback charges must remain: source: AUTO_EXTRACTED, confidence: LOW, status: pending
          if (foundCharges.length > 0) {
            charges = foundCharges.map((c, idx) => ({
              id: `fallback-${idx}`,
              offence: c.altSection ? `${c.offence} (Alt: ${c.altSection})` : c.offence,
              section: c.section,
              chargeDate: null,
              location: null,
              value: null,
              details: null,
              status: "pending",
              extracted: true,
              confidence: 0.3, // LOW confidence for fallback extraction
              source: "AUTO_EXTRACTED", // Flag for fallback
            }));
          }
        }
      }
    }

    if (error && (!charges || charges.length === 0)) {
      console.error("[criminal/charges] Error:", error);
      return makeError<{ charges: any[] }>(
        "CHARGES_ERROR",
        "Failed to fetch charges",
        context,
        caseId,
      );
    }

    return makeOk(
      {
        charges: (charges || []).map((c) => ({
          id: c.id,
          offence: c.offence,
          section: c.section,
          chargeDate: c.chargeDate || c.charge_date,
          location: c.location,
          value: c.value,
          details: c.details,
          status: c.status,
          extracted: c.extracted || false,
          confidence: c.confidence ?? null, // Include confidence if available
        })),
      },
      context,
      caseId,
    );
  } catch (error) {
    console.error("[criminal/charges] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch charges";
    try {
      const authRes = await requireAuthContextApi();
      if (authRes.ok) {
        const { userId } = authRes.context;
        const context = await buildCaseContext(caseId, { userId });
        return makeError<{ charges: any[] }>("CHARGES_ERROR", errorMessage, context, caseId);
      }
    } catch {
      // Fallback
    }
    return makeError<{ charges: any[] }>(
      "CHARGES_ERROR",
      errorMessage,
      {
        case: null,
        orgScope: { orgIdResolved: "", method: "solo_fallback" },
        documents: [],
        diagnostics: {
          docCount: 0,
          rawCharsTotal: 0,
          jsonCharsTotal: 0,
          avgRawCharsPerDoc: 0,
          suspectedScanned: false,
          reasonCodes: [],
        },
        canGenerateAnalysis: false,
      },
      caseId,
    );
  }
}

