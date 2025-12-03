import "server-only";

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { env } from "@/lib/env";

/**
 * GET /api/files/[fileId]/view
 * 
 * Generates a signed URL for viewing a document in a new tab.
 * Uses server-side Supabase client with service role key for security.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  try {
    // Fetch document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, name, storage_url, case_id, org_id")
      .eq("id", fileId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (docError) {
      console.error("[files/view] Database error:", docError);
      return NextResponse.json(
        { error: "Failed to fetch document" },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify document belongs to the case and org
    if (document.org_id !== orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Extract storage path from storage_url
    // Format: "casebrain-documents/orgId/caseId/timestamp-filename.pdf"
    const storageUrl = document.storage_url;
    if (!storageUrl) {
      return NextResponse.json(
        { error: "Document has no storage URL" },
        { status: 400 }
      );
    }

    const bucket = env.SUPABASE_STORAGE_BUCKET;
    const path = storageUrl.startsWith(`${bucket}/`)
      ? storageUrl.replace(`${bucket}/`, "")
      : storageUrl;

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (urlError || !signedUrlData) {
      console.error("[files/view] Storage error:", urlError);
      return NextResponse.json(
        { error: "Failed to generate view URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      filename: document.name,
    });
  } catch (error) {
    console.error("[files/view] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected error occurred" },
      { status: 500 }
    );
  }
}

