/**
 * GET /api/strategic/[caseId]/overview
 * 
 * Returns combined strategic overview for a case (momentum + strategies)
 * 
 * PERFORMANCE: Uses in-memory cache (60s TTL) and parallelized queries
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateCaseMomentum } from "@/lib/strategic/momentum-engine";
import { generateStrategyPaths } from "@/lib/strategic/strategy-paths";
import { detectOpponentWeakSpots } from "@/lib/strategic/weak-spots";
import { detectProceduralLeveragePoints } from "@/lib/strategic/procedural-leverage";
import { sanitizeStrategicResponse } from "@/lib/strategic/language-sanitizer";
import { withPaywall } from "@/lib/paywall/protect-route";
import { findMissingEvidence } from "@/lib/missing-evidence";
import { computeAnalysisDelta } from "@/lib/strategic/compute-analysis-delta";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================
// IN-MEMORY CACHE (60s TTL, max 200 entries)
// ============================================
type CacheEntry = {
  at: number;
  data: any;
};

const strategicCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 200;
const CACHE_TTL_MS = 60000; // 60 seconds

function getCacheKey(orgId: string, caseId: string, latestDocAt: string, docCount: number, timelineCount: number): string {
  return `${orgId}:${caseId}:${latestDocAt}:${docCount}:${timelineCount}`;
}

function getFromCache(key: string): any | null {
  const entry = strategicCache.get(key);
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    strategicCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: any): void {
  // Prevent cache from growing unbounded
  if (strategicCache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entry (simple: clear all if at limit, or track insertion order)
    // For simplicity, clear all expired entries first, then if still at limit, clear
    const now = Date.now();
    for (const [k, v] of strategicCache.entries()) {
      if (now - v.at > CACHE_TTL_MS) {
        strategicCache.delete(k);
      }
    }
    
    // If still at limit, clear entire cache (prevent memory leak)
    if (strategicCache.size >= MAX_CACHE_SIZE) {
      strategicCache.clear();
    }
  }
  
  strategicCache.set(key, { at: Date.now(), data });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const { orgId, userId } = await requireAuthContext();
      const { caseId } = await params;

      const supabase = getSupabaseAdminClient();

      // ============================================
      // WAVE 1: Parallelize all required queries
      // ============================================
      const [caseRecordResult, documentsResult, timelineResult, lettersResult, deadlinesResult, bundleResult] = await Promise.allSettled([
        // Required: Case access verification
        supabase
          .from("cases")
          .select("id, practice_area")
          .eq("id", caseId)
          .eq("org_id", orgId)
          .single(),
        
        // Required: Documents
        supabase
          .from("documents")
          .select("id, name, created_at")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .order("created_at", { ascending: false }),
        
        // Required: Timeline
        supabase
          .from("timeline_events")
          .select("event_date, description")
          .eq("case_id", caseId)
          .order("event_date", { ascending: false }),
        
        // Required: Letters
        supabase
          .from("letters")
          .select("id, created_at, template_id")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
        
        // Required: Deadlines (include category for nextHearing computation)
        supabase
          .from("deadlines")
          .select("id, title, due_date, status, category")
          .eq("case_id", caseId)
          .order("due_date", { ascending: false }),
        
        // Optional: Bundle (don't require single() - take most recent if multiple)
        supabase
          .from("bundles")
          .select("id, created_at")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Extract results with fallbacks
      if (caseRecordResult.status === "rejected" || !caseRecordResult.value.data) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }
      const caseRecord = caseRecordResult.value.data;

      const documents = documentsResult.status === "fulfilled" && documentsResult.value.data ? documentsResult.value.data : [];
      const timeline = timelineResult.status === "fulfilled" && timelineResult.value.data ? timelineResult.value.data : [];
      const letters = lettersResult.status === "fulfilled" && lettersResult.value.data ? lettersResult.value.data : [];
      const deadlines = deadlinesResult.status === "fulfilled" && deadlinesResult.value.data ? deadlinesResult.value.data : [];
      
      // Bundle: take first result if available, or undefined
      const bundle = bundleResult.status === "fulfilled" && bundleResult.value.data ? bundleResult.value.data : undefined;

      // ============================================
      // WAVE 2: Compute derived data (no DB calls)
      // ============================================
      // Compute nextHearing from deadlines array
      const nextHearing = deadlines
        .filter(d => d.category === "HEARING" && d.due_date >= new Date().toISOString())
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

      // Build cache fingerprint
      const latestDocAt = documents?.[0]?.created_at ?? "none";
      const docCount = documents?.length ?? 0;
      const timelineCount = timeline?.length ?? 0;
      const cacheKey = getCacheKey(orgId, caseId, latestDocAt, docCount, timelineCount);

      // Check cache
      const cachedResponse = getFromCache(cacheKey);
      if (cachedResponse) {
        return NextResponse.json(cachedResponse, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });
      }

      // Check for chronology and hazard assessment
      const hasChronology = Boolean(timeline && timeline.length > 0);
      const hasHazardAssessment = Boolean(documents?.some(d => 
        d.name.toLowerCase().includes("hazard") ||
        d.name.toLowerCase().includes("hhsrs") ||
        d.name.toLowerCase().includes("assessment")
      ));

      // Detect case role once and reuse
      const { detectCaseRole } = await import("@/lib/strategic/role-detection");
      let caseRole: Awaited<ReturnType<typeof detectCaseRole>>;
      try {
        caseRole = await detectCaseRole({
          caseId,
          orgId,
          practiceArea: caseRecord.practice_area as any,
          documents: documents ?? [],
          timeline: timeline ?? [],
        });
      } catch (error) {
        console.warn("[strategic-overview] Failed to detect case role, defaulting to claimant:", error);
        caseRole = "claimant"; // Default to claimant
      }

      // TODO: Re-implement when medical-evidence-detector is restored
      // Detect medical evidence signals (for claimant clinical negligence cases)
      let medicalEvidenceSignals: { hasMedicalRecords: boolean; hasAandE: boolean; hasRadiology: boolean; hasGP: boolean; confidence: string; matched: string[] } | null = null;
      // if (caseRole === "claimant" && (caseRecord.practice_area === "clinical_negligence" || caseRecord.practice_area === "personal_injury")) {
      //   try {
      //     const { detectMedicalEvidenceSignals } = await import("@/lib/evidence/medical-evidence-detector");
      //     medicalEvidenceSignals = await detectMedicalEvidenceSignals({ caseId, orgId });
      //     
      //     // Dev logging
      //     if (process.env.NODE_ENV !== "production" || process.env.ENABLE_STRATEGIC_DEBUG === "true") {
      //       console.log(`[medical-evidence] hasMedicalRecords=${medicalEvidenceSignals.hasMedicalRecords}, hasAandE=${medicalEvidenceSignals.hasAandE}, hasRadiology=${medicalEvidenceSignals.hasRadiology}, hasGP=${medicalEvidenceSignals.hasGP}, confidence=${medicalEvidenceSignals.confidence}, matched=[${medicalEvidenceSignals.matched.join(", ")}]`);
      //     }
      //   } catch (error) {
      //     console.warn("[strategic-overview] Failed to detect medical evidence signals:", error);
      //   }
      // }

      // Calculate momentum (with case role and medical evidence signals)
      const momentum = await calculateCaseMomentum({
        caseId,
        orgId,
        practiceArea: caseRecord.practice_area as any,
        documents: documents ?? [],
        timeline: timeline ?? [],
        bundleId: bundle?.id,
        letters: letters ?? [],
        deadlines: deadlines ?? [],
        caseRole, // Pass detected role
        medicalEvidenceSignals: medicalEvidenceSignals || undefined, // Pass medical evidence signals if available
      });

      // Generate strategy paths (with case role and momentum state)
      let strategies = await generateStrategyPaths({
        caseId,
        orgId,
        practiceArea: caseRecord.practice_area as any,
        documents: documents ?? [],
        letters: letters ?? [],
        deadlines: deadlines ?? [],
        timeline: timeline ?? [],
        bundleId: bundle?.id,
        hasChronology,
        hasHazardAssessment,
        nextHearingDate: nextHearing?.due_date,
        caseRole, // Pass detected role
        momentumState: momentum.state, // Pass momentum state for enhanced strategy
      });

      // Get weak spots and leverage points
      const weakSpots = await detectOpponentWeakSpots({
        caseId,
        orgId,
        practiceArea: caseRecord.practice_area as any,
        documents: documents ?? [],
        timeline: timeline ?? [],
        bundleId: bundle?.id,
        caseRole,
      });

      const leveragePoints = await detectProceduralLeveragePoints({
        caseId,
        orgId,
        practiceArea: caseRecord.practice_area as any,
        documents: documents ?? [],
        letters: letters ?? [],
        deadlines: deadlines ?? [],
        timeline: timeline ?? [],
        caseRole,
      });

      // Build response object
      const response: any = {
        momentum,
        strategies,
        weakSpots,
        leveragePoints,
      };

      // Add debug info from momentum.debug (no duplicate detectSubstantiveMerits call)
      if (momentum.debug && (process.env.NODE_ENV !== "production" || process.env.ENABLE_STRATEGIC_DEBUG === "true")) {
        response.debug = {
          caseRole,
          substantiveMeritsScore: momentum.debug.substantiveMeritsScore,
          practiceArea: caseRecord.practice_area,
          medicalEvidence: medicalEvidenceSignals,
        };
      }

      // ============================================
      // RECURSIVELY SANITIZE ENTIRE RESPONSE FOR CLAIMANT CASES
      // ============================================
      const sanitizedResponse = sanitizeStrategicResponse(response, caseRole);

      // ============================================
      // CREATE ANALYSIS VERSION RECORD
      // ============================================
      try {
        await createAnalysisVersion({
          supabase,
          caseId,
          orgId,
          userId: userId || null,
          momentum,
          documents,
          timeline,
          caseRecord,
        });
      } catch (versionError) {
        // Log but don't break the API response
        console.error("[strategic-overview] Failed to create analysis version:", versionError);
      }

      // Cache the sanitized response (only if no error)
      if (!sanitizedResponse.error) {
        setCache(cacheKey, sanitizedResponse);
      }

      // Return with cache control headers to prevent caching
      return NextResponse.json(sanitizedResponse, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    } catch (error) {
      console.error("Failed to generate strategic overview:", error);
      return NextResponse.json(
        { error: "Failed to generate strategic overview" },
        { status: 500 },
      );
    }
  });
}

/**
 * Create a new analysis version record
 */
