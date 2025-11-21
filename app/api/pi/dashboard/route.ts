import { differenceInCalendarDays, isAfter } from "date-fns";
import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type LimitationEntry = {
  caseId: string;
  title: string;
  practiceArea: string;
  stage: string;
  limitationDate: string | null;
  daysUntil: number | null;
};

type StageBuckets = Record<string, number>;

type UpcomingTask = {
  id: string;
  caseId: string;
  title: string;
  dueAt: string | null;
  status: string;
  caseTitle: string;
};

type UpcomingDeadline = {
  id: string;
  caseId: string;
  label: string;
  dueDate: string;
  caseTitle: string;
};

type PiDashboardPayload = {
  limitation: LimitationEntry[];
  stageBuckets: StageBuckets;
  upcomingTasks: UpcomingTask[];
  upcomingDeadlines: UpcomingDeadline[];
};

const EMPTY: PiDashboardPayload = {
  limitation: [],
  stageBuckets: {},
  upcomingTasks: [],
  upcomingDeadlines: [],
};

const PI_PRACTICE_AREAS = ["pi", "clinical_negligence"];

export async function GET() {
  const { userId, orgId } = await requireOrg();
  const supabase = getSupabaseAdminClient();

  const [
    limitationResult,
    stageResult,
    tasksResult,
    deadlinesResult,
  ] = await Promise.all([
    supabase
      .from("pi_cases")
      .select(
        "id, stage, limitation_date, cases(id, title, practice_area)",
      )
      .eq("org_id", orgId),
    supabase
      .from("pi_cases")
      .select("stage")
      .eq("org_id", orgId),
    supabase
      .from("tasks")
      .select("id, title, due_at, status, case_id, cases!inner(title, practice_area)")
      .eq("org_id", orgId)
      .in("cases.practice_area", PI_PRACTICE_AREAS)
      .eq("status", "pending")
      .order("due_at", { ascending: true })
      .limit(10),
    supabase
      .from("deadlines")
      .select("id, label, due_date, case_id, cases!inner(title, practice_area)")
      .eq("org_id", orgId)
      .in("cases.practice_area", PI_PRACTICE_AREAS)
      .order("due_date", { ascending: true })
      .limit(10),
  ]);

  if (limitationResult.error || stageResult.error || tasksResult.error || deadlinesResult.error) {
    console.error("[pi:dashboard] Failed to load data", {
      limitationError: limitationResult.error,
      stageError: stageResult.error,
      tasksError: tasksResult.error,
      deadlinesError: deadlinesResult.error,
    });
    return NextResponse.json(EMPTY, { status: 500 });
  }

  type LimitationRow = {
    id: string;
    stage: string;
    limitation_date: string | null;
    cases: { id: string; title: string; practice_area: string } | null;
  };

  const normalizeCase = (raw: unknown): { id: string; title: string; practice_area: string } | null => {
    if (!raw) return null;
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    if (!candidate) return null;
    return {
      id: candidate.id ? String(candidate.id) : "",
      title: candidate.title ?? "Untitled",
      practice_area: candidate.practice_area ?? "pi",
    };
  };

  const limitationRows: LimitationRow[] = (limitationResult.data ?? []).map((row) => ({
    id: String(row.id),
    stage: row.stage ?? "intake",
    limitation_date: row.limitation_date ?? null,
    cases: normalizeCase(row.cases),
  }));

  const limitation = limitationRows
    .filter((row) => row.cases?.practice_area && PI_PRACTICE_AREAS.includes(row.cases.practice_area))
    .map((row) => {
      const limitationDate = row.limitation_date ? new Date(row.limitation_date) : null;
      const today = new Date();
      const daysUntil =
        limitationDate && isAfter(limitationDate, today)
          ? differenceInCalendarDays(limitationDate, today)
          : limitationDate
            ? differenceInCalendarDays(limitationDate, today)
            : null;

      return {
        caseId: row.cases?.id ?? row.id,
        title: row.cases?.title ?? "Unnamed case",
        practiceArea: row.cases?.practice_area ?? "pi",
        stage: row.stage ?? "intake",
        limitationDate: row.limitation_date,
        daysUntil,
      };
    })
    .sort((a, b) => {
      if (a.limitationDate === b.limitationDate) return 0;
      if (!a.limitationDate) return 1;
      if (!b.limitationDate) return -1;
      return new Date(a.limitationDate).getTime() - new Date(b.limitationDate).getTime();
    });

  const stageBuckets: StageBuckets = {};
  (stageResult.data ?? []).forEach((row) => {
    if (!row.stage) return;
    stageBuckets[row.stage] = (stageBuckets[row.stage] ?? 0) + 1;
  });

  type TaskRow = {
    id: string;
    case_id: string;
    title: string;
    due_at: string | null;
    status: string;
    cases: { title: string } | null;
  };

  const taskRows: TaskRow[] = (tasksResult.data ?? []).map((task) => {
    const relatedCase = normalizeCase(task.cases);
    return {
      id: String(task.id),
      case_id: String(task.case_id),
      title: task.title ?? "Untitled task",
      due_at: task.due_at ?? null,
      status: task.status ?? "pending",
      cases: relatedCase ? { title: relatedCase.title } : null,
    };
  });

  const upcomingTasks: UpcomingTask[] = taskRows.map((task) => ({
    id: task.id,
    caseId: task.case_id,
    title: task.title,
    dueAt: task.due_at,
    status: task.status,
    caseTitle: task.cases?.title ?? "Unknown case",
  }));

  type DeadlineRow = {
    id: string;
    case_id: string;
    label: string;
    due_date: string;
    cases: { title: string } | null;
  };

  const deadlineRows: DeadlineRow[] = (deadlinesResult.data ?? []).map((deadline) => {
    const relatedCase = normalizeCase(deadline.cases);
    return {
      id: String(deadline.id),
      case_id: String(deadline.case_id),
      label: deadline.label ?? "Protocol deadline",
      due_date: deadline.due_date ?? "",
      cases: relatedCase ? { title: relatedCase.title } : null,
    };
  });

  const upcomingDeadlines: UpcomingDeadline[] = deadlineRows.map((deadline) => ({
    id: deadline.id,
    caseId: deadline.case_id,
    label: deadline.label,
    dueDate: deadline.due_date,
    caseTitle: deadline.cases?.title ?? "Unknown case",
  }));

  return NextResponse.json({
    limitation,
    stageBuckets,
    upcomingTasks,
    upcomingDeadlines,
  });
}


