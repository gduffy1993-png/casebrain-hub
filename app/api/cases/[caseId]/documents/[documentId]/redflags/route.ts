import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  analyseDocumentForRedFlags,
  getDocumentRedFlags,
  storeDocumentRedFlags,
} from "@/lib/clause-redflags";

type RouteParams = {
  params: { caseId: string; documentId: string };
};

/**
 * GET /api/cases/[caseId]/documents/[documentId]/redflags
 * 
 * Retrieve stored red flag analysis for a document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId, documentId } = params;

    // Verify document belongs to case and org
    const supabase = getSupabaseAdminClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("id, name, case_id")
      .eq("id", documentId)
      .eq("case_id", caseId)
      .single();

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Get stored analysis
    const summary = await getDocumentRedFlags(caseId, documentId);

    if (!summary) {
      return NextResponse.json({
        summary: null,
        message: "Document has not been analysed for red flags yet",
      });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Failed to get red flags:", error);
    return NextResponse.json(
      { error: "Failed to retrieve red flag analysis" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cases/[caseId]/documents/[documentId]/redflags
 * 
 * Analyse a document for dangerous clauses and red flags
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId, documentId } = params;

    // Fetch document
    const supabase = getSupabaseAdminClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("id, name, case_id, extracted_text, extracted_json")
      .eq("id", documentId)
      .eq("case_id", caseId)
      .single();

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Get document text
    let documentText = "";
    
    if (doc.extracted_text) {
      documentText = doc.extracted_text;
    } else if (doc.extracted_json && typeof doc.extracted_json === "object") {
      const extracted = doc.extracted_json as { text?: string; summary?: string };
      documentText = extracted.text ?? extracted.summary ?? "";
    }

    if (!documentText || documentText.length < 50) {
      return NextResponse.json(
        { error: "Document has no extractable text for analysis" },
        { status: 400 },
      );
    }

    // Analyse document
    const summary = await analyseDocumentForRedFlags(
      caseId,
      documentId,
      documentText,
      doc.name,
    );

    // Store results
    await storeDocumentRedFlags(documentId, summary);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Failed to analyse document:", error);
    return NextResponse.json(
      { error: "Failed to analyse document for red flags" },
      { status: 500 },
    );
  }
}

