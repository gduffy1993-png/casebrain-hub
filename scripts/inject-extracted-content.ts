/**
 * Utility script to inject extracted content directly into Supabase
 * Bypasses /api/extract endpoint for testing/debugging
 * 
 * Usage:
 *   DOCUMENT_ID="xxx" FULL_TEXT="..." SUMMARY="..." KEY_ISSUES="..." TIMELINE="..." npm run inject-content
 */

import { getSupabaseAdminClient } from "../lib/supabase";

interface InjectContentParams {
  documentId: string;
  fullText: string;
  summary: string;
  keyIssues: any; // Array or object
  timeline: any; // Array of timeline events
}

export async function injectExtractedContent(params: InjectContentParams) {
  const { documentId, fullText, summary, keyIssues, timeline } = params;
  const supabase = getSupabaseAdminClient();

  console.log(`[inject] Starting injection for document: ${documentId}`);

  // 1. Get document and case info
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, case_id, org_id, name")
    .eq("id", documentId)
    .maybeSingle();

  if (docError || !document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const caseId = document.case_id;
  const orgId = document.org_id;

  console.log(`[inject] Found document: ${document.name}, case: ${caseId}, org: ${orgId}`);

  // 2. Build extracted_json structure
  const extractedJson = {
    summary: summary,
    keyIssues: Array.isArray(keyIssues) ? keyIssues : [keyIssues],
    timeline: Array.isArray(timeline) ? timeline : [timeline],
    parties: [],
    dates: [],
    amounts: [],
  };

  // 3. Update document with extracted content
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
    throw new Error(`Failed to update document: ${updateError.message}`);
  }

  console.log(`[inject] Updated document with extracted content`);

  // 4. Ensure case practice_area is clinical_negligence
  const { error: caseUpdateError } = await supabase
    .from("cases")
    .update({
      practice_area: "clinical_negligence",
    })
    .eq("id", caseId)
    .eq("org_id", orgId);

  if (caseUpdateError) {
    console.warn(`[inject] Warning: Could not update practice_area: ${caseUpdateError.message}`);
  } else {
    console.log(`[inject] Ensured practice_area is clinical_negligence`);
  }

  // 5. Check if bundle_chunks table exists and create entry
  // First, find or create a case_bundle
  let bundleId: string | null = null;

  const { data: existingBundle } = await supabase
    .from("case_bundles")
    .select("id")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();

  if (existingBundle) {
    bundleId = existingBundle.id;
    console.log(`[inject] Found existing bundle: ${bundleId}`);
  } else {
    // Create a new bundle
    const { data: newBundle, error: bundleError } = await supabase
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

    if (bundleError) {
      console.warn(`[inject] Warning: Could not create bundle: ${bundleError.message}`);
    } else {
      bundleId = newBundle.id;
      console.log(`[inject] Created new bundle: ${bundleId}`);
    }
  }

  // 6. Insert bundle_chunk if bundle exists
  if (bundleId) {
    // Check if chunk already exists
    const { data: existingChunk } = await supabase
      .from("bundle_chunks")
      .select("id")
      .eq("bundle_id", bundleId)
      .eq("chunk_index", 0)
      .maybeSingle();

    if (existingChunk) {
      // Update existing chunk
      const { error: chunkUpdateError } = await supabase
        .from("bundle_chunks")
        .update({
          raw_text: fullText,
          ai_summary: summary,
          status: "completed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", existingChunk.id);

      if (chunkUpdateError) {
        console.warn(`[inject] Warning: Could not update bundle_chunk: ${chunkUpdateError.message}`);
      } else {
        console.log(`[inject] Updated bundle_chunk`);
      }
    } else {
      // Insert new chunk
      const { error: chunkInsertError } = await supabase
        .from("bundle_chunks")
        .insert({
          bundle_id: bundleId,
          chunk_index: 0,
          page_start: 1,
          page_end: 1, // We don't know actual page count
          status: "completed",
          raw_text: fullText,
          ai_summary: summary,
          processed_at: new Date().toISOString(),
        });

      if (chunkInsertError) {
        console.warn(`[inject] Warning: Could not insert bundle_chunk: ${chunkInsertError.message}`);
      } else {
        console.log(`[inject] Inserted bundle_chunk`);
      }
    }
  }

  console.log(`[inject] ✅ Injection complete!`);
  console.log(`[inject] Document ID: ${documentId}`);
  console.log(`[inject] Case ID: ${caseId}`);
  console.log(`[inject] Next: Re-run Strategic Intelligence on case ${caseId}`);

  return {
    success: true,
    documentId,
    caseId,
    orgId,
    bundleId,
  };
}

// CLI usage
if (require.main === module) {
  const documentId = process.env.DOCUMENT_ID;
  const fullText = process.env.FULL_TEXT;
  const summary = process.env.SUMMARY;
  const keyIssuesJson = process.env.KEY_ISSUES;
  const timelineJson = process.env.TIMELINE;

  if (!documentId || !fullText || !summary) {
    console.error("Missing required environment variables:");
    console.error("  DOCUMENT_ID - The document UUID");
    console.error("  FULL_TEXT - The extracted text");
    console.error("  SUMMARY - The AI summary");
    console.error("  KEY_ISSUES - JSON array/object (optional)");
    console.error("  TIMELINE - JSON array (optional)");
    process.exit(1);
  }

  let keyIssues: any = [];
  let timeline: any = [];

  try {
    if (keyIssuesJson) {
      keyIssues = JSON.parse(keyIssuesJson);
    }
    if (timelineJson) {
      timeline = JSON.parse(timelineJson);
    }
  } catch (e) {
    console.warn("Failed to parse JSON, using empty arrays");
  }

  injectExtractedContent({
    documentId,
    fullText,
    summary,
    keyIssues,
    timeline,
  })
    .then((result) => {
      console.log("✅ Success:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