async function createAnalysisVersion(params: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  caseId: string;
  orgId: string;
  userId: string | null;
  momentum: Awaited<ReturnType<typeof calculateCaseMomentum>>;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  caseRecord: { id: string; practice_area: string | null };
}): Promise<void> {
  const { supabase, caseId, orgId, userId, momentum, documents, timeline, caseRecord } = params;

  // Get previous version to compute delta
  const { data: prevVersion } = await supabase
    .from("case_analysis_versions")
    .select("risk_rating, summary, key_issues, timeline, missing_evidence")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get next version number
  const { data: latestVersion } = await supabase
    .from("case_analysis_versions")
    .select("version_number")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersionNumber = latestVersion ? (latestVersion as any).version_number + 1 : 1;

  // Build missing evidence list
  const docsForEvidence = documents.map((d) => ({
    name: d.name,
    type: undefined,
    extracted_json: undefined,
  }));
  const missingEvidence = findMissingEvidence(
    caseId,
    caseRecord.practice_area || "other_litigation",
    docsForEvidence,
  );

  // Convert missing evidence to version format
  const missingEvidenceFormatted = missingEvidence.map((item) => ({
    area: mapCategoryToArea(item.category),
    label: item.label,
    priority: item.priority,
    notes: item.reason,
  }));

  // Build key issues from momentum shifts and other sources
  const keyIssues: Array<{
    type: string;
    label: string;
    severity: string;
    notes?: string;
  }> = [];

  // Add issues from momentum shifts
  if (momentum.shifts) {
    for (const shift of momentum.shifts) {
      if (shift.impact === "NEGATIVE") {
        // Infer issue type from factor text
        let issueType = "procedural";
        const factorLower = shift.factor.toLowerCase();
        if (factorLower.includes("breach") || factorLower.includes("negligence")) {
          issueType = "breach";
        } else if (factorLower.includes("causation") || factorLower.includes("caused")) {
          issueType = "causation";
        } else if (factorLower.includes("harm") || factorLower.includes("injury")) {
          issueType = "harm";
        }

        keyIssues.push({
          type: issueType,
          label: shift.factor,
          severity: shift.impact === "NEGATIVE" ? "HIGH" : "MEDIUM",
          notes: shift.description,
        });
      }
    }
  }

  // Build timeline from timeline events
  const timelineFormatted = timeline.map((event) => ({
    date: event.event_date,
    description: event.description,
  }));

  // Map momentum state to risk rating
  const riskRating = mapMomentumToRiskRating(momentum.state);

  // Build summary (3-5 lines)
  const summary = buildVersionSummary(momentum, missingEvidence);

  // Create current snapshot
  const currentSnapshot = {
    risk_rating: riskRating,
    summary,
    key_issues: keyIssues,
    timeline: timelineFormatted,
    missing_evidence: missingEvidenceFormatted,
  };

  // Compute delta
  const delta = computeAnalysisDelta(prevVersion, currentSnapshot);

  // Get document IDs
  const documentIds = documents.map((d) => d.id);

  // Insert new version (wrapped in transaction-like error handling)
  const { error: insertError } = await supabase
    .from("case_analysis_versions")
    .insert({
      case_id: caseId,
      org_id: orgId,
      version_number: nextVersionNumber,
      document_ids: documentIds,
      risk_rating: riskRating,
      summary,
      key_issues: keyIssues,
      timeline: timelineFormatted,
      missing_evidence: missingEvidenceFormatted,
      analysis_delta: delta,
      created_by: userId,
    });

  if (insertError) {
    throw new Error(`Failed to insert analysis version: ${insertError.message}`);
  }

  // Update case with latest version number
  await supabase
    .from("cases")
    .update({ latest_analysis_version: nextVersionNumber })
    .eq("id", caseId);

  // Log version creation
  console.log(`[analysis-version] Created version ${nextVersionNumber} for case ${caseId}, momentum: ${momentum.state}, documents: ${documentIds.length}`);
}

