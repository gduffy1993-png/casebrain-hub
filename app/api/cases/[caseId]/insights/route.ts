import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseInsights } from "@/lib/core/insights";
import { findMissingEvidence } from "@/lib/missing-evidence";
import type { CaseInsights } from "@/lib/core/enterprise-types";
import type { LimitationInfo } from "@/lib/types/casebrain";
import { getOrgScopeOrFallback, findCaseByIdScoped, findDocumentsByCaseIdScoped } from "@/lib/db/case-lookup";

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

    // Derive org scope (UUID + externalRef)
    const orgScope = await getOrgScopeOrFallback(userId);
    const supabase = getSupabaseAdminClient();

    // Find case with org scope fallback
    const caseRow = await findCaseByIdScoped(caseId, orgScope);

    if (!caseRow) {
      // Case not found - return 200 with empty insights and banner (not 404)
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
        banner: {
          severity: "warning",
          title: "Case not found",
          message: "Case not found for your org scope (legacy org_id mismatch). Re-upload or contact support.",
        },
      }, { status: 200 });
    }

    const caseRecord = {
      id: caseRow.id,
      title: (caseRow as any).title ?? null,
      summary: (caseRow as any).summary ?? null,
      practice_area: (caseRow as any).practice_area ?? null,
      status: (caseRow as any).status ?? null,
      supervisor_reviewed: (caseRow as any).supervisor_reviewed ?? null,
      created_at: (caseRow as any).created_at ?? new Date().toISOString(),
    };

    // Fetch documents with org scope fallback
    // Pass caseRow.org_id as fallback to handle data mismatches
    const caseOrgId: string | null = caseRow.org_id ?? null;
    const documentsData = await findDocumentsByCaseIdScoped(caseId, orgScope, caseOrgId);
    const documents = documentsData.map(d => ({
      id: d.id,
      name: d.name,
      type: undefined as string | undefined,
      created_at: d.created_at,
      extracted_json: d.extracted_json,
    }));

    // Compute document text diagnostics
    const docCount = documentsData.length;
    let rawCharsTotal = 0;
    let jsonCharsTotal = 0;
    
    for (const doc of documentsData) {
      const rawText = doc.raw_text ?? "";
      rawCharsTotal += typeof rawText === "string" ? rawText.length : 0;
      
      const extractedJson = doc.extracted_json;
      if (extractedJson) {
        try {
          const jsonStr = typeof extractedJson === "string" ? extractedJson : JSON.stringify(extractedJson);
          jsonCharsTotal += jsonStr.length;
        } catch {
          // Ignore JSON stringify errors
        }
      }
    }
    
    const avgRawCharsPerDoc = docCount > 0 ? Math.floor(rawCharsTotal / docCount) : 0;
    const suspectedScanned = docCount > 0 && rawCharsTotal < 800 && jsonCharsTotal < 400;

    // Log suspected scanned PDFs (server-side only)
    if (suspectedScanned) {
      console.warn("[insights] Suspected scanned/image-only PDF detected:", {
        caseId,
        docCount,
        rawCharsTotal,
        jsonCharsTotal,
        avgRawCharsPerDoc,
      });
    }

    // Fetch risks (with org scope fallback)
    let riskFlags: any[] = [];
    if (orgScope.orgId) {
      const { data } = await supabase
        .from("risk_flags")
        .select("id, flag_type, severity, description, category, resolved, detected_at")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.orgId)
        .eq("resolved", false);
      riskFlags = data ?? [];
    }
    if (riskFlags.length === 0 && orgScope.externalRef) {
      const { data } = await supabase
        .from("risk_flags")
        .select("id, flag_type, severity, description, category, resolved, detected_at")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.externalRef)
        .eq("resolved", false);
      riskFlags = data ?? [];
    }

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

    // Fetch limitation (with org scope fallback)
    let limitationData: any = null;
    if (orgScope.orgId) {
      const { data } = await supabase
        .from("limitation_info")
        .select("primary_limitation_date, days_remaining, is_expired, severity")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.orgId)
        .maybeSingle();
      limitationData = data;
    }
    if (!limitationData && orgScope.externalRef) {
      const { data } = await supabase
        .from("limitation_info")
        .select("primary_limitation_date, days_remaining, is_expired, severity")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.externalRef)
        .maybeSingle();
      limitationData = data;
    }

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

    // Fetch key issues (with org scope fallback)
    let keyIssues: any[] = [];
    if (orgScope.orgId) {
      const { data } = await supabase
        .from("key_issues")
        .select("id, label, description, category")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.orgId);
      keyIssues = data ?? [];
    }
    if (keyIssues.length === 0 && orgScope.externalRef) {
      const { data } = await supabase
        .from("key_issues")
        .select("id, label, description, category")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.externalRef);
      keyIssues = data ?? [];
    }

    // Fetch next steps (with org scope fallback)
    let nextSteps: any[] = [];
    if (orgScope.orgId) {
      const { data } = await supabase
        .from("next_steps")
        .select("id, action, priority, due_date")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.orgId)
        .eq("completed", false);
      nextSteps = data ?? [];
    }
    if (nextSteps.length === 0 && orgScope.externalRef) {
      const { data } = await supabase
        .from("next_steps")
        .select("id, action, priority, due_date")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.externalRef)
        .eq("completed", false);
      nextSteps = data ?? [];
    }

    // Fetch recent notes for days since update (with org scope fallback)
    let recentNotes: any[] = [];
    if (orgScope.orgId) {
      const { data } = await supabase
        .from("case_notes")
        .select("created_at")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.orgId)
        .order("created_at", { ascending: false })
        .limit(1);
      recentNotes = data ?? [];
    }
    if (recentNotes.length === 0 && orgScope.externalRef) {
      const { data } = await supabase
        .from("case_notes")
        .select("created_at")
        .eq("case_id", caseId)
        .eq("org_id", orgScope.externalRef)
        .order("created_at", { ascending: false })
        .limit(1);
      recentNotes = data ?? [];
    }

    const daysSinceLastUpdate = recentNotes?.[0]?.created_at
      ? Math.floor((Date.now() - new Date(recentNotes[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    // Build insights - wrap in try-catch to ensure we always return something
    const orgId = orgScope.orgId || orgScope.externalRef || "";
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
          status: caseRecord.status ?? null,
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
        orgId: orgScope?.orgId ?? null,
        documentCount: documents?.length ?? 0,
        errorMessage: buildError instanceof Error ? buildError.message : String(buildError),
        errorName: buildError instanceof Error ? buildError.name : typeof buildError,
      });
      // Re-throw to be caught by outer catch which will return fallback
      throw buildError;
    }

    // If documents exist but no extractable text, return banner with insights
    if (suspectedScanned) {
      return NextResponse.json({
        insights,
        banner: {
          severity: "warning",
          title: "No text extracted from document",
          message: "This PDF appears scanned/image-only. Upload a text-based PDF or run OCR, then re-analyse.",
        },
        diagnostics: {
          docCount,
          rawCharsTotal,
          jsonCharsTotal,
          avgRawCharsPerDoc,
          suspectedScanned: true,
        },
      });
    }

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

