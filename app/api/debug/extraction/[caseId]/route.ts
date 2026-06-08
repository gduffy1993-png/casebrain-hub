import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseContext } from "@/lib/case-context";

export const runtime = "nodejs";

/**
 * Debug endpoint for document extraction diagnostics
 * 
 * Returns:
 * - docCount
 * - List of docs with {id, name, mime, rawChars, jsonChars}
 * - Preview of first 200 chars of raw_text per doc (dev only)
 * - Clear reason if raw_text is empty
 * 
 * Access: Requires authentication (dev/admin only in practice)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { userId } = await requireAuthContext();
    const { caseId } = await params;
    
    // Build case context to get diagnostics
    const context = await buildCaseContext(caseId, { userId });
    
    const supabase = getSupabaseAdminClient();
    
    // Get detailed document info
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, name, type, raw_text, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", context.orgScope.orgIdResolved)
      .order("created_at", { ascending: false });
    
    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch documents: ${error.message}` },
        { status: 500 }
      );
    }
    
    const isDev = process.env.NODE_ENV !== "production";
    
    const docDetails = (documents || []).map((doc) => {
      const rawText = doc.raw_text ?? "";
      const rawChars = typeof rawText === "string" ? rawText.length : 0;
      
      let jsonChars = 0;
      if (doc.extracted_json) {
        try {
          const jsonStr = typeof doc.extracted_json === "string" 
            ? doc.extracted_json 
            : JSON.stringify(doc.extracted_json);
          jsonChars = jsonStr.length;
        } catch {
          jsonChars = 0;
        }
      }
      
      // Determine why raw_text might be empty
      let rawTextEmptyReason: string | null = null;
      if (rawChars === 0) {
        if (doc.extracted_json && jsonChars > 0) {
          rawTextEmptyReason = "Extraction error: raw_text not persisted (extracted_json exists but raw_text is missing)";
        } else {
          rawTextEmptyReason = "No text extracted: PDF may be scanned, corrupted, or extraction failed";
        }
      }
      
      const preview = isDev && rawChars > 0
        ? rawText.substring(0, 200).replace(/\n/g, " ")
        : undefined;
      
      return {
        id: doc.id,
        name: doc.name,
        mime: doc.type || "unknown",
        rawChars,
        jsonChars,
        preview,
        rawTextEmptyReason,
      };
    });
    
    return NextResponse.json({
      caseId,
      orgIdResolved: context.orgScope.orgIdResolved,
      method: context.orgScope.method,
      docCount: context.diagnostics.docCount,
      diagnostics: {
        rawCharsTotal: context.diagnostics.rawCharsTotal,
        jsonCharsTotal: context.diagnostics.jsonCharsTotal,
        avgRawCharsPerDoc: context.diagnostics.avgRawCharsPerDoc,
        suspectedScanned: context.diagnostics.suspectedScanned,
        reasonCodes: context.diagnostics.reasonCodes,
        canGenerateAnalysis: context.canGenerateAnalysis,
      },
      documents: docDetails,
      banner: context.banner || null,
    });
  } catch (error) {
    console.error("[debug/extraction] Error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch extraction diagnostics",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
