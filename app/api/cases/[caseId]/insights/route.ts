import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseInsights } from "@/lib/core/insights";
import { findMissingEvidence } from "@/lib/missing-evidence";
import type { CaseInsights } from "@/lib/core/enterprise-types";
import type { LimitationInfo } from "@/lib/types/casebrain";
import { buildCaseContext } from "@/lib/case-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build canonical case context (single source of truth)
    const context = await buildCaseContext(caseId, { userId });
    const supabase = getSupabaseAdminClient();
    const reasonCodes = context.diagnostics.reasonCodes;

    // Gate 1: Case not found
    if (!context.case || reasonCodes.includes("CASE_NOT_FOUND")) {
      console.log(`[insights] Gate triggered: CASE_NOT_FOUND for caseId=${caseId}`);
      const fallbackInsights: CaseInsights = {
        summary: {
          headline: "Case not found",
          oneLiner: "Case not found for your org scope (legacy org_id mismatch).",
          stageLabel: null,
          practiceArea: null,
          clientName: null,
          opponentName: null,
        },
        rag: {
          overallLevel: "amber",
          overallScore: 50,
          scores: [],
        },
        briefing: {
          overview: "Case not found for your org scope (legacy org_id mismatch). Re-upload or contact support.",
          keyStrengths: [],
          keyRisks: [],
          urgentActions: [],
        },
        meta: {
          caseId,
          updatedAt: new Date().toISOString(),
          hasCoreEvidence: false,
          missingCriticalCount: 0,
          missingHighCount: 0,
        },
      };

      return NextResponse.json({
        insights: fallbackInsights,
        banner: context.banner || {
          severity: "error",
          title: "Case not found",
          message: "Case not found for your org scope. Re-upload or contact support.",
        },
        diagnostics: context.diagnostics,
      }, { status: 200 });
    }

    // Define caseRecord once (used in multiple gates and final path)
    const caseRecord = {
      id: context.case.id,
      title: (context.case as any).title ?? null,
      summary: (context.case as any).summary ?? null,
      practice_area: (context.case as any).practice_area ?? null,
      supervisor_reviewed: (context.case as any).supervisor_reviewed ?? null,
      created_at: (context.case as any).created_at ?? new Date().toISOString(),
    };

    // Gate 2: No documents
    if (reasonCodes.includes("DOCS_NONE")) {
      console.log(`[insights] Gate triggered: DOCS_NONE for caseId=${caseId}`);
      // Still generate minimal insights from case data, but with banner
      const orgId = context.orgScope.orgIdResolved;
      let insights: CaseInsights;
      try {
        insights = await buildCaseInsights({
          caseId,
          orgId,
          caseRecord: {
            id: context.case.id,
            title: (context.case as any).title ?? "",
            summary: (context.case as any).summary ?? null,
            practice_area: (context.case as any).practice_area ?? null,
            status: (context.case as any).status ?? null,
            created_at: (context.case as any).created_at ?? new Date().toISOString(),
          },
          documents: [],
          riskFlags: [],
          missingEvidence: [],
          limitationInfo: undefined,
          keyIssues: [],
          nextSteps: [],
          supervisorReviewed: (context.case as any).supervisor_reviewed ?? false,
          daysSinceLastUpdate: 30,
        });
      } catch {
        insights = {
          summary: {
            headline: "No documents found",
            oneLiner: "Upload documents to generate insights.",
            stageLabel: null,
            practiceArea: null,
            clientName: null,
            opponentName: null,
          },
          rag: {
            overallLevel: "amber",
            overallScore: 50,
            scores: [],
          },
          briefing: {
            overview: "No documents found for this case. Upload documents to generate full insights.",
            keyStrengths: [],
            keyRisks: [],
            urgentActions: [],
          },
          meta: {
            caseId,
            updatedAt: new Date().toISOString(),
            hasCoreEvidence: false,
            missingCriticalCount: 0,
            missingHighCount: 0,
          },
        };
      }

      return NextResponse.json({
        insights,
        banner: context.banner || {
          severity: "info",
          title: "No documents found",
          message: "No documents found for this case. Upload documents to generate full insights.",
        },
        diagnostics: context.diagnostics,
      });
    }

    // Gate 3: Facts-first gating - if suspected scanned or text is too thin, DO NOT generate strategy
    // This prevents "jumble mumble" outputs when extraction is empty
    // Explicit check: NEVER generate strategy when rawCharsTotal is 0
    if (context.diagnostics.rawCharsTotal === 0 || reasonCodes.includes("SCANNED_SUSPECTED") || reasonCodes.includes("TEXT_THIN")) {
      console.log(`[insights] Gate triggered: ${reasonCodes.includes("SCANNED_SUSPECTED") ? "SCANNED_SUSPECTED" : "TEXT_THIN"} for caseId=${caseId}, rawChars=${context.diagnostics.rawCharsTotal}, jsonChars=${context.diagnostics.jsonCharsTotal}`);
      
      // Return minimal insights - DO NOT generate strategy when text is too thin
      const fallbackInsights: CaseInsights = {
        summary: {
          headline: "Insufficient text extracted",
          oneLiner: "Not enough extractable text to generate reliable insights.",
          stageLabel: null,
          practiceArea: (context.case as any).practice_area ?? null,
          clientName: null,
          opponentName: null,
        },
        rag: {
          overallLevel: "amber",
          overallScore: 50,
          scores: [],
        },
        briefing: {
          overview: "Not enough extractable text to generate reliable insights. Upload text-based PDFs or run OCR, then re-analyse.",
          keyStrengths: [],
          keyRisks: ["Insufficient text extracted from documents."],
          urgentActions: ["Upload text-based PDFs or run OCR to enable analysis."],
        },
        meta: {
          caseId,
          updatedAt: new Date().toISOString(),
          hasCoreEvidence: false,
          missingCriticalCount: 0,
          missingHighCount: 0,
        },
      };

      return NextResponse.json({
        insights: fallbackInsights,
        banner: context.banner || {
          severity: "warning",
          title: "Insufficient text extracted",
          message: "Not enough extractable text to generate reliable insights. Upload text-based PDFs or run OCR, then re-analyse.",
        },
        diagnostics: context.diagnostics,
      });
    }

    // Gate 4: OK - case and documents found with extractable text
    // Only proceed to generate Insights if context is OK
    if (!reasonCodes.includes("OK")) {
      console.warn(`[insights] Unexpected reasonCodes for caseId=${caseId}: [${reasonCodes.join(", ")}]`);
    }

    console.log(`[insights] Generating Insights for caseId=${caseId}, docCount=${context.diagnostics.docCount}, rawChars=${context.diagnostics.rawCharsTotal}`);

    // Use documents from context
    const documents = context.documents.map(d => ({
      id: d.id,
      name: d.name,
      type: undefined as string | undefined,
      created_at: d.created_at,
      extracted_json: d.extracted_json,
    }));

    // Fetch risks using resolved orgId from context
    const { data: riskFlagsData } = await supabase
      .from("risk_flags")
      .select("id, flag_type, severity, description, category, resolved, detected_at")
      .eq("case_id", caseId)
      .eq("org_id", context.orgScope.orgIdResolved)
      .eq("resolved", false);
    const riskFlags = riskFlagsData ?? [];

    // Fetch missing evidence
    const docsForEvidence = (documents ?? []).map((d) => ({
      name: d.name,
      type: d.type ?? undefined,
      extracted_json: d.extracted_json ?? undefined,
    }));
    const missingEvidence = findMissingEvidence(
      caseId,
      caseRecord.practice_area ?? "other_litigation",
      docsForEvidence,
    );

    // Fetch limitation using resolved orgId from context
    const { data: limitationData } = await supabase
      .from("limitation_info")
      .select("primary_limitation_date, days_remaining, is_expired, severity")
      .eq("case_id", caseId)
      .eq("org_id", context.orgScope.orgIdResolved)
      .maybeSingle();

    // Convert limitation
    const limitationInfo: LimitationInfo | undefined = limitationData ? {
      caseId,
      causeOfAction: "",
      primaryLimitationDate: limitationData.primary_limitation_date ?? "",
      daysRemaining: limitationData.days_remaining ?? 0,
      isExpired: limitationData.is_expired ?? false,
      severity: (limitationData.severity?.toUpperCase() ?? "LOW") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      practiceArea: (caseRecord.practice_area ?? "other_litigation") as any,
    } : undefined;

    // Fetch key issues using resolved orgId from context
    const { data: keyIssuesData } = await supabase
      .from("key_issues")
      .select("id, label, description, category")
      .eq("case_id", caseId)
      .eq("org_id", context.orgScope.orgIdResolved);
    const keyIssues = keyIssuesData ?? [];

    // Fetch next steps using resolved orgId from context
    const { data: nextStepsData } = await supabase
      .from("next_steps")
      .select("id, action, priority, due_date")
      .eq("case_id", caseId)
      .eq("org_id", context.orgScope.orgIdResolved)
      .eq("completed", false);
    const nextSteps = nextStepsData ?? [];

    // Fetch recent notes using resolved orgId from context
    const { data: recentNotesData } = await supabase
      .from("case_notes")
      .select("created_at")
      .eq("case_id", caseId)
      .eq("org_id", context.orgScope.orgIdResolved)
      .order("created_at", { ascending: false })
      .limit(1);
    const recentNotes = recentNotesData ?? [];

    const daysSinceLastUpdate = recentNotes?.[0]?.created_at
      ? Math.floor((Date.now() - new Date(recentNotes[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    // Build insights - wrap in try-catch to ensure we always return something
    const orgId = context.orgScope.orgIdResolved;
    let insights: CaseInsights;
    try {
      console.log("[insights] Building insights for case:", caseId, {
        documentCount: documents?.length ?? 0,
        riskFlagCount: riskFlags?.length ?? 0,
        missingEvidenceCount: missingEvidence.length,
        hasLimitationInfo: !!limitationInfo,
        keyIssuesCount: keyIssues?.length ?? 0,
        nextStepsCount: nextSteps?.length ?? 0,
      });
      
      insights = await buildCaseInsights({
        caseId,
        orgId,
        caseRecord: {
          id: caseRecord.id,
          title: caseRecord.title ?? "",
          summary: caseRecord.summary ?? null,
          practice_area: caseRecord.practice_area ?? null,
          created_at: caseRecord.created_at,
        },
        documents: (documents ?? []).map(d => ({
          id: d.id,
          name: d.name,
          type: d.type ?? null,
        })),
        riskFlags: (riskFlags ?? []).map(rf => ({
          id: rf.id,
          flag_type: rf.flag_type,
          severity: rf.severity,
          description: rf.description,
          category: rf.category ?? null,
          resolved: rf.resolved ?? false,
        })),
        missingEvidence,
        limitationInfo,
        keyIssues: (keyIssues ?? []).map(ki => ({
          id: ki.id,
          label: ki.label,
          category: ki.category ?? null,
        })),
        nextSteps: (nextSteps ?? []).map(ns => ({
          id: ns.id,
          action: ns.action ?? "",
          priority: ns.priority ?? null,
        })),
        supervisorReviewed: caseRecord.supervisor_reviewed ?? false,
        daysSinceLastUpdate,
      });
      
      console.log("[insights] Successfully built insights:", {
        hasSummary: !!insights.summary,
        hasRag: !!insights.rag,
        hasBriefing: !!insights.briefing,
        briefingOverview: insights.briefing?.overview?.substring(0, 100),
      });
    } catch (buildError) {
      console.error("[insights] Error building insights:", buildError);
      console.error("[insights] Error stack:", buildError instanceof Error ? buildError.stack : "No stack trace");
      console.error("[insights] Error details:", {
        caseId,
        orgId: context.orgScope.orgIdResolved,
        method: context.orgScope.method,
        documentCount: documents?.length ?? 0,
        errorMessage: buildError instanceof Error ? buildError.message : String(buildError),
        errorName: buildError instanceof Error ? buildError.name : typeof buildError,
      });
      // Re-throw to be caught by outer catch which will return fallback
      throw buildError;
    }

    // Return insights in consistent format (not wrapped in ApiResponse for this endpoint)
    return NextResponse.json(insights);
  } catch (error) {
    console.error("[insights] Top-level error:", error);
    console.error("[insights] Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("[insights] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[insights] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Return a safe fallback instead of throwing
    const fallbackInsights: CaseInsights = {
      summary: {
        headline: "Case created – no documents uploaded",
        oneLiner: "Upload key documents to generate insights.",
        stageLabel: null,
        practiceArea: null,
        clientName: null,
        opponentName: null,
      },
      rag: {
        overallLevel: "amber",
        overallScore: 50,
        scores: [],
      },
      briefing: {
        overview: "Case data is insufficient to generate insights. Upload key documents to begin analysis.",
        keyStrengths: [],
        keyRisks: ["No documents uploaded yet."],
        urgentActions: ["Upload the core claim documents to begin analysis."],
      },
      meta: {
        caseId,
        updatedAt: new Date().toISOString(),
        hasCoreEvidence: false,
        missingCriticalCount: 0,
        missingHighCount: 0,
      },
    };

    return NextResponse.json(fallbackInsights, { status: 200 });
  }
}

