import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";
import { extractCriminalCaseMeta } from "@/lib/criminal/structured-extractor";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/charges
 * Fetch all charges for the case
 * If DB table is empty, extracts from raw_text using buildCaseContext (same as Evidence Strength Analyzer)
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    // Build case context (same source as Evidence Strength Analyzer)
    const context = await buildCaseContext(caseId, { userId });
    
    try {
      guardAnalysis(context);
    } catch (error) {
      if (error instanceof AnalysisGateError) {
        return NextResponse.json({
          ok: false,
          charges: [],
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
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
      return NextResponse.json({ error: "Failed to fetch charges" }, { status: 500 });
    }
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
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

      if (combinedText.length > 500) {
        // Extract charges from raw text
        const meta = extractCriminalCaseMeta({
          text: combinedText,
          documentName: "Combined Bundle",
          now: new Date(),
        });

        // Convert extracted charges to response format
        charges = meta.charges.map((c, idx) => ({
          id: `extracted-${idx}`,
          offence: c.offence,
          section: c.statute,
          chargeDate: c.chargeDate,
          location: c.location,
          value: null,
          details: null,
          status: c.status,
          extracted: true, // Flag to indicate this was extracted, not from DB
        }));
      }
    }

    if (error && (!charges || charges.length === 0)) {
      console.error("[criminal/charges] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch charges" },
        { status: 500 },
      );
    }

    return NextResponse.json({
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
      })),
    });
  } catch (error) {
    console.error("[criminal/charges] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch charges" },
      { status: 500 },
    );
  }
}

