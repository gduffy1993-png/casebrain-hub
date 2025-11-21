import { NextResponse } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import { requireOrg } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type BucketSummary = {
  within30: number;
  within90: number;
  beyond90: number;
};

type RiskCounts = {
  low: number;
  medium: number;
  high: number;
  critical: number;
};

export async function GET() {
  const { orgId, userId } = await requireOrg();

  const supabase = getSupabaseAdminClient();

  // Query PI cases
  const { data: piCasesData } = await supabase
    .from("pi_cases")
    .select("*, cases(id, title, created_at, practice_area)")
    .eq("org_id", orgId);

  if (!piCasesData || !piCasesData.length) {
    return NextResponse.json({
      ok: true,
      data: {
        totalCases: 0,
        totalDisbursements: 0,
        limitationBuckets: { within30: 0, within90: 0, beyond90: 0 },
        averageDaysOpen: 0,
        riskCounts: { low: 0, medium: 0, high: 0, critical: 0 },
        topCases: [],
      },
    });
  }

  const [casesResult, disbursementResult, flagsResult] = await Promise.all([
    supabase
      .from("pi_cases")
      .select("id, org_id, stage, limitation_date, cases!inner(id, title, created_at)")
      .eq("org_id", orgId),
    supabase
      .from("pi_disbursements")
      .select("amount, paid")
      .eq("org_id", orgId),
    supabase
      .from("risk_flags")
      .select("case_id, severity")
      .eq("org_id", orgId)
      .eq("source_type", "pi_engine"),
  ]);

  if (casesResult.error) {
    console.error("[pi-report] Failed to load PI cases", { orgId, userId, error: casesResult.error });
    return NextResponse.json({ error: "Unable to generate PI report." }, { status: 500 });
  }

  type PiCaseRow = {
    id: string;
    stage: string;
    limitation_date: string | null;
    cases: { id: string; title: string; created_at: string } | null;
  };

  const rawCases = casesResult.data ?? [];
  const piCases: PiCaseRow[] = rawCases.map((row) => {
    const relatedCaseRaw = Array.isArray(row.cases) ? row.cases[0] : row.cases;
    const relatedCase = relatedCaseRaw
      ? {
          id: String(relatedCaseRaw.id),
          title: relatedCaseRaw.title ?? "Untitled",
          created_at: relatedCaseRaw.created_at ?? new Date().toISOString(),
        }
      : null;

    return {
      id: String(row.id),
      org_id: String(row.org_id),
      stage: row.stage ?? "intake",
      limitation_date: row.limitation_date ?? null,
      cases: relatedCase,
    };
  });
  const now = new Date();

  const limitationBuckets: BucketSummary = { within30: 0, within90: 0, beyond90: 0 };
  let openCaseCount = 0;
  let totalDaysOpen = 0;

  const caseMeta = new Map<
    string,
    {
      title: string;
      limitationDate: string | null;
      stage: string;
      daysOpen: number | null;
    }
  >();

  piCases.forEach((row) => {
    const caseId = row.cases?.id ?? row.id;
    if (!caseId) return;

    const createdAt = row.cases?.created_at ? new Date(row.cases.created_at) : null;
    const limitationDate = row.limitation_date ? new Date(row.limitation_date) : null;

    if (row.stage !== "closed") {
      openCaseCount += 1;
      if (createdAt && !Number.isNaN(createdAt.getTime())) {
        totalDaysOpen += differenceInCalendarDays(now, createdAt);
      }
      if (limitationDate && !Number.isNaN(limitationDate.getTime())) {
        const daysUntil = differenceInCalendarDays(limitationDate, now);
        if (daysUntil <= 30) {
          limitationBuckets.within30 += 1;
        } else if (daysUntil <= 90) {
          limitationBuckets.within90 += 1;
        } else {
          limitationBuckets.beyond90 += 1;
        }
      } else {
        limitationBuckets.beyond90 += 1;
      }
    } else {
      // Closed files count towards the longer tail so we still surface them in the chart.
      limitationBuckets.beyond90 += 1;
    }

    caseMeta.set(caseId, {
      title: row.cases?.title ?? "Untitled",
      limitationDate: row.limitation_date,
      stage: row.stage,
      daysOpen:
        createdAt && !Number.isNaN(createdAt.getTime())
          ? differenceInCalendarDays(now, createdAt)
          : null,
    });
  });

  const totalDisbursements =
    disbursementResult.data?.reduce((sum, entry) => sum + (entry.amount ?? 0), 0) ?? 0;

  const riskCounts: RiskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  const severityRanking: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  const caseSeverity = new Map<string, { severity: string; rank: number }>();

  (flagsResult.data ?? []).forEach((flag) => {
    const severity = flag.severity ?? "low";
    const rank = severityRanking[severity] ?? 0;
    riskCounts[severity as keyof RiskCounts] = (riskCounts[severity as keyof RiskCounts] ?? 0) + 1;

    const existing = caseSeverity.get(flag.case_id);
    if (!existing || rank > existing.rank) {
      caseSeverity.set(flag.case_id, { severity, rank });
    }
  });

  const topCases = Array.from(caseSeverity.entries())
    .map(([caseId, info]) => {
      const meta = caseMeta.get(caseId);
      return {
        caseId,
        title: meta?.title ?? "Untitled",
        limitationDate: meta?.limitationDate ?? null,
        stage: meta?.stage ?? "intake",
        severity: info.severity,
      };
    })
    .sort((a, b) => {
      const rankA = severityRanking[a.severity] ?? 0;
      const rankB = severityRanking[b.severity] ?? 0;
      if (rankA === rankB) {
        const dateA = a.limitationDate ? new Date(a.limitationDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.limitationDate ? new Date(b.limitationDate).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      }
      return rankB - rankA;
    })
    .slice(0, 10);

  return NextResponse.json({
    ok: true,
    data: {
      totalCases: openCaseCount,
      totalDisbursements,
      limitationBuckets,
      averageDaysOpen: openCaseCount ? Math.round(totalDaysOpen / openCaseCount) : 0,
      riskCounts,
      topCases,
    },
  });
}
