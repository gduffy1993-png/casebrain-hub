/**
 * Bundle Navigator
 * 
 * Phase A: Quick 10-page summary (existing)
 * Phase B: Full-bundle analysis with chunking + progress
 * Phase C: TOC, Timeline, Search (to be added)
 * Phase D: Issues Map, Contradictions (to be added)
 */

import { getSupabaseAdminClient } from "./supabase";
import type {
  CaseBundle,
  BundleChunk,
  BundlePhaseASummary,
  BundleJobStatus,
  BundleChunkIssue,
  BundleChunkDate,
  TOCSection,
  BundleTimelineEntry,
  BundleIssue,
  BundleContradiction,
  BundleOverview,
  BundleSearchResult,
} from "./types/casebrain";

// =============================================================================
// Configuration
// =============================================================================

const CHUNK_SIZE = 15; // Pages per chunk
const MAX_CHUNKS_PER_REQUEST = 3; // Process up to 3 chunks per API call

// =============================================================================
// Phase A: Quick Summary (existing functionality)
// =============================================================================

type BundleAnalysisInput = {
  caseId: string;
  orgId: string;
  bundleId: string;
  bundleName: string;
  textContent?: string;
  pageCount?: number;
};

/**
 * Extract page count from text
 */
function extractPageCount(text: string): number | undefined {
  // Look for "Page X of Y" patterns
  const pageOfMatch = text.match(/(?:page|p\.?)\s*(\d+)\s*(?:of|\/)\s*(\d+)/i);
  if (pageOfMatch && pageOfMatch[2]) {
    return parseInt(pageOfMatch[2]);
  }
  
  // Look for "Page X" at end of document
  const pageMatches = text.match(/page\s+(\d+)/gi);
  if (pageMatches && pageMatches.length > 0) {
    const lastPage = pageMatches[pageMatches.length - 1].match(/\d+/);
    if (lastPage) {
      return parseInt(lastPage[0]);
    }
  }
  
  return undefined;
}

/**
 * Generate per-document mini summary
 */
function generateDocumentSummary(text: string, docName: string): string {
  const firstParagraph = text.split(/\n\n/).find(p => p.trim().length > 50);
  if (firstParagraph) {
    return firstParagraph.trim().substring(0, 200) + (firstParagraph.length > 200 ? "..." : "");
  }
  return `Document "${docName}" - ${text.substring(0, 150)}...`;
}

/**
 * Generate Phase A summary (quick preview)
 * Includes per-document mini summaries and table of contents extract
 */
export async function summariseBundlePhaseA(
  input: BundleAnalysisInput
): Promise<BundlePhaseASummary> {
  const { caseId, orgId, bundleId, bundleName, textContent, pageCount } = input;
  const supabase = getSupabaseAdminClient();

  let summary = "";
  let detectedSections: string[] = [];
  const extractedPageCount = pageCount ?? (textContent ? extractPageCount(textContent) : undefined);

  if (textContent && textContent.length > 100) {
    detectedSections = detectSectionsFromText(textContent);
    summary = generateSummaryFromText(textContent, bundleName, detectedSections);
    
    // Add per-document mini summary
    const docSummary = generateDocumentSummary(textContent, bundleName);
    if (docSummary && !summary.includes(docSummary)) {
      summary = `${summary}\n\nDocument Summary: ${docSummary}`;
    }
  } else {
    summary = `Bundle "${bundleName}" uploaded. ${extractedPageCount ? `Contains ${extractedPageCount} pages.` : ""} Full content analysis not yet available.`;
  }

  // Upsert to database
  await supabase
    .from("case_bundles")
    .upsert({
      id: bundleId,
      case_id: caseId,
      org_id: orgId,
      bundle_name: bundleName,
      total_pages: extractedPageCount ?? 0,
      analysis_level: "phase_a",
      status: "completed",
      progress: 100,
      phase_a_summary: summary,
      detected_sections: detectedSections,
      completed_at: new Date().toISOString(),
    }, { onConflict: "id" });

  return {
    caseId,
    bundleId,
    bundleName,
    pageCount: extractedPageCount ?? 0,
    summary,
    detectedSections,
    processedAt: new Date().toISOString(),
    isPartialAnalysis: true,
  };
}

// =============================================================================
// Phase B: Full Analysis with Chunking
// =============================================================================

