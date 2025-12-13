/**
 * GET /api/strategic/[caseId]/overview
 * 
 * Returns combined strategic overview for a case (momentum + strategies)
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
import { detectSubstantiveMerits } from "@/lib/strategic/substantive-merits";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const { orgId } = await requireAuthContext();
      const { caseId } = await params;

    // Verify case access
    const supabase = getSupabaseAdminClient();
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get case data
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    const { data: letters } = await supabase
      .from("letters")
      .select("id, created_at, template_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    const { data: deadlines } = await supabase
      .from("deadlines")
      .select("id, title, due_date, status")
      .eq("case_id", caseId)
      .order("due_date", { ascending: false });

    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("event_date, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: false });

    const { data: bundle } = await supabase
      .from("bundles")
      .select("id")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .single();

    // Get next hearing date
    const { data: nextHearing } = await supabase
      .from("deadlines")
      .select("due_date")
      .eq("case_id", caseId)
      .eq("category", "HEARING")
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(1)
      .single();

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

    // Get substantive merits score for debug
    let substantiveMeritsScore = 0;
    try {
      if (caseRole === "claimant" && (caseRecord.practice_area === "clinical_negligence" || caseRecord.practice_area === "personal_injury")) {
        const merits = await detectSubstantiveMerits({
          caseId,
          orgId,
          documents: documents ?? [],
          timeline: timeline ?? [],
        });
        substantiveMeritsScore = merits.totalScore;
      }
    } catch (error) {
      console.warn("[strategic-overview] Failed to get substantive merits score:", error);
    }

    // Build response object
    const response: any = {
      momentum,
      strategies,
      weakSpots,
      leveragePoints,
    };

    // Add debug info (server-side only, or in non-production)
    if (process.env.NODE_ENV !== "production" || process.env.ENABLE_STRATEGIC_DEBUG === "true") {
      response.debug = {
        caseRole,
        substantiveMeritsScore,
        practiceArea: caseRecord.practice_area,
      };
    }

    // ============================================
    // RECURSIVELY SANITIZE ENTIRE RESPONSE FOR CLAIMANT CASES
    // ============================================
    const sanitizedResponse = sanitizeStrategicResponse(response, caseRole);

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

