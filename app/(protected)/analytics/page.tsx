import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from "lucide-react";

export default async function AnalyticsPage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();
  
  // Get case statistics
  const { data: cases } = await supabase
    .from("cases")
    .select("id, practice_area, is_archived, created_at")
    .eq("org_id", orgId);
  
  // Get time tracking stats
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("duration_minutes, billable, activity_type, start_time")
    .eq("org_id", orgId)
    .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days
  
  // Get risk flags
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("severity, resolved")
    .eq("org_id", orgId);
  
  // Get settlement calculations
  const { data: settlements } = await supabase
    .from("settlement_calculations")
    .select("result, calculation_type, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);
  
  const activeCases = (cases || []).filter((c) => !c.is_archived).length;
  const archivedCases = (cases || []).filter((c) => c.is_archived).length;
  
  const totalBillableMinutes = (timeEntries || [])
    .filter((e) => e.billable && e.duration_minutes)
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const totalBillableHours = Math.round(totalBillableMinutes / 60);
  
  const criticalRisks = (riskFlags || []).filter((r) => r.severity === "critical" && !r.resolved).length;
  const highRisks = (riskFlags || []).filter((r) => r.severity === "high" && !r.resolved).length;
  
  const averageSettlement = settlements && settlements.length > 0
    ? Math.round(
        settlements.reduce((sum, s) => {
          const result = s.result as { total?: number } | null;
          return sum + (result?.total || 0);
        }, 0) / settlements.length
      )
    : 0;
  
  // Practice area breakdown
  const practiceAreaCounts = (cases || []).reduce((acc, c) => {
    const area = c.practice_area || "other";
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics & Reporting</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of case performance, time tracking, and key metrics
        </p>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <Badge variant="primary" size="sm">{activeCases}</Badge>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Active Cases</h3>
          <p className="text-xs text-muted-foreground mt-1">{archivedCases} archived</p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <Badge variant="primary" size="sm">{totalBillableHours}h</Badge>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Billable Hours (30d)</h3>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <Badge variant="danger" size="sm">{criticalRisks}</Badge>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Critical Risks</h3>
          <p className="text-xs text-muted-foreground mt-1">{highRisks} high priority</p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <Badge variant="success" size="sm">
              {averageSettlement > 0 ? `£${(averageSettlement / 1000).toFixed(0)}k` : "N/A"}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-foreground">Avg Settlement</h3>
          <p className="text-xs text-muted-foreground mt-1">Based on calculations</p>
        </Card>
      </div>
      
      {/* Practice Area Breakdown */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Cases by Practice Area
          </div>
        }
        description="Distribution of cases across practice areas"
      >
        <div className="space-y-3">
          {Object.entries(practiceAreaCounts).map(([area, count]) => (
            <div key={area} className="flex items-center justify-between">
              <span className="text-sm text-foreground capitalize">
                {area.replace("_", " ")}
              </span>
              <Badge variant="outline" size="sm">{count}</Badge>
            </div>
          ))}
          {Object.keys(practiceAreaCounts).length === 0 && (
            <p className="text-sm text-muted-foreground">No cases yet</p>
          )}
        </div>
      </Card>
      
      {/* Recent Settlements */}
      {settlements && settlements.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Settlement Calculations
            </div>
          }
          description="Latest settlement calculations"
        >
          <div className="space-y-2">
            {settlements.slice(0, 5).map((settlement, i) => {
              const result = settlement.result as { total?: number } | null;
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {settlement.calculation_type.toUpperCase()} Calculation
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(settlement.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  {result?.total && (
                    <Badge variant="success" size="sm">
                      £{result.total.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
