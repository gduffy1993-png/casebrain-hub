import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Home, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function HousingDashboardPage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  // First get all non-archived housing cases
  const { data: housingCaseIds } = await supabase
    .from("cases")
    .select("id")
    .eq("org_id", orgId)
    .eq("practice_area", "housing_disrepair")
    .eq("is_archived", false);

  const caseIds = housingCaseIds?.map((c) => c.id) ?? [];

  // If no housing cases, return empty dashboard
  if (caseIds.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-accent">Housing Disrepair Dashboard</h1>
          <p className="mt-2 text-sm text-accent/60">
            Overview of housing disrepair cases, compliance, and workflow
          </p>
        </header>
        <Card>
          <p className="text-sm text-accent/60">
            No housing disrepair cases found. Create a housing case to see dashboard metrics.
          </p>
        </Card>
      </div>
    );
  }

  const [
    { data: housingCases },
    { data: defects },
    { data: riskFlags },
    { data: timelineEvents },
  ] = await Promise.all([
    supabase
      .from("housing_cases")
      .select("id, stage, limitation_risk, limitation_date, unfit_for_habitation, hhsrs_category_1_hazards, no_access_days_total")
      .eq("org_id", orgId)
      .in("id", caseIds),
    supabase
      .from("housing_defects")
      .select("id, defect_type, severity, repair_attempted, repair_successful")
      .eq("org_id", orgId),
    supabase
      .from("risk_flags")
      .select("id, severity, case_id")
      .eq("org_id", orgId)
      .eq("resolved", false)
      .in("case_id", []), // Will be populated with housing case IDs
    supabase
      .from("housing_timeline")
      .select("id, event_date, event_type")
      .eq("org_id", orgId)
      .gte("event_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
  ]);

  const totalCases = housingCases?.length ?? 0;
  const unfitCases = housingCases?.filter((c) => c.unfit_for_habitation).length ?? 0;
  const category1HazardCases =
    housingCases?.filter((c) => (c.hhsrs_category_1_hazards?.length ?? 0) > 0).length ?? 0;
  const highNoAccessCases =
    housingCases?.filter((c) => (c.no_access_days_total ?? 0) > 90).length ?? 0;
  const limitationRiskCases =
    housingCases?.filter((c) => c.limitation_risk === "high" || c.limitation_risk === "critical")
      .length ?? 0;

  const stageCounts = {
    intake: housingCases?.filter((c) => c.stage === "intake").length ?? 0,
    investigation: housingCases?.filter((c) => c.stage === "investigation").length ?? 0,
    pre_action: housingCases?.filter((c) => c.stage === "pre_action").length ?? 0,
    litigation: housingCases?.filter((c) => c.stage === "litigation").length ?? 0,
    settlement: housingCases?.filter((c) => c.stage === "settlement").length ?? 0,
  };

  const unrepairedDefects =
    defects?.filter((d) => !d.repair_successful && d.repair_attempted).length ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Housing Disrepair Dashboard</h1>
        <p className="mt-2 text-sm text-accent/60">
          Overview of housing disrepair cases, compliance, and workflow
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-3">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50">Total Cases</p>
              <p className="text-2xl font-semibold text-accent">{totalCases}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-danger/20 p-3">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50">
                Category 1 Hazards
              </p>
              <p className="text-2xl font-semibold text-accent">{category1HazardCases}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-warning/20 p-3">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50">
                High No-Access
              </p>
              <p className="text-2xl font-semibold text-accent">{highNoAccessCases}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-danger/20 p-3">
              <TrendingUp className="h-5 w-5 text-danger" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50">
                Limitation Risk
              </p>
              <p className="text-2xl font-semibold text-accent">{limitationRiskCases}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Case Stages">
          <div className="space-y-3">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-sm capitalize text-accent/70">
                  {stage.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-semibold text-accent">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Critical Alerts">
          <div className="space-y-3">
            {unfitCases > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-danger/20 bg-danger/5 p-3">
                <span className="text-sm text-accent/70">Unfit for Habitation</span>
                <span className="text-sm font-semibold text-danger">{unfitCases}</span>
              </div>
            )}
            {unrepairedDefects > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-warning/20 bg-warning/5 p-3">
                <span className="text-sm text-accent/70">Unrepaired Defects</span>
                <span className="text-sm font-semibold text-warning">{unrepairedDefects}</span>
              </div>
            )}
            {limitationRiskCases > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-danger/20 bg-danger/5 p-3">
                <span className="text-sm text-accent/70">High Limitation Risk</span>
                <span className="text-sm font-semibold text-danger">{limitationRiskCases}</span>
              </div>
            )}
            {category1HazardCases > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-danger/20 bg-danger/5 p-3">
                <span className="text-sm text-accent/70">Category 1 Hazards</span>
                <span className="text-sm font-semibold text-danger">{category1HazardCases}</span>
              </div>
            )}
            {unfitCases === 0 &&
              unrepairedDefects === 0 &&
              limitationRiskCases === 0 &&
              category1HazardCases === 0 && (
                <p className="text-sm text-accent/60">No critical alerts at this time</p>
              )}
          </div>
        </Card>
      </div>
    </div>
  );
}

