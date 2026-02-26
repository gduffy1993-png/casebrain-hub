/**
 * GET /api/cases/[caseId]/documents
 * 
 * Returns all documents for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;

    const supabase = getSupabaseAdminClient();

    // Verify case access and get case's org_id (single source: documents = what Case Files shows = what strategy reads)
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 },
      );
    }

    const documentOrgId = (caseRecord as { org_id?: string }).org_id ?? orgId;

    // Get documents by case's org_id so list matches upload and strategy pipeline
    // Include raw_text only to compute extraction status; do not send to client
    const { data: rows, error: docsError } = await supabase
      .from("documents")
      .select("id, name, type, created_at, raw_text")
      .eq("case_id", caseId)
      .eq("org_id", documentOrgId)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("[documents] Error fetching documents:", docsError);
      return NextResponse.json(
        { error: "Failed to load documents" },
        { status: 500 },
      );
    }

    const documents = (rows ?? []).map((row: { id: string; name: string; type?: string; created_at: string; raw_text?: string | null }) => {
      const rawText = row.raw_text;
      const hasText = typeof rawText === "string" && rawText.trim().length > 50;
      return {
        id: row.id,
        name: row.name,
        type: row.type ?? null,
        created_at: row.created_at,
        extractionStatus: hasText ? "ok" as const : "no_text" as const,
        extractionMessage: hasText ? undefined : "This file may be image-only; we couldn't extract text.",
      };
    });

    return NextResponse.json({
      documents,
    });
  } catch (error) {
    console.error("[documents] Error:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 },
    );
  }
}
