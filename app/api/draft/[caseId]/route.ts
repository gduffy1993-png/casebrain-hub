import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getTemplate, extractTemplateVariables, renderTemplate } from "@/lib/core/drafting";
import type { ExtractedCaseFacts } from "@/types";

export const runtime = "nodejs";

/**
 * Core Litigation Brain - Drafting Generator API
 * 
 * Auto-populates templates with extracted facts.
 */
export async function POST(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const body = await request.json();
  const { templateCode } = body as { templateCode: string };

  if (!templateCode) {
    return NextResponse.json(
      { error: "templateCode is required" },
      { status: 400 },
    );
  }

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

  const template = await getTemplate(
    templateCode,
    orgId,
    caseRecord.practice_area ?? undefined,
  );

  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 },
    );
  }

  const variables = extractTemplateVariables(extracted, template.variables);
  const draft = renderTemplate(template.body, variables);

  return NextResponse.json(draft);
}

