import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseContext } from "@/lib/case-context";
import { makeOk, makeGateFail, makeNotFound, makeError, type ApiResponse } from "@/lib/api/response";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";
import { gatePaceAffirmativeStatus } from "@/lib/criminal/pace-affirmative-gate";
import { buildFindingProvenance } from "@/lib/criminal/finding-provenance";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/pace
 * Fetch PACE compliance information
 * GATED: Returns banner + minimal data if canGenerateAnalysis is false
 */
export async function GET(_request: Request, { params }: RouteParams) {
  let caseId: string;
  try {
    const resolved = await params;
    caseId = resolved.caseId;
  } catch {
    return makeError<{
      paceStatus: string;
      breaches: string[];
      cautionGiven: boolean | null;
      interviewRecorded: boolean | null;
      rightToSolicitor: boolean | null;
      solicitorPresent: boolean | null;
    }>(
      "PACE_ERROR",
      "Invalid case ID",
      {
        case: null,
        orgScope: { orgIdResolved: "", method: "solo_fallback" },
        documents: [],
        diagnostics: {
          docCount: 0,
          rawCharsTotal: 0,
          jsonCharsTotal: 0,
          extractedSummaryCharsTotal: 0,
          effectiveCharsTotal: 0,
          avgRawCharsPerDoc: 0,
          suspectedScanned: false,
          reasonCodes: [],
        },
        canGenerateAnalysis: false,
      },
      "",
    );
  }

  try {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId } = authRes.context;

    // Build case context and gate analysis
    const context = await buildCaseContext(caseId, { userId });

    if (!context.case) {
      return makeNotFound<{
        paceStatus: string;
        breaches: string[];
        cautionGiven: boolean | null;
        interviewRecorded: boolean | null;
        rightToSolicitor: boolean | null;
        solicitorPresent: boolean | null;
      }>(context, caseId);
    }

    // Check analysis gate (hard gating)
    const gateResult = checkAnalysisGate(context);
    if (!gateResult.ok) {
      return makeGateFail<{
        paceStatus: string;
        breaches: string[];
        cautionGiven: boolean | null;
        interviewRecorded: boolean | null;
        rightToSolicitor: boolean | null;
        solicitorPresent: boolean | null;
      }>(
        {
          severity: gateResult.banner?.severity || "warning",
          title: gateResult.banner?.title || "Insufficient text extracted",
          detail: gateResult.banner?.detail,
        },
        context,
        caseId,
      );
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
      return makeError<{
        paceStatus: string;
        breaches: string[];
        cautionGiven: boolean | null;
        interviewRecorded: boolean | null;
        rightToSolicitor: boolean | null;
        solicitorPresent: boolean | null;
      }>(
        "PACE_ERROR",
        "Failed to fetch PACE compliance",
        context,
        caseId,
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

      // If extraction found PACE data, use shared affirmative gate (never OK on clock conflict / incomplete provenance).
      if (extractedPACE) {
        const combinedForClock =
          context.documents
            .map((d) => (typeof d.raw_text === "string" ? d.raw_text : ""))
            .join("\n") || "";
        const gate = gatePaceAffirmativeStatus({
          custodyRecord: extractedPACE.custodyRecord,
          interviewRecording: extractedPACE.interviewRecording,
          legalAdviceLog: extractedPACE.legalAdviceLog,
          breachesDetected: extractedPACE.breachesDetected || [],
          bundleText: combinedForClock,
          provenance: buildFindingProvenance({
            evidenceState: extractedPACE.status === "issues_detected" ? "not_safely_confirmed" : "served",
          }),
        });

        return makeOk(
          {
            cautionGiven: extractedPACE.custodyRecord === "present" ? true : null,
            cautionGivenBeforeQuestioning: null,
            interviewRecorded: extractedPACE.interviewRecording === "present" ? true : null,
            rightToSolicitor: extractedPACE.legalAdviceLog === "present" ? true : null,
            solicitorPresent: extractedPACE.legalAdviceLog === "present" ? true : null,
            detentionTimeHours: null,
            detentionTimeExceeded: null,
            breachesDetected: extractedPACE.breachesDetected || [],
            breachSeverity: extractedPACE.breachSeverity,
            paceStatus: gate.paceStatus,
            statusMessage: gate.statusMessage,
            extracted: true, // Flag to indicate this was extracted, not from DB
          },
          context,
          caseId,
        );
      }

      // Fallback: check if critical evidence exists in documents (old logic) — still gated.
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
      const hasLegalAdviceLog = /legal\s+advice|solicitor\s+present|legal\s+representative/i.test(corpus);
      const hasCautionSolicitorFlags = /caution|right\s+to\s+solicitor|legal\s+advice/i.test(corpus);
      
      const criticalPaceMissing = !hasCustodyRecord || !hasInterviewRecording || !hasLegalAdviceLog || !hasCautionSolicitorFlags;
      const gate = gatePaceAffirmativeStatus({
        custodyRecord: hasCustodyRecord ? "present" : "missing",
        interviewRecording: hasInterviewRecording ? "present" : "missing",
        legalAdviceLog: hasLegalAdviceLog ? "present" : "missing",
        breachesDetected: [],
        bundleText: corpus,
        criticalMaterialMissing: criticalPaceMissing,
        provenance: buildFindingProvenance({ evidenceState: criticalPaceMissing ? "missing" : "served" }),
      });
      
      const missingItems: string[] = [];
      if (!hasCustodyRecord) missingItems.push("custody record");
      if (!hasInterviewRecording) missingItems.push("interview recording/transcript");
      if (!hasLegalAdviceLog || !hasCautionSolicitorFlags) missingItems.push("legal advice/solicitor attendance");
      
      return makeOk(
        {
          cautionGiven: hasCautionSolicitorFlags ? true : null,
          cautionGivenBeforeQuestioning: null,
          interviewRecorded: hasInterviewRecording ? true : null,
          rightToSolicitor: hasLegalAdviceLog ? true : null,
          solicitorPresent: hasLegalAdviceLog ? true : null,
          detentionTimeHours: null,
          detentionTimeExceeded: null,
          breachesDetected: [],
          breachSeverity: null,
          paceStatus: gate.paceStatus,
          statusMessage: gate.statusMessage,
          extracted: false,
        },
        context,
        caseId,
      );
    }

    // Check if critical PACE evidence fields are all null (missing)
    const criticalMissing = 
      pace.caution_given === null &&
      pace.interview_recorded === null &&
      pace.right_to_solicitor === null &&
      pace.solicitor_present === null;

    const bundleText = context.documents
      .map((d) => (typeof d.raw_text === "string" ? d.raw_text : ""))
      .join("\n");
    const gate = gatePaceAffirmativeStatus({
      custodyRecord: pace.caution_given === null ? (criticalMissing ? "missing" : "unclear") : pace.caution_given ? "present" : "missing",
      interviewRecording:
        pace.interview_recorded === null
          ? criticalMissing
            ? "missing"
            : "unclear"
          : pace.interview_recorded
            ? "present"
            : "missing",
      legalAdviceLog:
        pace.right_to_solicitor === null && pace.solicitor_present === null
          ? criticalMissing
            ? "missing"
            : "unclear"
          : pace.right_to_solicitor || pace.solicitor_present
            ? "present"
            : "missing",
      breachesDetected: Array.isArray(pace.breaches_detected) ? pace.breaches_detected : [],
      bundleText,
      criticalMaterialMissing: criticalMissing,
      provenance: buildFindingProvenance({
        evidenceState: criticalMissing ? "missing" : "served",
      }),
    });
    paceStatus = gate.paceStatus;
    const statusMessage = gate.statusMessage;

    return makeOk(
      {
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
      },
      context,
      caseId,
    );
  } catch (error) {
    console.error("[criminal/pace] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch PACE compliance";
    try {
      const authRes = await requireAuthContextApi();
      if (authRes.ok) {
        const { userId } = authRes.context;
        const context = await buildCaseContext(caseId, { userId });
        return makeError<{
          paceStatus: string;
          breaches: string[];
          cautionGiven: boolean | null;
          interviewRecorded: boolean | null;
          rightToSolicitor: boolean | null;
          solicitorPresent: boolean | null;
        }>("PACE_ERROR", errorMessage, context, caseId);
      }
    } catch {
      // Fallback
    }
    return makeError<{
      paceStatus: string;
      breaches: string[];
      cautionGiven: boolean | null;
      interviewRecorded: boolean | null;
      rightToSolicitor: boolean | null;
      solicitorPresent: boolean | null;
    }>(
      "PACE_ERROR",
      errorMessage,
      {
        case: null,
        orgScope: { orgIdResolved: "", method: "solo_fallback" },
        documents: [],
        diagnostics: {
          docCount: 0,
          rawCharsTotal: 0,
          jsonCharsTotal: 0,
          extractedSummaryCharsTotal: 0,
          effectiveCharsTotal: 0,
          avgRawCharsPerDoc: 0,
          suspectedScanned: false,
          reasonCodes: [],
        },
        canGenerateAnalysis: false,
      },
      caseId,
    );
  }
}

