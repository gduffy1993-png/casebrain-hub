import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { extractCaseFacts, summariseDocument } from "@/lib/ai";
import { redact } from "@/lib/redact";
import { env } from "@/lib/env";
import { extractCriminalCaseMeta, persistCriminalCaseMeta } from "@/lib/criminal/structured-extractor";

export const runtime = "nodejs";

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`extract:${userId}`, { limit: 10, windowMs: 60_000 });

  const body = await request.json();
  const documentId = body?.documentId as string | undefined;

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select(
      "id, case_id, name, storage_url, type, cases!inner(id, org_id, practice_area)",
    )
    .eq("id", documentId)
    .eq("cases.org_id", orgId)
    .maybeSingle();

  if (docError || !document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  const path = document.storage_url.replace(`${STORAGE_BUCKET}/`, "");
  const { data: download, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(path);

  if (downloadError || !download) {
    return NextResponse.json(
      { error: "Unable to download document" },
      { status: 500 },
    );
  }

  const arrayBuffer = await download.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  let text: string;
  let extractionError: string | null = null;
  try {
    text = await extractTextFromBuffer(buffer, document.type);
  } catch (error) {
    console.error(`[extract] Failed to extract text from ${document.name}`, error);
    extractionError = error instanceof Error ? error.message : "Unknown extraction error";
    
    if (document.type === "application/pdf") {
      return NextResponse.json(
        {
          error: `PDF extraction failed: ${extractionError}`,
          suggestion:
            "The PDF may be corrupted, password-protected, or use an unsupported format. Try re-saving it or removing password protection.",
        },
        { status: 400 },
      );
    }
    
    return NextResponse.json(
      {
        error: `Text extraction failed: ${extractionError}`,
        suggestion: "Please check the file format and try again.",
      },
      { status: 400 },
    );
  }
  
  const { redactedText, map: redactionMap } = redact(
    text,
    env.REDACTION_SECRET,
  );
  
  let extracted;
  let summary: string | null = null;
  let enrichedExtraction;
  
  try {
    extracted = await extractCaseFacts({
      documentText: redactedText,
      documentName: document.name,
      orgId,
    });
    const summaryResult = await summariseDocument(redactedText);
    summary = summaryResult.summary;
    enrichedExtraction = {
      ...extracted,
      aiSummary: summary,
    };
  } catch (error) {
    console.error(`[extract] Failed to extract case facts from ${document.name}`, error);
    return NextResponse.json(
      {
        error: `AI extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        suggestion: "The document text was extracted but AI processing failed. Try again or check the document content.",
      },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      extracted_json: enrichedExtraction,
      redaction_map: redactionMap,
    })
    .eq("id", document.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update document extraction" },
      { status: 500 },
    );
  }

  // Criminal structured extraction (deterministic): run after text extraction and document update
  try {
    const practiceArea = (document as any)?.cases?.practice_area ?? null;
    if (practiceArea === "criminal") {
      const meta = extractCriminalCaseMeta({
        text: redactedText,
        documentName: document.name,
      });
      await persistCriminalCaseMeta({
        supabase,
        caseId: document.case_id,
        orgId,
        meta,
        sourceDocumentId: document.id,
        sourceDocumentName: document.name,
      });
    }
  } catch (criminalExtractError) {
    console.error("[extract] Criminal structured extractor failed (non-fatal):", criminalExtractError);
  }

  return NextResponse.json({ success: true, extracted, summary });
}

async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer, {
        max: 0, // Parse all pages
      });
      return result.text || "";
    } catch (error) {
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : "Unknown error"}. The PDF may be corrupted, password-protected, or use an unsupported format.`,
      );
    }
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch (error) {
      throw new Error(
        `DOCX parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  
  // For plain text files, try UTF-8 first, then fallback to latin1
  try {
    return buffer.toString("utf-8");
  } catch {
    return buffer.toString("latin1");
  }
}

