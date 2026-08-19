import "server-only";

import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { env } from "@/lib/env";
import { requireDocumentInOrg } from "@/lib/tenant/require-case-in-org";

/**
 * GET /api/files/[fileId]/view
 *
 * Generates a signed URL for viewing a document in a new tab.
 * Foreign and missing document IDs both return identical 404 (no signed URL, no 403 oracle).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const { orgId } = await requireAuthContext();

  try {
    const docCheck = await requireDocumentInOrg(fileId, orgId, {
      select: "id, name, storage_url, case_id, org_id",
    });
    if (!docCheck.ok) return docCheck.response;
    const document = docCheck.document;

    const storageUrl = document.storage_url as string | null | undefined;
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

    const supabase = getSupabaseAdminClient();
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
