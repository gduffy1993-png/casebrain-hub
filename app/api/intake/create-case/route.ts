import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getTrialStatus } from "@/lib/paywall/trialLimits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  const body = await request.json();
  const documentId = body?.documentId as string | undefined;

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  // Enforce trial limits: block creating a new case if at case limit or trial expired
  const trialStatus = await getTrialStatus({
    supabase,
    orgId,
    userId,
    email: null,
  });
  if (trialStatus.isBlocked) {
    const reason = trialStatus.reason ?? "TRIAL_EXPIRED";
    return NextResponse.json(
      {
        error:
          reason === "TRIAL_EXPIRED"
            ? "Trial has ended. Upgrade to create more cases."
            : "Trial case limit reached. Upgrade to create more cases.",
        code: reason,
        casesUsed: trialStatus.casesUsed,
        casesLimit: trialStatus.casesLimit,
        trialEndsAt: trialStatus.trialEndsAt,
        upgrade: { price: "£39/user/month" },
      },
      { status: 402 }
    );
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, name, extracted_json, org_id, case_id")
    .eq("id", documentId)
    .eq("org_id", orgId)
    .is("case_id", null)
    .maybeSingle();

  if (!document) {
    return NextResponse.json(
      { error: "Document not found or already processed" },
      { status: 404 },
    );
  }

  const extracted = document.extracted_json as
    | { summary?: string; parties?: Array<{ name: string; role: string }> }
    | null
    | undefined;

  const clientName =
    extracted?.parties?.find((p) => p.role === "client" || p.role === "claimant")
      ?.name ?? "Unknown Client";

  const caseTitle = `${clientName} - ${document.name.replace(/\.[^/.]+$/, "")}`;

  // Determine practice area from extracted data or document name
  let practiceArea = "general";
  const docNameLower = document.name.toLowerCase();
  if (docNameLower.includes("housing") || docNameLower.includes("disrepair") || docNameLower.includes("landlord")) {
    practiceArea = "housing_disrepair";
  } else if (docNameLower.includes("pi") || docNameLower.includes("personal injury") || docNameLower.includes("accident")) {
    practiceArea = "pi";
  } else if (docNameLower.includes("clinical") || docNameLower.includes("negligence") || docNameLower.includes("medical")) {
    practiceArea = "clinical_negligence";
  }

  const { data: newCase, error: caseError } = await supabase
    .from("cases")
    .insert({
      org_id: orgId,
      title: caseTitle,
      summary: extracted?.summary ?? "",
      practice_area: practiceArea,
      created_by: userId,
      is_archived: false,
    })
    .select("id")
    .maybeSingle();

  if (caseError || !newCase) {
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({ case_id: newCase.id })
    .eq("id", documentId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to attach document to case" },
      { status: 500 },
    );
  }

  return NextResponse.json({ caseId: newCase.id });
}

