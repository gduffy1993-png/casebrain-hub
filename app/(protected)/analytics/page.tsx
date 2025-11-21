import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";

type CaseMetricRow = {
  case_id: string;
  title: string;
  status: string | null;
  created_at: string;
  document_count: number;
  letter_count: number;
  next_deadline: string | null;
};

type TemplateMetricRow = {
  template_id: string;
  name: string;
  role: string | null;
  usage_count: number;
  last_used_at: string | null;
};

export default async function AnalyticsPage() {
  const { orgId } = await requireRole(["owner", "solicitor"]);
  const supabase = getSupabaseAdminClient();

  const [
    { data: caseMetrics },
    { data: templateMetrics },
    { data: openRisks },
    { data: upcomingTasks },
  ] =
    await Promise.all([
      supabase
        .from("case_metrics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("template_metrics")
        .select("*")
        .order("usage_count", { ascending: false })
        .limit(25),
      supabase
        .from("risk_flags")
        .select("severity")
        .eq("resolved", false),
      supabase
        .from("tasks")
        .select("id, title, due_at, status, case_id, cases(title)")
        .eq("org_id", orgId)
        .eq("status", "pending")
        .order("due_at", { ascending: true })
        .limit(10),
    ]);

  const typedRisks = (openRisks as Array<{ severity: string | null }> | null) ?? [];
  const riskCounts = typedRisks.reduce<Record<string, number>>((acc, flag) => {
    if (!flag.severity) return acc;
    acc[flag.severity] = (acc[flag.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-accent/60">
          Monitor workload, template adoption, and upcoming risks across your organisation.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Case workload" description="Top matters by recent activity.">
          <div className="overflow-x-auto rounded-2xl border border-primary/10">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-accent/40">
                <tr>
                  <th className="px-4 py-3 text-left">Case</th>
                  <th className="px-4 py-3 text-left">Documents</th>
                  <th className="px-4 py-3 text-left">Letters</th>
                  <th className="px-4 py-3 text-left">Next deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 text-accent/80">
                {(caseMetrics as CaseMetricRow[] | null | undefined)?.length ? (
                  caseMetrics!.map((row) => (
                    <tr key={row.case_id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-accent">{row.title}</p>
                        <p className="text-xs text-accent/50">
                          Opened {new Date(row.created_at).toLocaleDateString("en-GB")}
                          {row.status ? ` • ${row.status}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">{row.document_count}</td>
                      <td className="px-4 py-3">{row.letter_count}</td>
                      <td className="px-4 py-3">
                        {row.next_deadline
                          ? new Date(row.next_deadline).toLocaleDateString("en-GB")
                          : "None"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-accent/60" colSpan={4}>
                      No case data yet. Upload documents to populate analytics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Risk outlook" description="Outstanding risk alerts grouped by severity.">
          <div className="grid gap-3 md:grid-cols-2">
            {(["critical", "high", "medium", "low"] as const).map((level) => {
              const count = riskCounts[level] ?? 0;
              return (
                <div
                  key={level}
                  className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4 text-sm text-accent/70"
                >
                  <p className="text-xs uppercase tracking-wide text-accent/40">
                    {level}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-accent">{count}</p>
                  <p className="text-xs text-accent/50">Open alerts</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Upcoming tasks" description="Next automation actions due soon.">
          <ul className="space-y-3">
              {(upcomingTasks ?? []).length ? (
                upcomingTasks!.map((task) => (
                <li
                  key={task.id}
                  className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-3 text-sm text-accent/70"
                >
                  <p className="font-semibold text-accent">{task.title}</p>
                  <p className="text-xs text-accent/40">
                    Due {task.due_at ? new Date(task.due_at).toLocaleString("en-GB") : "Soon"} •{" "}
                      {Array.isArray(task.cases)
                        ? task.cases[0]?.title ?? "Unassigned"
                        : (task.cases as { title?: string } | null | undefined)?.title ??
                          "Unassigned"}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-sm text-accent/60">No pending tasks scheduled.</li>
            )}
          </ul>
        </Card>

        <Card
          title="Template performance"
          description="Track usage and recency by template."
        >
          <div className="overflow-x-auto rounded-2xl border border-primary/10">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-accent/40">
                <tr>
                  <th className="px-4 py-3 text-left">Template</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Usage</th>
                  <th className="px-4 py-3 text-left">Last used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 text-accent/80">
                {(templateMetrics as TemplateMetricRow[] | null | undefined)?.length ? (
                  templateMetrics!.map((row) => (
                    <tr key={row.template_id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-accent">{row.name}</p>
                      </td>
                      <td className="px-4 py-3">{row.role ?? "—"}</td>
                      <td className="px-4 py-3">{row.usage_count}</td>
                      <td className="px-4 py-3">
                        {row.last_used_at
                          ? new Date(row.last_used_at).toLocaleDateString("en-GB")
                          : "Never"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-accent/60" colSpan={4}>
                      No template usage recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

