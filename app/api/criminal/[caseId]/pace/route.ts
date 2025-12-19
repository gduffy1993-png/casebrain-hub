import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/pace
 * Fetch PACE compliance information
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: pace, error } = await supabase
      .from("pace_compliance")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("[criminal/pace] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch PACE compliance" },
        { status: 500 },
      );
    }

    // Determine paceStatus based on evidence presence and breaches
    let paceStatus: "UNKNOWN" | "CHECKED_NO_BREACHES" | "BREACH_FLAGGED" = "UNKNOWN";
    
    if (!pace) {
      // No PACE data at all - check if critical evidence exists in documents
      const { data: documents } = await supabase
        .from("documents")
        .select("name, extracted_json")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .limit(50);
      
      const corpus = (documents ?? [])
        .map((d: any) => [d.name ?? "", JSON.stringify(d.extracted_json ?? {})].join(" "))
        .join(" ")
        .toLowerCase();
      
      const hasCustodyRecord = /custody\s+record|custody\s+review|legal\s+advice/i.test(corpus);
      const hasInterviewRecording = /interview\s+recording|audio\s+interview|video\s+interview|transcript/i.test(corpus);
      const hasLegalAdviceLog = /legal\s+advice|solicitor|legal\s+representative/i.test(corpus);
      const hasCautionSolicitorFlags = /caution|right\s+to\s+solicitor|legal\s+advice/i.test(corpus);
      
      const criticalPaceMissing = !hasCustodyRecord || !hasInterviewRecording || !hasLegalAdviceLog || !hasCautionSolicitorFlags;
      paceStatus = criticalPaceMissing ? "UNKNOWN" : "CHECKED_NO_BREACHES";
      
      const missingItems: string[] = [];
      if (!hasCustodyRecord) missingItems.push("custody record");
      if (!hasInterviewRecording) missingItems.push("interview recording/transcript");
      if (!hasLegalAdviceLog || !hasCautionSolicitorFlags) missingItems.push("legal advice/solicitor attendance");
      
      const statusMessage = criticalPaceMissing
        ? `PACE status: UNKNOWN — key ${missingItems.join(", ")} material missing in provided bundle`
        : "No PACE breaches detected (in provided material)";
      
      return NextResponse.json({
        cautionGiven: null,
        cautionGivenBeforeQuestioning: null,
        interviewRecorded: null,
        rightToSolicitor: null,
        solicitorPresent: null,
        detentionTimeHours: null,
        detentionTimeExceeded: null,
        breachesDetected: [],
        breachSeverity: null,
        paceStatus,
        statusMessage,
      });
    }

    // Check if critical PACE evidence fields are all null (missing)
    const criticalMissing = 
      pace.caution_given === null &&
      pace.interview_recorded === null &&
      pace.right_to_solicitor === null &&
      pace.solicitor_present === null;

    const hasBreaches = (pace.breaches_detected && Array.isArray(pace.breaches_detected) && pace.breaches_detected.length > 0) ||
                        (pace.breach_severity && pace.breach_severity !== "LOW");

    if (criticalMissing) {
      paceStatus = "UNKNOWN";
    } else if (hasBreaches) {
      paceStatus = "BREACH_FLAGGED";
    } else {
      paceStatus = "CHECKED_NO_BREACHES";
    }

    // Build status message
    let statusMessage: string;
    if (paceStatus === "UNKNOWN") {
      const missingItems: string[] = [];
      if (pace.caution_given === null) missingItems.push("caution");
      if (pace.interview_recorded === null) missingItems.push("interview recording/transcript");
      if (pace.right_to_solicitor === null || pace.solicitor_present === null) missingItems.push("legal advice/solicitor attendance");
      
      if (missingItems.length > 0) {
        statusMessage = `PACE status: UNKNOWN — key ${missingItems.join(", ")} material missing in provided bundle`;
      } else {
        statusMessage = "PACE status: UNKNOWN — key custody/interview/legal advice material missing in provided bundle";
      }
    } else if (paceStatus === "BREACH_FLAGGED") {
      statusMessage = "PACE breaches detected";
    } else {
      statusMessage = "No PACE breaches detected (in provided material)";
    }

    return NextResponse.json({
      cautionGiven: pace.caution_given,
      cautionGivenBeforeQuestioning: pace.caution_given_before_questioning,
      interviewRecorded: pace.interview_recorded,
      rightToSolicitor: pace.right_to_solicitor,
      solicitorPresent: pace.solicitor_present,
      detentionTimeHours: pace.detention_time_hours,
      detentionTimeExceeded: pace.detention_time_exceeded,
      breachesDetected: pace.breaches_detected || [],
      breachSeverity: pace.breach_severity,
      paceStatus,
      statusMessage,
    });
  } catch (error) {
    console.error("[criminal/pace] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch PACE compliance" },
      { status: 500 },
    );
  }
}

