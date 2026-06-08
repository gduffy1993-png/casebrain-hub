/**
 * Admin API endpoint to inject extracted content directly into Supabase
 * POST /api/admin/inject-content
 * 
 * Body:
 * {
 *   documentId: string,
 *   fullText: string,
 *   summary: string,
 *   keyIssues?: any,
 *   timeline?: any
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await requireAuthContext();
    
    const body = await request.json();
    const { documentId, fullText, summary, keyIssues = [], timeline = [] } = body;

    if (!documentId || !fullText || !summary) {
      return NextResponse.json(
        { error: "Missing required fields: documentId, fullText, summary" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // 1. Get document and case info
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, case_id, org_id, name")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Document not found: ${documentId}` },
        { status: 404 }
      );
    }

    // Verify org access
    if (document.org_id !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized: Document belongs to different org" },
        { status: 403 }
      );
    }

    const caseId = document.case_id;

    // 2. Build extracted_json structure
    const extractedJson = {
      summary: summary,
      keyIssues: Array.isArray(keyIssues) ? keyIssues : [keyIssues],
      timeline: Array.isArray(timeline) ? timeline : [timeline],
      parties: [],
      dates: [],
      amounts: [],
    };

    // 3. Update document
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        raw_text: fullText,
        ai_summary: summary,
        extracted_json: extractedJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update document: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 4. Ensure case practice_area is clinical_negligence
    await supabase
      .from("cases")
      .update({
        practice_area: "clinical_negligence",
      })
      .eq("id", caseId)
      .eq("org_id", orgId);

    // 5. Handle bundle_chunks
    let bundleId: string | null = null;

    // Find or create bundle
    const { data: existingBundle } = await supabase
      .from("case_bundles")
      .select("id")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle();

    if (existingBundle) {
      bundleId = existingBundle.id;
    } else {
      const { data: newBundle } = await supabase
        .from("case_bundles")
        .insert({
          case_id: caseId,
          org_id: orgId,
          bundle_name: document.name || "Extracted Document Bundle",
          status: "completed",
          analysis_level: "full",
          progress: 100,
        })
        .select("id")
        .single();

      if (newBundle) {
        bundleId = newBundle.id;
      }
    }

    // Insert/update bundle_chunk
    if (bundleId) {
      const { data: existingChunk } = await supabase
        .from("bundle_chunks")
        .select("id")
        .eq("bundle_id", bundleId)
        .eq("chunk_index", 0)
        .maybeSingle();

      if (existingChunk) {
        await supabase
          .from("bundle_chunks")
          .update({
            raw_text: fullText,
            ai_summary: summary,
            status: "completed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", existingChunk.id);
      } else {
        await supabase
          .from("bundle_chunks")
          .insert({
            bundle_id: bundleId,
            chunk_index: 0,
            page_start: 1,
            page_end: 1,
            status: "completed",
            raw_text: fullText,
            ai_summary: summary,
            processed_at: new Date().toISOString(),
          });
      }
    }

    return NextResponse.json({
      success: true,
      documentId,
      caseId,
      bundleId,
      message: "Content injected successfully. Re-run Strategic Intelligence to see updated momentum.",
    });
  } catch (error) {
    console.error("[inject-content] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

