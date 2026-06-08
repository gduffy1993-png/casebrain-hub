/**
 * Phase 6: Export "Strategy on one page" as PDF for counsel/court/client.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildCaseContext } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateCriminalStrategyPdf } from "@/lib/pdf/criminal-strategy-pdf";
import { getChecklistForHearingType } from "@/lib/criminal/hearing-ready-checklists";
import { buildDefenceNarrative } from "@/lib/criminal/defence-narrative";
import { buildRiskOutcomeMatrix } from "@/lib/criminal/risk-outcome-matrix";
import { OFFENCE_TYPE_LABELS, normaliseOffenceType } from "@/lib/criminal/strategy-suggest/constants";

type RouteParams = { params: Promise<{ caseId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const context = await buildCaseContext(caseId, {
      userId: authRes.context.userId,
      orgIdHint: orgId,
    });
    if (!context.case) {
      return NextResponse.json(
        { error: "Case not found", message: context.banner?.message ?? "Case not found" },
        { status: 404 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const orgIdForQueries = context.case.org_id ?? orgId ?? "";

    const [
      caseRow,
      criminalRow,
      hearingsRes,
      timelineRes,
      positionRes,
    ] = await Promise.all([
      supabase.from("cases").select("title").eq("id", caseId).eq("org_id", orgIdForQueries).maybeSingle(),
      supabase.from("criminal_cases").select("strategy_notes, offence_override").eq("id", caseId).eq("org_id", orgIdForQueries).maybeSingle(),
      supabase.from("criminal_hearings").select("hearing_type, hearing_date").eq("case_id", caseId).eq("org_id", orgIdForQueries).order("hearing_date", { ascending: true }),
      supabase.from("criminal_disclosure_timeline").select("item, action, action_date, note").eq("case_id", caseId).order("action_date", { ascending: false }).limit(30),
      supabase.from("case_positions").select("position_text").eq("case_id", caseId).eq("org_id", orgIdForQueries).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const title = (caseRow?.data as { title?: string } | null)?.title ?? "Criminal case";
    const criminal = criminalRow?.data as { strategy_notes?: string | null; offence_override?: string | null } | null;
    const strategy_notes = criminal?.strategy_notes ?? null;
    const offenceOverride = criminal?.offence_override?.trim() || null;
    const hearings = (hearingsRes?.data ?? []) as Array<{ hearing_type?: string; hearing_date?: string }>;
    const now = new Date();
    const nextHearing = hearings.find((h) => h.hearing_date && new Date(h.hearing_date).getTime() >= now.getTime());
    const nextHearingType = nextHearing?.hearing_type ?? null;
    const nextHearingDate = nextHearing?.hearing_date ?? null;
    const timelineData = (timelineRes?.data ?? []) as Array<{ item?: string; action?: string; action_date?: string; note?: string }>;
    const disclosureTimeline = timelineData.map((e) => ({
      item: e?.item ?? "",
      action: e?.action ?? "",
      date: e?.action_date ?? "",
      note: e?.note,
    }));

    let offenceLabel = "—";
    if (offenceOverride) {
      const ot = normaliseOffenceType(offenceOverride);
      offenceLabel = OFFENCE_TYPE_LABELS[ot] ?? offenceOverride;
    }

    let primaryStrategy: string | undefined;
    let confidence: string | undefined;
    let burdenMap: Array<{ label: string; support: string; leverage: string }> | undefined;
    let pressurePoints: Array<{ label: string; priority?: string; reason?: string }> | undefined;

    try {
      const origin = new URL(request.url).origin;
      const strategyRes = await fetch(`${origin}/api/criminal/${caseId}/strategy-analysis`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (strategyRes.ok) {
        const strategyJson = await strategyRes.json();
        const data = strategyJson?.data ?? strategyJson;
        primaryStrategy = data?.recommendation?.recommended ?? data?.recommendedStrategy?.primaryAngle?.angleType ?? undefined;
        confidence = data?.recommendation?.confidence ?? undefined;
        if (Array.isArray(data?.burdenMap)) {
          burdenMap = data.burdenMap.map((e: { label?: string; support?: string; leverage?: string }) => ({
            label: e?.label ?? "",
            support: e?.support ?? "",
            leverage: e?.leverage ?? "",
          }));
        }
        if (Array.isArray(data?.pressurePoints)) {
          pressurePoints = data.pressurePoints.map((p: { label?: string; priority?: string; reason?: string }) => ({
            label: p?.label ?? "",
            priority: p?.priority,
            reason: p?.reason,
          }));
        }
      }
    } catch (_) {
      // Strategy analysis unavailable; export still includes case title, offence, HRS, disclosure, notes
    }

    const hrsChecklist = getChecklistForHearingType(nextHearingType);
    const hrsHearingLabel = nextHearingType
      ? `${nextHearingType}${nextHearingDate ? ` – ${new Date(nextHearingDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}`
      : "Next hearing";

    const positionText = (positionRes?.data as { position_text?: string } | null)?.position_text ?? null;
    const keyLeverage = burdenMap
      ?.filter((e) => e.leverage && e.leverage !== "No challenge")
      .slice(0, 2)
      .map((e) => e.leverage);
    const defenceNarrative = buildDefenceNarrative({
      offenceLabel,
      primaryStrategy,
      keyLeverage,
      positionSummary: positionText ?? undefined,
    });
    const romRows = buildRiskOutcomeMatrix({
      primaryStrategy,
      fallbacks: undefined,
      confidence,
    });
    const riskOutcomeMatrix = romRows.map((r) => ({
      option: r.option,
      outcomeSummary: r.outcomeSummary,
      riskLevel: r.riskLevel,
      isPrimary: r.isPrimary,
    }));

    const exportData = {
      caseId,
      title,
      generatedAt: new Date().toISOString(),
      offenceLabel,
      nextHearingType: nextHearingType ?? undefined,
      nextHearingDate: nextHearingDate ?? undefined,
      primaryStrategy,
      confidence,
      burdenMap,
      pressurePoints,
      hrsChecklist,
      hrsHearingLabel,
      disclosureTimeline,
      solicitorInstructions: strategy_notes,
      defenceNarrative:
        defenceNarrative.trim() && !defenceNarrative.startsWith("Run strategy analysis")
          ? defenceNarrative
          : undefined,
      riskOutcomeMatrix: riskOutcomeMatrix.some((r) => r.riskLevel !== "—" || r.isPrimary) ? riskOutcomeMatrix : undefined,
    };

    const pdfBuffer = await generateCriminalStrategyPdf(exportData);
    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Strategy_${safeTitle}_${dateStr}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[strategy-export] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate strategy export PDF" },
      { status: 500 }
    );
  }
}
