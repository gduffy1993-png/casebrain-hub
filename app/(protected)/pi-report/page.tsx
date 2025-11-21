import { headers } from "next/headers";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PiReportResponse = {
  ok: boolean;
  dev?: boolean;
  message?: string;
  data: {
    totalCases: number;
    totalDisbursements: number;
    limitationBuckets: {
      within30: number;
      within90: number;
      beyond90: number;
    };
    averageDaysOpen: number;
    riskCounts: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    topCases: Array<{
      caseId: string;
      title: string;
      limitationDate: string | null;
      stage: string;
      severity: string;
    }>;
  };
};

export default async function PiReportPage() {
  await requireRole(["owner", "solicitor"]);

  const headerList = headers();
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const baseUrl = host ? `${protocol}://${host}` : "";

  const response = await fetch(`${baseUrl}/api/pi-report`, { cache: "no-store" });
  const payload = (await response.json()) as PiReportResponse;

  if (!response.ok || !payload.ok) {
    throw new Error("Unable to load PI report.");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-accent">PI / Clinical Neg report</h1>
        <p className="text-sm text-accent/60">
          High-level analytics for personal injury and clinical negligence workstreams.
        </p>
      </header>

      {payload.dev ? (
        <Card>
          <p className="text-sm text-accent/60">
            {payload.message ??
              "Connect to a real organisation to populate PI metrics and risk insights."}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Open PI cases" value={payload.data.totalCases} tone="primary" />
            <MetricCard
              label="Average days open"
              value={payload.data.averageDaysOpen}
              tone="warning"
            />
            <MetricCard
              label="Total disbursements"
              value={`£${payload.data.totalDisbursements.toLocaleString("en-GB")}`}
              tone="primary"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Limitation exposure"
              description="Distribution of PI cases by limitation window (days remaining)."
            >
              <BarChart buckets={payload.data.limitationBuckets} />
            </Card>
            <Card
              title="Risk levels"
              description="Risk flags raised by the PI engine, grouped by severity."
            >
              <RiskSummary counts={payload.data.riskCounts} />
            </Card>
          </div>

          <Card
            title="Highest risk cases"
            description="Top flagged PI cases ordered by severity and limitation date."
          >
            {payload.data.topCases.length ? (
              <table className="w-full text-left text-sm text-accent/70">
                <thead className="text-xs uppercase tracking-wide text-accent/40">
                  <tr>
                    <th className="py-2">Case</th>
                    <th className="py-2">Limitation</th>
                    <th className="py-2">Stage</th>
                    <th className="py-2">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {payload.data.topCases.map((row) => (
                    <tr key={row.caseId}>
                      <td className="py-3">
                        <Link
                          href={`/cases/${row.caseId}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="py-3">
                        {row.limitationDate
                          ? new Date(row.limitationDate).toLocaleDateString("en-GB")
                          : "Not recorded"}
                      </td>
                      <td className="py-3 capitalize">{row.stage.replace(/_/g, " ")}</td>
                      <td className="py-3">
                        <Badge variant={badgeTone(row.severity)}>{row.severity}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-accent/60">
                No risk alerts have been raised by the PI engine yet.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "primary" | "warning";
}) {
  return (
    <Card className="border-none shadow-card">
      <p className="text-xs uppercase tracking-[0.2em] text-accent/50">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold ${
          tone === "warning" ? "text-warning" : "text-primary"
        }`}
      >
        {value}
      </p>
    </Card>
  );
}

function BarChart({ buckets }: { buckets: { within30: number; within90: number; beyond90: number } }) {
  const maxValue = Math.max(buckets.within30, buckets.within90, buckets.beyond90, 1);
  const data = [
    { label: "0-30 days", value: buckets.within30 },
    { label: "31-90 days", value: buckets.within90 },
    { label: "90+ days", value: buckets.beyond90 },
  ];

  return (
    <div className="grid gap-3">
      {data.map((bucket) => (
        <div key={bucket.label}>
          <div className="flex items-center justify-between text-xs text-accent/60">
            <span>{bucket.label}</span>
            <span>{bucket.value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(bucket.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskSummary({
  counts,
}: {
  counts: { low: number; medium: number; high: number; critical: number };
}) {
  const entries = [
    { label: "Critical", value: counts.critical, tone: "text-danger" },
    { label: "High", value: counts.high, tone: "text-warning" },
    { label: "Medium", value: counts.medium, tone: "text-accent/70" },
    { label: "Low", value: counts.low, tone: "text-accent/50" },
  ];

  return (
    <ul className="space-y-2 text-sm">
      {entries.map((entry) => (
        <li
          key={entry.label}
          className="flex items-center justify-between rounded-2xl border border-primary/10 bg-surface-muted/60 px-4 py-3"
        >
          <span className={`font-semibold ${entry.tone}`}>{entry.label}</span>
          <span className="text-accent/70">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

function badgeTone(severity: string) {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "default";
    default:
      return "default";
  }
}


