import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { detectAllLoopholes } from "@/lib/criminal/loophole-detector";
import { generateDefenseStrategies, calculateGetOffProbability } from "@/lib/criminal/strategy-generator";
import type { CriminalMeta } from "@/types/case";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * POST /api/criminal/[caseId]/process
 * Process criminal case from uploaded documents and extract criminalMeta
 * Creates criminal case record, detects loopholes, generates strategies
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId, userId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    // Fetch case
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!caseRecord || caseRecord.practice_area !== "criminal") {
      return NextResponse.json(
        { error: "Case not found or not a criminal case" },
        { status: 404 },
      );
    }

    // Fetch documents and extract criminalMeta
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    // Extract criminalMeta from documents
    let criminalMeta: CriminalMeta | null = null;
    for (const doc of documents || []) {
      const extracted = doc.extracted_json as any;
      if (extracted?.criminalMeta) {
        criminalMeta = extracted.criminalMeta;
        break; // Use first document with criminalMeta
      }
    }

    if (!criminalMeta) {
      return NextResponse.json(
        { error: "No criminal metadata found in documents" },
        { status: 400 },
      );
    }

    // Create/update criminal case record
    const { data: existingCriminalCase } = await supabase
      .from("criminal_cases")
      .select("id")
      .eq("id", caseId)
      .maybeSingle();

    const criminalCaseData: any = {
      id: caseId,
      org_id: orgId,
      defendant_name: null, // Will be extracted from parties
      court_type: criminalMeta.court || null,
      court_name: criminalMeta.courtName || null,
      next_hearing_date: criminalMeta.nextHearing ? new Date(criminalMeta.nextHearing).toISOString() : null,
      next_hearing_type: criminalMeta.hearingType || null,
      bail_status: criminalMeta.bailStatus || null,
      bail_conditions: criminalMeta.bailConditions || [],
      plea: criminalMeta.plea || "no_plea",
    };

    if (existingCriminalCase) {
      await supabase
        .from("criminal_cases")
        .update(criminalCaseData)
        .eq("id", caseId);
    } else {
      await supabase
        .from("criminal_cases")
        .insert(criminalCaseData);
    }

    // Create/update charges (idempotent, no unique constraint required)
    if (criminalMeta.charges && criminalMeta.charges.length > 0) {
      const { data: existing } = await supabase
        .from("criminal_charges")
        .select("id, offence, section, charge_date")
        .eq("case_id", caseId)
        .eq("org_id", orgId);

      const existingRows = existing ?? [];
      for (const charge of criminalMeta.charges) {
        const offence = String(charge.offence ?? "").trim();
        const section = (charge.section ? String(charge.section).trim() : "");
        const chargeDate = charge.date ? new Date(charge.date).toISOString().slice(0, 10) : null;

        const match =
          existingRows.find(
            (c: any) =>
              String(c.offence ?? "").toLowerCase() === offence.toLowerCase() &&
              String(c.section ?? "").toLowerCase() === section.toLowerCase() &&
              String(c.charge_date ?? "") === String(chargeDate ?? ""),
          ) ??
          (!chargeDate
            ? existingRows.find(
                (c: any) =>
                  String(c.offence ?? "").toLowerCase() === offence.toLowerCase() &&
                  String(c.section ?? "").toLowerCase() === section.toLowerCase(),
              )
            : null);

        if (match?.id) {
          await supabase
            .from("criminal_charges")
            .update({
              offence,
              section: section || null,
              charge_date: chargeDate,
              location: charge.location || null,
              value: charge.value || null,
              details: charge.details || null,
            })
            .eq("id", match.id)
            .eq("case_id", caseId);
        } else {
          await supabase.from("criminal_charges").insert({
            case_id: caseId,
            org_id: orgId,
            offence,
            section: section || null,
            charge_date: chargeDate,
            location: charge.location || null,
            value: charge.value || null,
            details: charge.details || null,
          });
        }
      }
    }

    // Create/update PACE compliance
    if (criminalMeta.paceCompliance) {
      const pace = criminalMeta.paceCompliance;
      const breaches: string[] = [];
      
      if (pace.cautionGiven === false) breaches.push("Caution not given");
      if (pace.interviewRecorded === false) breaches.push("Interview not recorded");
      if (pace.rightToSolicitor === false) breaches.push("Right to solicitor denied");
      if (pace.detentionTime && pace.detentionTime > 24) breaches.push("Detention time exceeded");

      await supabase
        .from("pace_compliance")
        .upsert(
          {
            case_id: caseId,
            org_id: orgId,
            caution_given: pace.cautionGiven,
            caution_given_before_questioning: pace.cautionGivenBeforeQuestioning ?? null,
            interview_recorded: pace.interviewRecorded,
            right_to_solicitor: pace.rightToSolicitor,
            detention_time_hours: pace.detentionTime,
            detention_time_exceeded: pace.detentionTime ? pace.detentionTime > 24 : false,
            breaches_detected: breaches,
            breach_severity: breaches.length > 0 ? "HIGH" : null,
          },
          { onConflict: "case_id" },
        );
    }

    // Create/update evidence
    if (criminalMeta.prosecutionEvidence) {
      for (const evidence of criminalMeta.prosecutionEvidence) {
        await supabase
          .from("criminal_evidence")
          .upsert(
            {
              case_id: caseId,
              org_id: orgId,
              side: "prosecution",
              evidence_type: evidence.type,
              title: evidence.witness || evidence.type,
              description: evidence.content || null,
              witness_name: evidence.witness || null,
              date: evidence.date ? new Date(evidence.date).toISOString().split("T")[0] : null,
              credibility: evidence.credibility || null,
              strength_score: evidence.credibility === "high" ? 80 : evidence.credibility === "medium" ? 50 : 30,
              issues: evidence.issues || [],
            },
            { onConflict: "case_id,side,evidence_type,title" },
          );
      }
    }

    if (criminalMeta.defenseEvidence) {
      for (const evidence of criminalMeta.defenseEvidence) {
        await supabase
          .from("criminal_evidence")
          .upsert(
            {
              case_id: caseId,
              org_id: orgId,
              side: "defense",
              evidence_type: evidence.type,
              title: evidence.witness || evidence.type,
              description: evidence.statement || null,
              witness_name: evidence.witness || null,
              date: evidence.date ? new Date(evidence.date).toISOString().split("T")[0] : null,
              credibility: evidence.credibility || null,
              strength_score: evidence.credibility === "high" ? 80 : evidence.credibility === "medium" ? 50 : 30,
              issues: [],
            },
            { onConflict: "case_id,side,evidence_type,title" },
          );
      }
    }

    // Detect loopholes
    const loopholes = detectAllLoopholes(criminalMeta);

    // Save loopholes (handle missing table gracefully)
    try {
      for (const loophole of loopholes) {
        const { error } = await supabase
          .from("criminal_loopholes")
          .upsert(
            {
              case_id: caseId,
              org_id: orgId,
              loophole_type: loophole.loopholeType,
              title: loophole.title,
              description: loophole.description,
              severity: loophole.severity,
              exploitability: loophole.exploitability,
              success_probability: loophole.successProbability,
              suggested_action: loophole.suggestedAction,
              legal_argument: loophole.legalArgument,
            },
            { onConflict: "case_id,loophole_type,title" },
          );
        if (error && (error as any).code === "PGRST205") {
          console.warn("[criminal/process] Table 'criminal_loopholes' not found, skipping save");
          break;
        }
      }
    } catch (error: any) {
      if (error?.code === "PGRST205") {
        console.warn("[criminal/process] Table 'criminal_loopholes' not found, skipping save");
      } else {
        console.error("[criminal/process] Error saving loopholes:", error);
      }
    }

    // Generate strategies
    const strategies = generateDefenseStrategies(loopholes);

    // Save strategies (handle missing table gracefully)
    try {
      for (const strategy of strategies) {
        const { error } = await supabase
          .from("defense_strategies")
          .upsert(
            {
              case_id: caseId,
              org_id: orgId,
              strategy_name: strategy.strategyName,
              strategy_type: strategy.strategyType,
              description: strategy.description,
              success_probability: strategy.successProbability,
              impact: strategy.impact,
              legal_argument: strategy.legalArgument,
              actions_required: strategy.actionsRequired,
              selected: false,
            },
            { onConflict: "case_id,strategy_name" },
          );
        if (error && (error as any).code === "PGRST205") {
          console.warn("[criminal/process] Table 'defense_strategies' not found, skipping save");
          break;
        }
      }
    } catch (error: any) {
      if (error?.code === "PGRST205") {
        console.warn("[criminal/process] Table 'defense_strategies' not found, skipping save");
      } else {
        console.error("[criminal/process] Error saving strategies:", error);
      }
    }

    // Calculate overall probability
    const overallProbability = calculateGetOffProbability(strategies, loopholes);
    const riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
      overallProbability >= 70 ? "LOW" :
      overallProbability >= 40 ? "MEDIUM" :
      overallProbability >= 20 ? "HIGH" : "CRITICAL";

    // Update criminal case with probability
    await supabase
      .from("criminal_cases")
      .update({
        get_off_probability: overallProbability,
        risk_level: riskLevel,
        recommended_strategy: strategies.length > 0 ? strategies[0].strategyName : null,
      })
      .eq("id", caseId);

    return NextResponse.json({
      success: true,
      loopholesFound: loopholes.length,
      strategiesGenerated: strategies.length,
      overallProbability,
      riskLevel,
    });
  } catch (error) {
    console.error("[criminal/process] Error:", error);
    return NextResponse.json(
      { error: "Failed to process criminal case" },
      { status: 500 },
    );
  }
}

