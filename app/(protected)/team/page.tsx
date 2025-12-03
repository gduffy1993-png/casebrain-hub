import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { calculateFeeEarnerLoad, calculateWipHealth } from "@/lib/workload";
import type { FeeEarnerLoad, WipHealthView, LoadStatus } from "@/lib/workload";
import type { Severity } from "@/lib/types/casebrain";

export default async function TeamDashboardPage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  // Fetch all cases with fee earner info
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, created_by, is_archived, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  // Fetch risk flags
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("case_id, severity")
    .eq("resolved", false);

  // Group cases by creator (as proxy for fee earner)
  const casesByUser: Record<string, Array<{
    caseId: string;
    caseTitle: string;
    isActive: boolean;
    riskLevel: Severity;
    nextDeadline?: string;
  }>> = {};

  (cases ?? []).forEach(c => {
    const userId = c.created_by;
    if (!casesByUser[userId]) {
      casesByUser[userId] = [];
    }

    // Get highest risk for this case
    const caseRisks = (riskFlags ?? []).filter(r => r.case_id === c.id);
    let riskLevel: Severity = "LOW";
    if (caseRisks.some(r => r.severity === "critical")) riskLevel = "CRITICAL";
    else if (caseRisks.some(r => r.severity === "high")) riskLevel = "HIGH";
    else if (caseRisks.some(r => r.severity === "medium")) riskLevel = "MEDIUM";

    casesByUser[userId].push({
      caseId: c.id,
      caseTitle: c.title,
      isActive: !c.is_archived,
      riskLevel,
    });
  });

  // Calculate load for each fee earner
  const feeEarnerLoads: FeeEarnerLoad[] = Object.entries(casesByUser).map(([userId, userCases]) => {
    return calculateFeeEarnerLoad({
      userId,
      userName: `User ${userId.slice(0, 8)}`, // Placeholder name
      cases: userCases,
    });
  });

  // Sort by load score
  feeEarnerLoads.sort((a, b) => b.loadScore - a.loadScore);

  // Calculate WIP health (mock data for now)
  const wipHealth = calculateWipHealth({
    cases: (cases ?? []).map(c => ({
      caseId: c.id,
      caseTitle: c.title,
      wipAmount: Math.random() * 5000, // Mock WIP
      lastActivity: c.updated_at,
      isActive: !c.is_archived,
    })),
    billingTargetMonthly: 50000,
  });

  const loadStatusColors: Record<LoadStatus, string> = {
    UNDERLOADED: "bg-accent/10 text-accent-muted border-accent/20",
    OPTIMAL: "bg-success/10 text-success border-success/20",
    HIGH: "bg-warning/10 text-warning border-warning/20",
    OVERLOADED: "bg-danger/10 text-danger border-danger/20",
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/20 to-primary/20">
            <Users className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-accent">Team Dashboard</h1>
            <p className="text-sm text-accent-soft">
              Fee earner workload and billing health
            </p>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Active Fee Earners"
          value={feeEarnerLoads.length}
          color="primary"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overloaded"
          value={feeEarnerLoads.filter(l => l.loadStatus === "OVERLOADED").length}
          color="danger"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total WIP"
          value={`£${Math.round(wipHealth.totalWip).toLocaleString()}`}
          color="success"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Aged WIP (30+)"
          value={`£${Math.round(wipHealth.unbilledWip).toLocaleString()}`}
          color={wipHealth.unbilledWip > wipHealth.totalWip * 0.3 ? "warning" : "primary"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee Earner Load */}
        <Card
          title="Fee Earner Workload"
          description="Current caseload and risk distribution"
        >
          {feeEarnerLoads.length > 0 ? (
            <div className="space-y-3">
              {feeEarnerLoads.map((load) => (
                <div
                  key={load.userId}
                  className={`rounded-xl border p-4 ${loadStatusColors[load.loadStatus]}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{load.userName}</h3>
                      <div className="mt-1 flex items-center gap-3 text-xs opacity-80">
                        <span>{load.activeCases} active cases</span>
                        {load.criticalRiskCases > 0 && (
                          <span className="text-danger">
                            {load.criticalRiskCases} critical
                          </span>
                        )}
                        {load.upcomingDeadlines > 0 && (
                          <span>{load.upcomingDeadlines} deadlines</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          load.loadStatus === "OVERLOADED" ? "danger" :
                          load.loadStatus === "HIGH" ? "warning" :
                          load.loadStatus === "OPTIMAL" ? "success" :
                          "outline"
                        }
                        size="sm"
                      >
                        {load.loadStatus}
                      </Badge>
                      <div className="mt-1 text-lg font-bold">{load.loadScore}%</div>
                    </div>
                  </div>
                  {/* Load bar */}
                  <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        load.loadStatus === "OVERLOADED" ? "bg-danger" :
                        load.loadStatus === "HIGH" ? "bg-warning" :
                        load.loadStatus === "OPTIMAL" ? "bg-success" :
                        "bg-accent-muted"
                      }`}
                      style={{ width: `${load.loadScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-accent-muted" />
              <p className="mt-4 text-sm text-accent-soft">No fee earner data available</p>
            </div>
          )}
        </Card>

        {/* WIP Health */}
        <Card
          title="Billing & WIP Health"
          description="Work in progress metrics and aging"
        >
          {/* WIP Breakdown */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-accent-muted mb-3">
              WIP Aging
            </h4>
            <div className="grid grid-cols-4 gap-2">
              <AgeBucket
                label="Current"
                amount={wipHealth.agedWip.current}
                status="good"
              />
              <AgeBucket
                label="30-60d"
                amount={wipHealth.agedWip.aged30}
                status={wipHealth.agedWip.aged30 > 2000 ? "warning" : "good"}
              />
              <AgeBucket
                label="60-90d"
                amount={wipHealth.agedWip.aged60}
                status={wipHealth.agedWip.aged60 > 1000 ? "bad" : "warning"}
              />
              <AgeBucket
                label="90d+"
                amount={wipHealth.agedWip.aged90Plus}
                status={wipHealth.agedWip.aged90Plus > 500 ? "bad" : "warning"}
              />
            </div>
          </div>

          {/* Health Metrics */}
          <div className="space-y-3">
            {wipHealth.metrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-accent">{metric.label}</p>
                  <p className="text-xs text-accent-muted">{metric.description}</p>
                </div>
                <Badge
                  variant={
                    metric.status === "GOOD" ? "success" :
                    metric.status === "WARNING" ? "warning" :
                    "danger"
                  }
                  size="sm"
                >
                  {typeof metric.value === "number" && metric.value > 100
                    ? `£${metric.value.toLocaleString()}`
                    : `${metric.value}%`}
                </Badge>
              </div>
            ))}
          </div>

          {/* Top Unbilled Cases */}
          {wipHealth.casesWithSignificantWip.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-accent-muted mb-3">
                Cases Needing Billing Attention
              </h4>
              <ul className="space-y-2">
                {wipHealth.casesWithSignificantWip.slice(0, 5).map((c) => (
                  <li key={c.caseId} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/cases/${c.caseId}`}
                      className="text-accent hover:text-primary transition-colors truncate"
                    >
                      {c.caseTitle}
                    </Link>
                    <span className="text-xs text-accent-muted">
                      £{Math.round(c.wipAmount).toLocaleString()} • {c.daysSinceActivity}d
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "primary" | "secondary" | "success" | "warning" | "danger";
}) {
  const colors = {
    primary: "from-primary/20 to-primary/5 border-primary/30 text-primary",
    secondary: "from-secondary/20 to-secondary/5 border-secondary/30 text-secondary",
    success: "from-success/20 to-success/5 border-success/30 text-success",
    warning: "from-warning/20 to-warning/5 border-warning/30 text-warning",
    danger: "from-danger/20 to-danger/5 border-danger/30 text-danger",
  };

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AgeBucket({
  label,
  amount,
  status,
}: {
  label: string;
  amount: number;
  status: "good" | "warning" | "bad";
}) {
  const colors = {
    good: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    bad: "bg-danger/10 border-danger/20 text-danger",
  };

  return (
    <div className={`rounded-lg border p-2 text-center ${colors[status]}`}>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
      <p className="text-sm font-bold">£{Math.round(amount).toLocaleString()}</p>
    </div>
  );
}

