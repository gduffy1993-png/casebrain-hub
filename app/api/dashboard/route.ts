import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type CaseRow = {
  id: string;
  title: string;
  summary: string | null;
  practice_area: string;
  updated_at: string | null;
};

type DeadlineRow = {
  id: string;
  title: string;
  due_date: string;
};

type LetterRow = {
  id: string;
  version: number;
  updated_at: string | null;
};

type PiStats = {
  total: number;
  limitationWithinSixMonths: number;
  stageBuckets: Record<string, number>;
};

const EMPTY_PAYLOAD = {
  cases: [] as CaseRow[],
  deadlines: [] as DeadlineRow[],
  letters: [] as LetterRow[],
  pi: {
    total: 0,
    limitationWithinSixMonths: 0,
    stageBuckets: {},
  } satisfies PiStats,
};

export async function GET() {
  const { userId, orgId } = await requireOrg();
  const supabase = getSupabaseAdminClient();

  const [
    casesResult,
    deadlinesResult,
    lettersResult,
    piCaseCountResult,
    piLimitationResult,
    piStageResult,
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, practice_area, updated_at")
      .eq("org_id", orgId)
      .eq("is_archived", false) // Exclude archived cases
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("deadlines")
      .select("id, title, due_date, case_id, cases!inner(org_id)")
      .eq("cases.org_id", orgId)
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("letters")
      .select("id, case_id, version, updated_at, cases!inner(org_id)")
      .eq("cases.org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("pi_cases")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("pi_cases")
      .select("id, limitation_date")
      .eq("org_id", orgId)
      .not("limitation_date", "is", null),
    supabase
      .from("pi_cases")
      .select("stage")
      .eq("org_id", orgId),
  ]);

  const cases = (casesResult.data ?? []).map(
    ({ id, title, summary, practice_area, updated_at }): CaseRow => ({
      id,
      title,
      summary,
      practice_area,
      updated_at,
    }),
  );

  const deadlines = (deadlinesResult.data ?? []).map(
    ({ id, title, due_date }): DeadlineRow => ({
      id,
      title,
      due_date,
    }),
  );

  const letters = (lettersResult.data ?? []).map(
    ({ id, version, updated_at }): LetterRow => ({
      id,
      version,
      updated_at,
    }),
  );

  const piTotal = piCaseCountResult.count ?? 0;

  const now = new Date();
  const sixMonthsAhead = new Date(now);
  sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

  const limitationWithinSixMonths =
    piLimitationResult.data?.filter((row) => {
      if (!row.limitation_date) {
        return false;
      }
      const limitationDate = new Date(row.limitation_date);
      return limitationDate >= now && limitationDate <= sixMonthsAhead;
    }).length ?? 0;

  const stageBuckets: Record<string, number> = {};
  (piStageResult.data ?? []).forEach((row) => {
    if (!row.stage) return;
    stageBuckets[row.stage] = (stageBuckets[row.stage] ?? 0) + 1;
  });

  return NextResponse.json({
    cases,
    deadlines,
    letters,
    pi: {
      total: piTotal,
      limitationWithinSixMonths,
      stageBuckets,
    },
  });
}

