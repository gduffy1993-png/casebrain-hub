import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

const HEARING_TYPES = ["First Hearing", "Plea Hearing", "Case Management", "Trial", "Sentencing", "Appeal", "Bail Review"] as const;

async function ensureCaseAccess(caseId: string, orgId: string, supabase: ReturnType<typeof getSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

/**
 * GET /api/criminal/[caseId]/hearings
 * Fetch all court hearings
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: hearings, error } = await supabase
      .from("criminal_hearings")
      .select("*")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("hearing_date", { ascending: true });

    if (error) {
      console.error("[criminal/hearings] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch hearings" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      hearings: (hearings || []).map((h) => ({
        id: h.id,
        hearingType: h.hearing_type,
        hearingDate: h.hearing_date,
        courtName: h.court_name,
        courtLocation: h.court_location,
        outcome: h.outcome,
        notes: h.notes,
      })),
    });
  } catch (error) {
    console.error("[criminal/hearings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hearings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/criminal/[caseId]/hearings
 * Create a new hearing
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    if (!(await ensureCaseAccess(caseId, orgId, supabase))) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const hearingType = typeof body.hearingType === "string" && HEARING_TYPES.includes(body.hearingType as typeof HEARING_TYPES[number])
      ? body.hearingType
      : "First Hearing";
    const hearingDate = body.hearingDate ?? new Date().toISOString();
    const courtName = typeof body.courtName === "string" ? body.courtName.trim() : null;
    const courtLocation = typeof body.courtLocation === "string" ? body.courtLocation.trim() : null;

    const { data: hearing, error } = await supabase
      .from("criminal_hearings")
      .insert({
        case_id: caseId,
        org_id: orgId,
        hearing_type: hearingType,
        hearing_date: hearingDate,
        court_name: courtName,
        court_location: courtLocation,
      })
      .select("id, hearing_type, hearing_date, court_name, court_location, outcome, notes")
      .single();

    if (error) {
      console.error("[criminal/hearings POST]", error);
      return NextResponse.json({ error: "Failed to create hearing" }, { status: 500 });
    }

    return NextResponse.json({
      hearing: {
        id: hearing.id,
        hearingType: hearing.hearing_type,
        hearingDate: hearing.hearing_date,
        courtName: hearing.court_name,
        courtLocation: hearing.court_location,
        outcome: hearing.outcome,
        notes: hearing.notes,
      },
    });
  } catch (error) {
    console.error("[criminal/hearings POST]", error);
    return NextResponse.json({ error: "Failed to create hearing" }, { status: 500 });
  }
}

/**
 * PATCH /api/criminal/[caseId]/hearings?hearingId=...
 * Update a hearing (outcome, notes)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const hearingId = request.nextUrl.searchParams.get("hearingId");
    if (!hearingId) {
      return NextResponse.json({ error: "hearingId required" }, { status: 400 });
    }

    if (!(await ensureCaseAccess(caseId, orgId, supabase))) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: { outcome?: string; notes?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.outcome === "string") updates.outcome = body.outcome.trim() || null;
    if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;

    const { data: hearing, error } = await supabase
      .from("criminal_hearings")
      .update(updates)
      .eq("id", hearingId)
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .select("id, hearing_type, hearing_date, court_name, outcome, notes")
      .single();

    if (error) {
      console.error("[criminal/hearings PATCH]", error);
      return NextResponse.json({ error: "Failed to update hearing" }, { status: 500 });
    }
    if (!hearing) {
      return NextResponse.json({ error: "Hearing not found" }, { status: 404 });
    }

    return NextResponse.json({
      hearing: {
        id: hearing.id,
        hearingType: hearing.hearing_type,
        hearingDate: hearing.hearing_date,
        courtName: hearing.court_name,
        outcome: hearing.outcome,
        notes: hearing.notes,
      },
    });
  } catch (error) {
    console.error("[criminal/hearings PATCH]", error);
    return NextResponse.json({ error: "Failed to update hearing" }, { status: 500 });
  }
}

