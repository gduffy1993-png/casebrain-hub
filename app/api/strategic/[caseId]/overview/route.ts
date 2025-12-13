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
      const { orgId } = await requireAuthContext();
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

      // Calculate momentum (with case role)
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
      });

      // Generate strategy paths (with case role)
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
        };
      }

      // ============================================
      // RECURSIVELY SANITIZE ENTIRE RESPONSE FOR CLAIMANT CASES
      // ============================================
      const sanitizedResponse = sanitizeStrategicResponse(response, caseRole);

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