/**
 * Start or continue a full bundle analysis job
 */
export async function startFullBundleAnalysis(
  caseId: string,
  orgId: string,
  bundleId: string,
  bundleName: string,
  totalPages: number,
  textContentByPage?: Record<number, string>, // Optional: pre-extracted text per page
): Promise<CaseBundle> {
  const supabase = getSupabaseAdminClient();

  // Check if bundle job exists
  const { data: existing } = await supabase
    .from("case_bundles")
    .select("*")
    .eq("id", bundleId)
    .single();

  if (existing && existing.analysis_level === "full" && existing.status === "completed") {
    // Already done
    return mapBundleFromDb(existing);
  }

  // Create or update bundle record
  const now = new Date().toISOString();
  const bundleData = {
    id: bundleId,
    case_id: caseId,
    org_id: orgId,
    bundle_name: bundleName,
    total_pages: totalPages,
    analysis_level: "full",
    status: "running" as BundleJobStatus,
    progress: 0,
    started_at: now,
    updated_at: now,
  };

  const { data: bundle, error: bundleError } = await supabase
    .from("case_bundles")
    .upsert(bundleData, { onConflict: "id" })
    .select()
    .single();

  if (bundleError || !bundle) {
    throw new Error(`Failed to create bundle: ${bundleError?.message}`);
  }

  // Create chunks if they don't exist
  const { data: existingChunks } = await supabase
    .from("bundle_chunks")
    .select("id")
    .eq("bundle_id", bundleId);

  if (!existingChunks || existingChunks.length === 0) {
    const chunks = generateChunks(bundleId, totalPages);
    
    // Insert text content if provided
    const chunksWithText = chunks.map(chunk => {
      let rawText = "";
      if (textContentByPage) {
        for (let p = chunk.page_start; p <= chunk.page_end; p++) {
          if (textContentByPage[p]) {
            rawText += `\n--- Page ${p} ---\n${textContentByPage[p]}`;
          }
        }
      }
      return { ...chunk, raw_text: rawText || null };
    });

    await supabase.from("bundle_chunks").insert(chunksWithText);
  }

  return mapBundleFromDb(bundle);
}

/**
 * Process pending chunks (call this repeatedly until done)
 */
