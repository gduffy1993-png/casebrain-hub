/**
 * GET /api/criminal/[caseId]/aggressive-defense
 * 
 * Returns aggressive defense analysis - finds EVERY possible angle to win
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllDefenseAngles } from "@/lib/criminal/aggressive-defense-engine";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    // Verify case access
    const supabase = getSupabaseAdminClient();
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRecord || caseRecord.practice_area !== "criminal") {
      return NextResponse.json({ error: "Case not found or not a criminal case" }, { status: 404 });
    }

    // Get criminal case data
    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!criminalCase) {
      return NextResponse.json({ error: "Criminal case data not found" }, { status: 404 });
    }

    // Get extracted facts (contains criminalMeta)
    const { data: documents } = await supabase
      .from("documents")
      .select("extracted_facts")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .limit(1)
      .single();

    let criminalMeta = null;
    if (documents?.extracted_facts) {
      const facts = typeof documents.extracted_facts === "string" 
        ? JSON.parse(documents.extracted_facts) 
        : documents.extracted_facts;
      criminalMeta = facts.criminalMeta || null;
    }

    // Get aggressive defense analysis
    const analysis = await findAllDefenseAngles(criminalMeta, caseId);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Failed to generate aggressive defense analysis:", error);
    return NextResponse.json(
      { error: "Failed to generate aggressive defense analysis" },
      { status: 500 },
    );
  }
}

