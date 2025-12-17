import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCriminalLetterDraft, type CriminalLetterKind } from "@/lib/criminal/deterministic-letter-drafts";
import { normalizePracticeArea } from "@/lib/types/casebrain";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { orgId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const { caseId } = await params;

  const body = await request.json().catch(() => ({}));
  const kind = (body?.kind as CriminalLetterKind | undefined) ?? "disclosure_chase";
  const notes = (body?.notes as string | undefined) ?? undefined;

  const supabase = getSupabaseAdminClient();

  // Verify case access
  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, org_id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (caseError) {
    console.error("[criminal/letters/draft] Case lookup error:", caseError);
    return NextResponse.json({ error: "Failed to draft letter" }, { status: 500 });
  }
  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const practiceArea = normalizePracticeArea(caseRecord.practice_area);
  if (practiceArea !== "criminal") {
    return NextResponse.json(
      { error: "This letter draft endpoint is only available for criminal cases." },
      { status: 400 },
    );
  }

  // Best-effort fetches (do not throw if tables missing)
  const safe = async <T,>(fn: () => Promise<{ data: T | null; error: any }>): Promise<T | null> => {
    try {
      const res = await fn();
      if (res.error) return null;
      return res.data ?? null;
    } catch {
      return null;
    }
  };

  const criminalCase = await safe(() =>
    supabase
      .from("criminal_cases")
      .select("defendant_name, court_name, next_hearing_date, next_hearing_type, bail_status")
      .eq("id", caseId)
      .maybeSingle() as any
  );

  const charges = await safe(() =>
    supabase
      .from("criminal_charges")
      .select("offence, section, charge_date, status")
      .eq("case_id", caseId)
      .order("charge_date", { ascending: false }) as any
  );

  const disclosure = await safe(() =>
    supabase
      .from("disclosure_tracker")
      .select("missing_items, disclosure_deadline, disclosure_issues")
      .eq("case_id", caseId)
      .maybeSingle() as any
  );

  const pace = await safe(() =>
    supabase
      .from("pace_compliance")
      .select("breaches_detected, breach_severity")
      .eq("case_id", caseId)
      .maybeSingle() as any
  );

  const draft = buildCriminalLetterDraft(kind, {
    caseTitle: caseRecord.title ?? "Criminal matter",
    practiceArea: caseRecord.practice_area,
    defendantName: (criminalCase as any)?.defendant_name ?? null,
    courtName: (criminalCase as any)?.court_name ?? null,
    nextHearingDate: (criminalCase as any)?.next_hearing_date ?? null,
    nextHearingType: (criminalCase as any)?.next_hearing_type ?? null,
    bailStatus: (criminalCase as any)?.bail_status ?? null,
    charges: Array.isArray(charges) ? (charges as any) : [],
    disclosure: disclosure
      ? {
          missingItems: (disclosure as any)?.missing_items ?? null,
          disclosureDeadline: (disclosure as any)?.disclosure_deadline ?? null,
          issues: (disclosure as any)?.disclosure_issues ?? null,
        }
      : null,
    pace: pace
      ? {
          breachesDetected: (pace as any)?.breaches_detected ?? null,
          breachSeverity: (pace as any)?.breach_severity ?? null,
        }
      : null,
    notes,
  });

  return NextResponse.json({
    kind,
    subject: draft.subject,
    body: draft.body,
    deterministic: true,
  });
}


