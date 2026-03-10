/**
 * GET /api/cases/[caseId]/documents
 * 
 * Returns all documents for a case (single source = Case Files = strategy bundle).
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

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
    // Include raw_text and extracted_json to compute extraction status; do not send full content to client
    const { data: rows, error: docsError } = await supabase
      .from("documents")
      .select("id, name, type, created_at, raw_text, extracted_json")
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

    const DOC_TEXT_MIN = 50;
    function getSummaryChars(extracted_json: unknown): number {
      if (!extracted_json || typeof extracted_json !== "object") return 0;
      const o = extracted_json as Record<string, unknown>;
      const s = typeof o.summary === "string" ? o.summary.length : 0;
      const a = typeof o.aiSummary === "string" ? o.aiSummary.length : 0;
      return s + a;
    }

    const documents = (rows ?? []).map((row: { id: string; name: string; type?: string; created_at: string; raw_text?: string | null; extracted_json?: unknown }) => {
      const rawText = typeof row.raw_text === "string" ? row.raw_text.trim() : "";
      const rawLen = rawText.length;
      const summaryChars = getSummaryChars(row.extracted_json);
      const hasFullText = rawLen >= DOC_TEXT_MIN;
      const hasSummary = summaryChars > 0;
      let extractionStatus: "full" | "summary_only" | "no_text";
      let extractionMessage: string;
      let extractionCharCount: number | undefined;
      if (hasFullText) {
        extractionStatus = "full";
        extractionMessage = `Text extracted (${rawLen.toLocaleString()} chars)`;
        extractionCharCount = rawLen;
      } else if (hasSummary) {
        extractionStatus = "summary_only";
        extractionMessage = "Summary only – add full document for better strategy";
        extractionCharCount = summaryChars;
      } else {
        extractionStatus = "no_text";
        extractionMessage = "No text – re-upload or OCR";
      }
      return {
        id: row.id,
        name: row.name,
        type: row.type ?? null,
        created_at: row.created_at,
        extractionStatus,
        extractionMessage,
        extractionCharCount,
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