export async function processNextBundleChunks(
  bundleId: string,
  maxChunks: number = MAX_CHUNKS_PER_REQUEST,
): Promise<{ processed: number; remaining: number; bundle: CaseBundle }> {
  const supabase = getSupabaseAdminClient();

  // Get bundle
  const { data: bundle, error: bundleError } = await supabase
    .from("case_bundles")
    .select("*")
    .eq("id", bundleId)
    .single();

  if (bundleError || !bundle) {
    throw new Error("Bundle not found");
  }

  // Get pending chunks
  const { data: pendingChunks } = await supabase
    .from("bundle_chunks")
    .select("*")
    .eq("bundle_id", bundleId)
    .eq("status", "pending")
    .order("chunk_index", { ascending: true })
    .limit(maxChunks);

  if (!pendingChunks || pendingChunks.length === 0) {
    // No more pending - check if we're done
    const { count: remainingCount } = await supabase
      .from("bundle_chunks")
      .select("*", { count: "exact", head: true })
      .eq("bundle_id", bundleId)
      .neq("status", "completed");

    if (remainingCount === 0) {
      // All done - update bundle status
      await supabase
        .from("case_bundles")
        .update({
          status: "completed",
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("id", bundleId);

      bundle.status = "completed";
      bundle.progress = 100;
    }

    return { 
      processed: 0, 
      remaining: remainingCount ?? 0, 
      bundle: mapBundleFromDb(bundle) 
    };
  }

  // Process each chunk
  let processedCount = 0;
  for (const chunk of pendingChunks) {
    try {
      // Mark as processing
      await supabase
        .from("bundle_chunks")
        .update({ status: "processing" })
        .eq("id", chunk.id);

      // Analyze the chunk
      const analysis = await analyzeChunk(chunk);

      // Save results
      await supabase
        .from("bundle_chunks")
        .update({
          status: "completed",
          ai_summary: analysis.summary,
          doc_types: analysis.docTypes,
          key_issues: analysis.keyIssues,
          key_dates: analysis.keyDates,
          entities: analysis.entities,
          processed_at: new Date().toISOString(),
        })
        .eq("id", chunk.id);

      processedCount++;
    } catch (error) {
      console.error(`Failed to process chunk ${chunk.id}:`, error);
      await supabase
        .from("bundle_chunks")
        .update({ 
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", chunk.id);
    }
  }

  // Update progress
  const { count: totalChunks } = await supabase
    .from("bundle_chunks")
    .select("*", { count: "exact", head: true })
    .eq("bundle_id", bundleId);

  const { count: completedChunks } = await supabase
    .from("bundle_chunks")
    .select("*", { count: "exact", head: true })
    .eq("bundle_id", bundleId)
    .eq("status", "completed");

  const progress = totalChunks ? Math.round((completedChunks ?? 0) / totalChunks * 100) : 0;

  const { count: remainingChunks } = await supabase
    .from("bundle_chunks")
    .select("*", { count: "exact", head: true })
    .eq("bundle_id", bundleId)
    .eq("status", "pending");

  await supabase
    .from("case_bundles")
    .update({ progress })
    .eq("id", bundleId);

  bundle.progress = progress;

  return {
    processed: processedCount,
    remaining: remainingChunks ?? 0,
    bundle: mapBundleFromDb(bundle),
  };
}

/**
 * Get bundle status and details
 */
export async function getBundleStatus(
  caseId: string,
  orgId: string,
): Promise<CaseBundle | null> {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("case_bundles")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return mapBundleFromDb(data);
}

/**
 * Get all chunks for a bundle
 */
export async function getBundleChunks(bundleId: string): Promise<BundleChunk[]> {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("bundle_chunks")
    .select("*")
    .eq("bundle_id", bundleId)
    .order("chunk_index", { ascending: true });

  return (data ?? []).map(mapChunkFromDb);
}

// =============================================================================
// Phase C: TOC, Timeline, Search (Placeholders)
// =============================================================================

/**
 * Build bundle overview combining chunk data
 */
export async function buildBundleOverview(bundleId: string): Promise<BundleOverview | null> {
  const supabase = getSupabaseAdminClient();

  const { data: bundle } = await supabase
    .from("case_bundles")
    .select("*")
    .eq("id", bundleId)
    .single();

  if (!bundle) return null;

  const chunks = await getBundleChunks(bundleId);
  const completedChunks = chunks.filter(c => c.status === "completed");

  // Aggregate doc types
  const docTypeCounts: Record<string, number> = {};
  completedChunks.forEach(chunk => {
    chunk.docTypes.forEach(dt => {
      docTypeCounts[dt] = (docTypeCounts[dt] ?? 0) + 1;
    });
  });

  // Count issues and dates
  let issueCount = 0;
  let keyDatesCount = 0;
  completedChunks.forEach(chunk => {
    issueCount += chunk.keyIssues.length;
    keyDatesCount += chunk.keyDates.length;
  });

  // Combine summaries
  const summary = completedChunks
    .map(c => c.aiSummary)
    .filter(Boolean)
    .join("\n\n");

  return {
    bundleId,
    bundleName: bundle.bundle_name,
    totalPages: bundle.total_pages,
    status: bundle.status,
    progress: bundle.progress,
    summary: summary.slice(0, 2000),
    docTypeCounts,
    issueCount,
    contradictionCount: 0, // Phase D
    keyDatesCount,
    lastUpdated: bundle.updated_at,
  };
}

/**
 * Build table of contents from chunks
 */
export async function buildBundleTOC(bundleId: string): Promise<TOCSection[]> {
  const chunks = await getBundleChunks(bundleId);
  const completedChunks = chunks.filter(c => c.status === "completed");

  // Group consecutive chunks with same doc type
  const toc: TOCSection[] = [];
  let currentSection: TOCSection | null = null;

  for (const chunk of completedChunks) {
    const primaryType = chunk.docTypes[0] ?? "Unknown";
    
    if (currentSection && currentSection.docType === primaryType) {
      // Extend current section
      currentSection.pageEnd = chunk.pageEnd;
      currentSection.summary += " " + (chunk.aiSummary ?? "");
    } else {
      // Start new section
      if (currentSection) toc.push(currentSection);
      currentSection = {
        id: chunk.id,
        title: primaryType,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        docType: primaryType,
        summary: chunk.aiSummary ?? "",
      };
    }
  }
  if (currentSection) toc.push(currentSection);

  return toc;
}

/**
 * Build timeline from chunks
 */
export async function buildBundleTimeline(bundleId: string): Promise<BundleTimelineEntry[]> {
  const chunks = await getBundleChunks(bundleId);
  const completedChunks = chunks.filter(c => c.status === "completed");

  const entries: BundleTimelineEntry[] = [];

  for (const chunk of completedChunks) {
    for (const dateEntry of chunk.keyDates) {
      entries.push({
        date: dateEntry.date,
        event: dateEntry.context,
        source: `Pages ${chunk.pageStart}-${chunk.pageEnd}`,
        pageRef: dateEntry.pageRef ?? chunk.pageStart,
        importance: dateEntry.importance,
      });
    }
  }

  // Sort by date
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return entries;
}

/**
 * Search within bundle
 */
export async function searchBundle(
  bundleId: string,
  query: string,
): Promise<BundleSearchResult[]> {
  const chunks = await getBundleChunks(bundleId);
  const completedChunks = chunks.filter(c => c.status === "completed");
  const queryLower = query.toLowerCase();

  const results: BundleSearchResult[] = [];

  for (const chunk of completedChunks) {
    const summaryLower = (chunk.aiSummary ?? "").toLowerCase();
    const rawTextLower = (chunk.rawText ?? "").toLowerCase();
    
    if (summaryLower.includes(queryLower) || rawTextLower.includes(queryLower)) {
      // Find matching excerpt
      const text = chunk.rawText ?? chunk.aiSummary ?? "";
      const idx = text.toLowerCase().indexOf(queryLower);
      const start = Math.max(0, idx - 50);
      const end = Math.min(text.length, idx + query.length + 100);
      
      results.push({
        chunkId: chunk.id,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        matchedText: query,
        context: text.slice(start, end),
        relevance: summaryLower.includes(queryLower) ? 1 : 0.5,
      });
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  return results;
}

// =============================================================================
// Phase D: Issues Map & Contradictions (Placeholders)
// =============================================================================

/**
 * Build issues map from chunks
 */
export async function buildIssuesMap(bundleId: string): Promise<BundleIssue[]> {
  const chunks = await getBundleChunks(bundleId);
  const completedChunks = chunks.filter(c => c.status === "completed");

  // Aggregate issues across chunks
  const issueMap = new Map<string, BundleIssue>();

  for (const chunk of completedChunks) {
    for (const issue of chunk.keyIssues) {
      const key = issue.issue.toLowerCase().slice(0, 50);
      
      if (issueMap.has(key)) {
        const existing = issueMap.get(key)!;
        existing.supportingSections.push({
          chunkId: chunk.id,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          excerpt: chunk.aiSummary?.slice(0, 200) ?? "",
        });
      } else {
        issueMap.set(key, {
          id: `issue-${issueMap.size}`,
          issue: issue.issue,
          type: issue.type,
          overallStrength: issue.strength,
          supportingSections: [{
            chunkId: chunk.id,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            excerpt: chunk.aiSummary?.slice(0, 200) ?? "",
          }],
        });
      }
    }
  }

  return Array.from(issueMap.values());
}

/**
 * Find potential contradictions
 */
export async function findContradictions(bundleId: string): Promise<BundleContradiction[]> {
  // For V1, use simple heuristics
  const chunks = await getBundleChunks(bundleId);
  const completedChunks = chunks.filter(c => c.status === "completed");

  const contradictions: BundleContradiction[] = [];

  // Look for opposing statements about dates
  const dateStatements: Array<{ chunk: BundleChunk; date: string; context: string }> = [];
  
  for (const chunk of completedChunks) {
    for (const dateEntry of chunk.keyDates) {
      dateStatements.push({
        chunk,
        date: dateEntry.date,
        context: dateEntry.context,
      });
    }
  }

  // Check for same event with different dates
  const eventMap = new Map<string, typeof dateStatements>();
  for (const stmt of dateStatements) {
    const eventKey = stmt.context.toLowerCase().slice(0, 30);
    if (!eventMap.has(eventKey)) {
      eventMap.set(eventKey, []);
    }
    eventMap.get(eventKey)!.push(stmt);
  }

  for (const [, statements] of eventMap) {
    if (statements.length > 1) {
      const dates = new Set(statements.map(s => s.date));
      if (dates.size > 1) {
        contradictions.push({
          id: `contradiction-${contradictions.length}`,
          description: `Conflicting dates for: "${statements[0].context.slice(0, 50)}..."`,
          confidence: "medium",
          sectionsInvolved: statements.map(s => ({
            chunkId: s.chunk.id,
            pageStart: s.chunk.pageStart,
            pageEnd: s.chunk.pageEnd,
            position: `Date: ${s.date}`,
          })),
          potentialImpact: "Timeline inconsistency - verify correct date",
        });
      }
    }
  }

  return contradictions;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateChunks(bundleId: string, totalPages: number): Array<{
  bundle_id: string;
  chunk_index: number;
  page_start: number;
  page_end: number;
  status: string;
}> {
  const chunks = [];
  let pageStart = 1;
  let chunkIndex = 0;

  while (pageStart <= totalPages) {
    const pageEnd = Math.min(pageStart + CHUNK_SIZE - 1, totalPages);
    chunks.push({
      bundle_id: bundleId,
      chunk_index: chunkIndex,
      page_start: pageStart,
      page_end: pageEnd,
      status: "pending",
    });
    pageStart = pageEnd + 1;
    chunkIndex++;
  }

  return chunks;
}

async function analyzeChunk(chunk: {
  id: string;
  page_start: number;
  page_end: number;
  raw_text?: string;
}): Promise<{
  summary: string;
  docTypes: string[];
  keyIssues: BundleChunkIssue[];
  keyDates: BundleChunkDate[];
  entities: string[];
}> {
  const text = chunk.raw_text ?? "";
  
  // For V1, use heuristic analysis (AI integration in future)
  const docTypes = detectDocTypesFromText(text);
  const keyIssues = extractIssuesFromText(text);
  const keyDates = extractDatesFromText(text);
  const entities = extractEntitiesFromText(text);
  
  const summary = text.length > 500 
    ? `Pages ${chunk.page_start}-${chunk.page_end}: ${text.slice(0, 500)}...`
    : `Pages ${chunk.page_start}-${chunk.page_end}: ${text || "No text extracted"}`;

  return { summary, docTypes, keyIssues, keyDates, entities };
}

function detectDocTypesFromText(text: string): string[] {
  const types: string[] = [];
  const textLower = text.toLowerCase();

  const patterns: Array<{ pattern: string; type: string }> = [
    { pattern: "letter of claim", type: "Letter of Claim" },
    { pattern: "particulars of claim", type: "Particulars of Claim" },
    { pattern: "defence", type: "Defence" },
    { pattern: "witness statement", type: "Witness Statement" },
    { pattern: "expert report", type: "Expert Report" },
    { pattern: "medical report", type: "Medical Report" },
    { pattern: "schedule of loss", type: "Schedule of Loss" },
    { pattern: "court order", type: "Court Order" },
    { pattern: "tenancy agreement", type: "Tenancy Agreement" },
    { pattern: "inspection report", type: "Inspection Report" },
    { pattern: "correspondence", type: "Correspondence" },
    { pattern: "photograph", type: "Photographs" },
  ];

  for (const { pattern, type } of patterns) {
    if (textLower.includes(pattern) && !types.includes(type)) {
      types.push(type);
    }
  }

  return types.length > 0 ? types : ["Unknown"];
}

function extractIssuesFromText(text: string): BundleChunkIssue[] {
  const issues: BundleChunkIssue[] = [];
  const textLower = text.toLowerCase();

  // Simple keyword-based issue detection
  if (textLower.includes("breach") || textLower.includes("negligence")) {
    issues.push({
      issue: "Breach/negligence allegation",
      type: "liability",
      strength: "medium",
    });
  }
  if (textLower.includes("caused") || textLower.includes("result of")) {
    issues.push({
      issue: "Causation discussed",
      type: "causation",
      strength: "medium",
    });
  }
  if (textLower.includes("loss") || textLower.includes("damage") || textLower.includes("£")) {
    issues.push({
      issue: "Quantum/losses mentioned",
      type: "quantum",
      strength: "medium",
    });
  }

  return issues;
}

function extractDatesFromText(text: string): BundleChunkDate[] {
  const dates: BundleChunkDate[] = [];
  
  // Simple date pattern matching
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
  let match;
  
  while ((match = datePattern.exec(text)) !== null) {
    const context = text.slice(Math.max(0, match.index - 30), match.index + match[0].length + 30);
    dates.push({
      date: match[0],
      context: context.trim(),
      importance: "medium",
    });
  }

  return dates.slice(0, 10); // Limit to 10 dates per chunk
}

function extractEntitiesFromText(text: string): string[] {
  // Simple entity extraction (names in title case)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const entities = new Set<string>();
  
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    if (match[1].length > 5 && match[1].length < 50) {
      entities.add(match[1]);
    }
  }

  return Array.from(entities).slice(0, 20);
}

function detectSectionsFromText(text: string): string[] {
  const sections: string[] = [];
  const textLower = text.toLowerCase();

  const sectionPatterns = [
    "letter of claim", "particulars of claim", "defence", "witness statement",
    "expert report", "medical report", "schedule of loss", "chronology",
    "court order", "disclosure", "bundle index", "tenancy agreement",
  ];

  for (const pattern of sectionPatterns) {
    if (textLower.includes(pattern)) {
      const label = pattern.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      if (!sections.includes(label)) sections.push(label);
    }
  }

  return sections;
}

function generateSummaryFromText(text: string, bundleName: string, sections: string[]): string {
  const lines = [`This bundle "${bundleName}" appears to contain legal documentation.`];
  
  if (sections.length > 0) {
    lines.push(`\nDetected sections: ${sections.slice(0, 6).join(", ")}.`);
  }

  lines.push(`\nNote: This is a Phase A preview. Start Full Analysis for complete bundle navigation.`);

  return lines.join("");
}

// Database mappers
function mapBundleFromDb(data: Record<string, unknown>): CaseBundle {
  return {
    id: data.id as string,
    caseId: data.case_id as string,
    orgId: data.org_id as string,
    fileRef: data.file_ref as string | undefined,
    bundleName: data.bundle_name as string,
    totalPages: (data.total_pages as number) ?? 0,
    analysisLevel: (data.analysis_level as "phase_a" | "full") ?? "phase_a",
    status: (data.status as BundleJobStatus) ?? "pending",
    progress: (data.progress as number) ?? 0,
    errorMessage: data.error_message as string | undefined,
    phaseASummary: data.phase_a_summary as string | undefined,
    detectedSections: (data.detected_sections as string[]) ?? [],
    fullSummary: data.full_summary as string | undefined,
    fullToc: (data.full_toc as TOCSection[]) ?? [],
    fullTimeline: (data.full_timeline as BundleTimelineEntry[]) ?? [],
    issuesMap: (data.issues_map as BundleIssue[]) ?? [],
    contradictions: (data.contradictions as BundleContradiction[]) ?? [],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    startedAt: data.started_at as string | undefined,
    completedAt: data.completed_at as string | undefined,
  };
}

function mapChunkFromDb(data: Record<string, unknown>): BundleChunk {
  return {
    id: data.id as string,
    bundleId: data.bundle_id as string,
    chunkIndex: data.chunk_index as number,
    pageStart: data.page_start as number,
    pageEnd: data.page_end as number,
    status: (data.status as "pending" | "processing" | "completed" | "failed") ?? "pending",
    rawText: data.raw_text as string | undefined,
    aiSummary: data.ai_summary as string | undefined,
    docTypes: (data.doc_types as string[]) ?? [],
    keyIssues: (data.key_issues as BundleChunkIssue[]) ?? [],
    keyDates: (data.key_dates as BundleChunkDate[]) ?? [],
    entities: (data.entities as string[]) ?? [],
    errorMessage: data.error_message as string | undefined,
    createdAt: data.created_at as string,
    processedAt: data.processed_at as string | undefined,
  };
}

// Legacy compatibility
export async function getBundleSummary(
  caseId: string,
  orgId: string,
): Promise<BundlePhaseASummary | null> {
  const bundle = await getBundleStatus(caseId, orgId);
  if (!bundle) return null;

  return {
    caseId: bundle.caseId,
    bundleId: bundle.id,
    bundleName: bundle.bundleName,
    pageCount: bundle.totalPages,
    summary: bundle.phaseASummary ?? bundle.fullSummary ?? "",
    detectedSections: bundle.detectedSections,
    processedAt: bundle.updatedAt,
    isPartialAnalysis: bundle.analysisLevel === "phase_a",
  };
}
