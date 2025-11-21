import Link from "next/link";
import { headers } from "next/headers";
import { format } from "date-fns";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PiDashboardData = {
  limitation: Array<{
    caseId: string;
    title: string;
    practiceArea: string;
    stage: string;
    limitationDate: string | null;
    daysUntil: number | null;
  }>;
  stageBuckets: Record<string, number>;
  upcomingTasks: Array<{
    id: string;
    caseId: string;
    title: string;
    dueAt: string | null;
    status: string;
    caseTitle: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    caseId: string;
    label: string;
    dueDate: string;
    caseTitle: string;
  }>;
};

const STAGE_LABELS: Record<string, string> = {
  intake: "Intake",
  investigation: "Investigation",
  liability: "Liability",
  quantum: "Quantum",
  settlement: "Settlement",
  closed: "Closed",
};

export default async function PiDashboardPage() {
  await requireRole(["owner", "solicitor", "paralegal"]);

  const headerList = headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${protocol}://${host}` : "";

  const response = await fetch(`${baseUrl}/api/pi/dashboard`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load PI dashboard data.");
  }
  const data = (await response.json()) as PiDashboardData;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-accent">PI / Clinical Neg dashboard</h1>
        <p className="text-sm text-accent/60">
          Monitor limitation exposure, protocol stages, and outstanding tasks for PI and clinical
          negligence matters. Limitation helper is indicative only and does not replace qualified
          advice.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <LimitationCard limitation={data.limitation} />
        <StageDistributionCard stageBuckets={data.stageBuckets} />
        <ProtocolTipsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingTasksCard tasks={data.upcomingTasks} />
        <UpcomingDeadlinesCard deadlines={data.upcomingDeadlines} />
      </div>
    </div>
  );
}

function LimitationCard({
  limitation,
}: {
  limitation: PiDashboardData["limitation"];
}) {
  return (
    <Card
      title="Limitation radar"
      description="Ordered by limitation date. Review regularly and issue where appropriate."
      action={
        <Link href="/cases?practiceArea=pi" className="text-xs font-semibold text-primary">
          View PI cases
        </Link>
      }
    >
      {limitation.length ? (
        <ul className="space-y-3">
          {limitation.slice(0, 8).map((entry) => (
            <li
              key={entry.caseId}
              className="rounded-2xl border border-primary/10 bg-surface-muted/70 p-4 text-sm text-accent/70"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/cases/${entry.caseId}`}
                    className="font-semibold text-accent hover:text-primary"
                  >
                    {entry.title}
                  </Link>
                  <p className="mt-1 text-xs text-accent/50">
                    Stage: {STAGE_LABELS[entry.stage] ?? entry.stage}
                  </p>
                </div>
                <span>{renderRiskBadge(entry.daysUntil)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-accent/50">
                <CalendarClock className="h-4 w-4" />
                <span>
                  Limitation:{" "}
                  {entry.limitationDate
                    ? format(new Date(entry.limitationDate), "dd MMM yyyy")
                    : "Not set"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No PI / Clinical Neg cases recorded yet." />
      )}
    </Card>
  );
}

function renderRiskBadge(daysUntil: number | null) {
  if (daysUntil === null) {
    return <Badge variant="warning">Unknown</Badge>;
  }
  if (daysUntil < 0) {
    return (
      <Badge variant="danger" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </Badge>
    );
  }
  if (daysUntil <= 90) {
    return (
      <Badge variant="danger" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {daysUntil} days
      </Badge>
    );
  }
  if (daysUntil <= 180) {
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {daysUntil} days
      </Badge>
    );
  }
  return <Badge variant="success">{daysUntil} days</Badge>;
}

function StageDistributionCard({
  stageBuckets,
}: {
  stageBuckets: PiDashboardData["stageBuckets"];
}) {
  const entries = Object.entries(stageBuckets);

  return (
    <Card
      title="Protocol progress"
      description="Overview of where PI / Clinical Neg cases sit within the lifecycle."
    >
      {entries.length ? (
        <ul className="space-y-2 text-sm text-accent/70">
          {entries.map(([stage, count]) => (
            <li
              key={stage}
              className="flex items-center justify-between rounded-2xl border border-primary/10 bg-surface-muted/60 px-4 py-3"
            >
              <span className="font-medium text-accent">
                {STAGE_LABELS[stage] ?? stage.replace(/_/g, " ")}
              </span>
              <span className="text-accent/50">{count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No PI / Clinical Neg stage data yet." />
      )}
    </Card>
  );
}

function ProtocolTipsCard() {
  return (
    <Card title="Protocol reminders" description="Quick pointers for the PI protocol cadence.">
      <ul className="space-y-2 text-sm text-accent/70">
        <li className="rounded-2xl border border-primary/10 bg-primary/5 p-3">
          Submit CNF / LOI within 1 working day of instruction and diarise acknowledgement dates.
        </li>
        <li className="rounded-2xl border border-primary/10 bg-primary/5 p-3">
          Track medical records chase dates and expert report deadlines – mark received copies on the case.
        </li>
        <li className="rounded-2xl border border-primary/10 bg-primary/5 p-3">
          Review limitation monthly; escalate any cases within six months of expiry.
        </li>
      </ul>
      <p className="mt-4 text-xs text-accent/50">
        These helpers are for internal workflow only. They do not replace official guidance or legal assessment.
      </p>
    </Card>
  );
}

function UpcomingTasksCard({
  tasks,
}: {
  tasks: PiDashboardData["upcomingTasks"];
}) {
  return (
    <Card
      title="Upcoming PI tasks"
      description="Open tasks for PI / Clinical Neg cases."
    >
      {tasks.length ? (
        <ul className="space-y-3 text-sm text-accent/70">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border border-primary/10 bg-surface-muted/70 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/cases/${task.caseId}`} className="font-semibold text-accent hover:text-primary">
                    {task.caseTitle}
                  </Link>
                  <p className="text-xs text-accent/50">{task.title}</p>
                </div>
                <Badge variant="default">{task.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-accent/50">
                Due {task.dueAt ? format(new Date(task.dueAt), "dd MMM yyyy") : "unscheduled"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No open PI tasks right now." />
      )}
    </Card>
  );
}

function UpcomingDeadlinesCard({
  deadlines,
}: {
  deadlines: PiDashboardData["upcomingDeadlines"];
}) {
  return (
    <Card
      title="Upcoming protocol deadlines"
      description="Deadlines seeded from the PI / Clinical Neg protocol helper."
    >
      {deadlines.length ? (
        <ul className="space-y-3 text-sm text-accent/70">
          {deadlines.map((deadline) => (
            <li
              key={deadline.id}
              className="rounded-2xl border border-primary/10 bg-surface-muted/70 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/cases/${deadline.caseId}`} className="font-semibold text-accent hover:text-primary">
                    {deadline.caseTitle}
                  </Link>
                  <p className="text-xs text-accent/50">{deadline.label}</p>
                </div>
                <Badge variant="warning">{format(new Date(deadline.dueDate), "dd MMM yyyy")}</Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No protocol deadlines scheduled." />
      )}
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-sm text-accent/60">{message}</div>
  );
}


