/**
 * Re-extract API Route
 * 
 * Allows re-running extraction and Awaab Law detection on a case
 * Useful when PDF extraction failed or housing metadata is missing
 */

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildRiskAlerts } from "@/lib/core/risk-alerts";
import { inferAwaabRisks } from "@/lib/housing/awaab-inferred";
import type { ExtractedCaseFacts } from "@/types/case";
import type { PracticeArea } from "@/lib/types/casebrain";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    // Fetch case
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Fetch all documents with extracted_json
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    // Extract structured facts
    const extractedFacts: ExtractedCaseFacts[] = [];
    for (const doc of documents ?? []) {
      if (doc.extracted_json && typeof doc.extracted_json === "object") {
        const extracted = doc.extracted_json as ExtractedCaseFacts;
        if (extracted.summary || extracted.parties || extracted.dates || extracted.keyIssues) {
          extractedFacts.push(extracted);
        }
      }
    }

    // For housing cases, run Awaab Law detection and update housing case
    if (caseRecord.practice_area === "housing_disrepair") {
      const { data: housingCase } = await supabase
        .from("housing_cases")
        .select("first_report_date, landlord_type")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();

      const isSocialLandlord = housingCase?.landlord_type === "social" || 
                               housingCase?.landlord_type === "council";
      const firstComplaintDate = housingCase?.first_report_date 
        ? new Date(housingCase.first_report_date)
        : undefined;

      // Run Awaab Law detection
      const awaabRisks = inferAwaabRisks(
        caseId,
        extractedFacts,
        extractedFacts[0]?.housingMeta,
        firstComplaintDate,
        isSocialLandlord ?? true, // Default to true if unknown
      );

      // Store risk flags
      if (awaabRisks.length > 0) {
        const riskFlags = awaabRisks.map(risk => ({
          id: risk.id,
          case_id: caseId,
          flag_type: "awaabs_law",
          severity: risk.severity.toLowerCase(),
          description: risk.description,
          resolved: false,
          detected_at: new Date().toISOString(),
        }));

        await supabase
          .from("risk_flags")
          .upsert(riskFlags, { onConflict: "id" });
      }

      // Build full risk alerts
      await buildRiskAlerts({
        caseId,
        orgId,
        practiceArea: caseRecord.practice_area as PracticeArea,
        extractedFacts,
        housingMeta: extractedFacts[0]?.housingMeta,
        firstComplaintDate,
        isSocialLandlord: isSocialLandlord ?? true,
      });
    }

    return NextResponse.json({ 
      success: true,
      extractedFactsCount: extractedFacts.length,
      message: "Re-extraction completed. Awaab Law risks detected and stored.",
    });
  } catch (error) {
    console.error("[re-extract] Error:", error);
    return NextResponse.json(
      { error: "Failed to re-extract case data" },
      { status: 500 }
    );
  }
}

