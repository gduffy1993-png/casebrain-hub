import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllFamilyDefenseAngles } from "@/lib/family/aggressive-defense-engine";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    // Fetch case to check practice area
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!caseRecord || caseRecord.practice_area !== "family") {
      return NextResponse.json(
        { error: "Family case not found" },
        { status: 404 }
      );
    }

    // Fetch documents to check for applications, orders, disclosure
    const { data: documents } = await supabase
      .from("documents")
      .select("name, created_at, type")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    // Check for application
    const hasApplication = documents?.some(d => 
      d.name.toLowerCase().includes("application") ||
      d.name.toLowerCase().includes("c100") ||
      d.name.toLowerCase().includes("form a")
    ) ?? false;

    const applicationDoc = documents?.find(d => 
      d.name.toLowerCase().includes("application") ||
      d.name.toLowerCase().includes("c100") ||
      d.name.toLowerCase().includes("form a")
    );
    const applicationFiledDate = applicationDoc ? new Date(applicationDoc.created_at) : null;
    // Assume application deadline is based on case creation or first document
    const { data: caseData } = await supabase
      .from("cases")
      .select("created_at")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    const applicationDeadlineDate = caseData ? new Date(caseData.created_at) : null;
    if (applicationDeadlineDate) {
      applicationDeadlineDate.setDate(applicationDeadlineDate.getDate() + 14); // 14 days for applications
    }

    // Check for orders
    const hasOrder = documents?.some(d => 
      d.name.toLowerCase().includes("order") ||
      d.name.toLowerCase().includes("court order")
    ) ?? false;

    const orderDoc = documents?.find(d => 
      d.name.toLowerCase().includes("order") ||
      d.name.toLowerCase().includes("court order")
    );
    const orderDate = orderDoc ? new Date(orderDoc.created_at) : null;
    const orderComplianceDeadline = orderDate ? new Date(orderDate) : null;
    if (orderComplianceDeadline) {
      orderComplianceDeadline.setDate(orderComplianceDeadline.getDate() + 14); // 14 days to comply
    }
    const orderCompliedWith = null; // Would need to check actual compliance status

    // Check for disclosure
    const hasDisclosure = documents?.some(d => 
      d.name.toLowerCase().includes("disclosure") ||
      d.name.toLowerCase().includes("form e") ||
      d.name.toLowerCase().includes("financial")
    ) ?? false;

    const disclosureDoc = documents?.find(d => 
      d.name.toLowerCase().includes("disclosure") ||
      d.name.toLowerCase().includes("form e")
    );
    const disclosureDeadline = disclosureDoc ? new Date(disclosureDoc.created_at) : null;
    if (disclosureDeadline) {
      disclosureDeadline.setDate(disclosureDeadline.getDate() + 28); // 28 days for disclosure
    }
    const disclosureComplete = null; // Would need to check actual completion status

    // Get opponent's last response date from correspondence
    const { data: letters } = await supabase
      .from("letters")
      .select("created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    let opponentLastResponseDate: Date | null = null;
    if (letters && letters.length > 0) {
      const lastLetter = letters.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      opponentLastResponseDate = new Date(lastLetter.created_at);
    }

    // Build input for aggressive defense engine
    const input = {
      caseId,
      opponentLastResponseDate,
      hasApplication,
      applicationFiledDate,
      applicationDeadlineDate,
      hasOrder,
      orderDate,
      orderComplianceDeadline,
      orderCompliedWith,
      hasDisclosure,
      disclosureComplete,
      disclosureDeadline,
    };

    // Run aggressive defense analysis
    const analysis = await findAllFamilyDefenseAngles(input);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("[AggressiveDefense] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate aggressive defense analysis" },
      { status: 500 }
    );
  }
}


