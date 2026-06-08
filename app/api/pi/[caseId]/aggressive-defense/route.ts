import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllPiDefenseAngles } from "@/lib/pi/aggressive-defense-engine";
import type { PiCaseRecord, PiMedicalReport, PiOffer } from "@/types/pi";
import { withPaywall } from "@/lib/paywall/protect-route";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const { caseId } = await params;
      const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    // Fetch PI case
    const { data: piCase, error: caseError } = await supabase
      .from("pi_cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError || !piCase) {
      return NextResponse.json(
        { error: "PI case not found" },
        { status: 404 }
      );
    }

    // Fetch medical reports
    const { data: medicalReports, error: reportsError } = await supabase
      .from("pi_medical_reports")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    if (reportsError) {
      console.error("[AggressiveDefense] Failed to fetch medical reports:", reportsError);
    }

    // Fetch offers
    const { data: offers, error: offersError } = await supabase
      .from("pi_offers")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    if (offersError) {
      console.error("[AggressiveDefense] Failed to fetch offers:", offersError);
    }

    // Fetch letters to check for CNF
    const { data: letters } = await supabase
      .from("letters")
      .select("template_id, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    const hasCNF = letters?.some(l => 
      l.template_id?.toLowerCase().includes("cnf") ||
      l.template_id?.toLowerCase().includes("claim notification")
    ) ?? false;

    const cnfLetter = letters?.find(l => 
      l.template_id?.toLowerCase().includes("cnf") ||
      l.template_id?.toLowerCase().includes("claim notification")
    );

    const cnfSentDate = cnfLetter ? new Date(cnfLetter.created_at) : null;
    const cnfResponseDeadline = cnfSentDate ? new Date(cnfSentDate) : null;
    if (cnfResponseDeadline) {
      cnfResponseDeadline.setDate(cnfResponseDeadline.getDate() + 21); // 21 days for CNF response
    }

    // Check for Part 36 offers
    const part36Offers = offers?.filter(o => o.party === "claimant" && o.status === "open") ?? [];
    const hasPart36Offer = part36Offers.length > 0;
    const part36Offer = part36Offers[0];
    const part36OfferDate = part36Offer ? new Date(part36Offer.date_made) : null;
    const part36OfferAmount = part36Offer?.amount ?? null;

    // Fetch defense info (if in litigation)
    let hasDefense = false;
    let defenseFiledDate: Date | null = null;
    let defenseDeadlineDate: Date | null = null;
    let opponentLastResponseDate: Date | null = null;

    if (piCase.stage === "litigation" || piCase.stage === "quantum") {
      // Check for defense in documents
      const { data: documents } = await supabase
        .from("documents")
        .select("name, created_at")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .ilike("name", "%defense%");

      if (documents && documents.length > 0) {
        hasDefense = true;
        defenseFiledDate = new Date(documents[0].created_at);
        // Assume defense deadline is 28 days after claim
        if (cnfSentDate) {
          defenseDeadlineDate = new Date(cnfSentDate);
          defenseDeadlineDate.setDate(defenseDeadlineDate.getDate() + 28);
        }
      }

      // Get opponent's last response date from correspondence
      if (letters && letters.length > 0) {
        const lastLetter = letters.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        opponentLastResponseDate = new Date(lastLetter.created_at);
      }
    }

    // Build input for aggressive defense engine
    const input = {
      caseId,
      piCase: piCase as PiCaseRecord,
      medicalReports: (medicalReports ?? []) as PiMedicalReport[],
      offers: (offers ?? []) as PiOffer[],
      opponentLastResponseDate,
      hasCNF,
      cnfSentDate,
      cnfResponseDeadline,
      hasDefense,
      defenseFiledDate,
      defenseDeadlineDate,
      hasPart36Offer,
      part36OfferDate,
      part36OfferAmount,
    };

    // Run aggressive defense analysis
    const analysis = await findAllPiDefenseAngles(input);

      return NextResponse.json(analysis);
    } catch (error) {
      console.error("[AggressiveDefense] Error:", error);
      return NextResponse.json(
        { error: "Failed to generate aggressive defense analysis" },
        { status: 500 }
      );
    }
  });
}

