import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseContext, guardAnalysis, AnalysisGateError } from "@/lib/case-context";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/pace
 * Fetch PACE compliance information
 * GATED: Returns banner + minimal data if canGenerateAnalysis is false
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    // Build case context and gate analysis
    const context = await buildCaseContext(caseId, { userId });
    
    try {
      guardAnalysis(context);
    } catch (error) {
      if (error instanceof AnalysisGateError) {
        return NextResponse.json({
          ok: false,
          paceStatus: "UNKNOWN",
          breaches: [],
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

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
      // No PACE data in DB - extract from raw_text (same approach as Evidence Strength Analyzer)
      let extractedPACE: any = null;
      
      if (context.documents.length > 0) {
        // Combine all raw_text from documents
        let combinedText = "";
        for (const doc of context.documents) {
          if (doc.raw_text && typeof doc.raw_text === "string" && doc.raw_text.length > 0) {
            combinedText += " " + doc.raw_text;
          }
        }

        if (combinedText.length > 500) {
          // Extract PACE from raw text using structured extractor
          const { extractCriminalCaseMeta } = await import("@/lib/criminal/structured-extractor");
          const meta = extractCriminalCaseMeta({
            text: combinedText,
            documentName: "Combined Bundle",
            now: new Date(),
          });

          extractedPACE = meta.pace;
        }
      }

      // If extraction found PACE data, use it
      if (extractedPACE) {
        const hasBreaches = extractedPACE.breachesDetected && extractedPACE.breachesDetected.length > 0;
        paceStatus = hasBreaches ? "BREACH_FLAGGED" : "CHECKED_NO_BREACHES";

        return NextResponse.json({
          cautionGiven: extractedPACE.custodyRecord === "present" ? true : null,
          cautionGivenBeforeQuestioning: null,
          interviewRecorded: extractedPACE.interviewRecording === "present" ? true : null,
          rightToSolicitor: extractedPACE.legalAdviceLog === "present" ? true : null,
          solicitorPresent: extractedPACE.legalAdviceLog === "present" ? true : null,
          detentionTimeHours: null,
          detentionTimeExceeded: null,
          breachesDetected: extractedPACE.breachesDetected || [],
          breachSeverity: extractedPACE.breachSeverity,
          paceStatus,
          statusMessage: hasBreaches
            ? "PACE breaches detected"
            : "No PACE breaches detected (in provided material)",
          extracted: true, // Flag to indicate this was extracted, not from DB
        });
      }

      // Fallback: check if critical evidence exists in documents (old logic)
      const corpus = context.documents
        .map((d) => {
          let text = "";
          if (d.raw_text) text += " " + d.raw_text;
          if (d.extracted_json) text += " " + JSON.stringify(d.extracted_json);
          return text;
        })
        .join(" ")
        .toLowerCase();
      
      const hasCustodyRecord = /custody\s+record|custody\s+review|legal\s+advice/i.test(corpus);
      const hasInterviewRecording = /interview\s+recording|audio\s+interview|video\s+interview|transcript|recorded\s+interview/i.test(corpus);
      const hasLegalAdviceLog = /legal\s+advice|solicitor\s+present|legal\s+representative|jennifer\s+walsh/i.test(corpus);
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
        cautionGiven: hasCautionSolicitorFlags ? true : null,
        cautionGivenBeforeQuestioning: null,
        interviewRecorded: hasInterviewRecording ? true : null,
        rightToSolicitor: hasLegalAdviceLog ? true : null,
        solicitorPresent: hasLegalAdviceLog ? true : null,
        detentionTimeHours: null,
        detentionTimeExceeded: null,
        breachesDetected: [],
        breachSeverity: null,
        paceStatus,
        statusMessage,
        extracted: false,
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

