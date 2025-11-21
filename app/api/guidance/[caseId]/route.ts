import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateGuidance } from "@/lib/core/guidance";
import type { ExtractedCaseFacts } from "@/types";

export const runtime = "nodejs";

/**
 * Core Litigation Brain - Litigation Guidance API
 * 
 * Provides stage assessment and procedural guidance.
 */
export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("extracted_json")
      .eq("case_id", caseId)
      .limit(1),
  ]);

  if (!caseRecord || !documents || documents.length === 0) {
    return NextResponse.json(
      { error: "Case or evidence not found" },
      { status: 404 },
    );
  }

  const extracted = documents[0].extracted_json as ExtractedCaseFacts | null;
  if (!extracted) {
    return NextResponse.json(
      { error: "No extracted facts available" },
      { status: 404 },
    );
  }

  const guidance = generateGuidance(
    extracted,
    extracted.timeline ?? [], // Fallback to empty array if timeline is missing
    caseRecord.practice_area ?? undefined,
  );

  // Serialize Date objects to ISO strings for JSON response
  const serializedGuidance = {
    ...guidance,
    nextSteps: guidance.nextSteps.map((step) => ({
      ...step,
      deadline: step.deadline ? step.deadline.toISOString() : undefined,
    })),
  };

  return NextResponse.json(serializedGuidance);
}