/**
 * Map momentum state to risk rating string
 */
function mapMomentumToRiskRating(state: string): string {
  const mapping: Record<string, string> = {
    WEAK: "WEAK",
    BALANCED: "BALANCED",
    "STRONG (Expert Pending)": "STRONG_PENDING",
    STRONG: "STRONG",
  };
  return mapping[state] || "BALANCED";
}

/**
 * Map evidence category to area
 */
function mapCategoryToArea(category: string): string {
  const mapping: Record<string, string> = {
    LIABILITY: "medical_records",
    CAUSATION: "expert",
    QUANTUM: "witness",
    PROCEDURE: "admin",
    HOUSING: "other",
  };
  return mapping[category] || "other";
}

/**
 * Build version summary (3-5 lines)
 */
function buildVersionSummary(
  momentum: Awaited<ReturnType<typeof calculateCaseMomentum>>,
  missingEvidence: Array<{ label: string; priority: string }>,
): string {
  const lines: string[] = [];
  
  // Line 1: Momentum state
  lines.push(momentum.explanation || `Case momentum is ${momentum.state.toLowerCase()}.`);

  // Line 2-3: Key factors
  if (momentum.shifts && momentum.shifts.length > 0) {
    const positiveShifts = momentum.shifts.filter((s) => s.impact === "POSITIVE").slice(0, 2);
    const negativeShifts = momentum.shifts.filter((s) => s.impact === "NEGATIVE").slice(0, 2);
    
    if (positiveShifts.length > 0) {
      lines.push(`Key strengths: ${positiveShifts.map((s) => s.factor).join(", ")}.`);
    }
    if (negativeShifts.length > 0) {
      lines.push(`Areas of concern: ${negativeShifts.map((s) => s.factor).join(", ")}.`);
    }
  }

  // Line 4-5: Missing evidence summary
  const criticalMissing = missingEvidence.filter((m) => m.priority === "CRITICAL" || m.priority === "HIGH");
  if (criticalMissing.length > 0) {
    lines.push(`Missing evidence: ${criticalMissing.slice(0, 3).map((m) => m.label).join(", ")}.`);
  }

  return lines.join(" ");
}
