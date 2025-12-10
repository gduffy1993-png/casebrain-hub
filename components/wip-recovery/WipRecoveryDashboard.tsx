"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, TrendingUp, DollarSign, Clock, FileText } from "lucide-react";
import type { PracticeArea } from "@/lib/types/casebrain";
import { PRACTICE_AREA_OPTIONS } from "@/lib/types/casebrain";
import Link from "next/link";

type WipRecoverySummary = {
  totalUnbilled: number;
  totalUnbilledTime: number;
  totalUnbilledDisbursements: number;
  recoveryRate: number;
  alerts: Array<{
    id: string;
    caseId: string;
    caseTitle: string;
    alertType: string;
    practiceArea: PracticeArea;
    severity: "low" | "medium" | "high" | "critical";
    unbilledAmount: number;
    daysUnbilled: number;
    message: string;
    recommendedAction: string;
  }>;
  byPracticeArea: Record<PracticeArea, {
    unbilled: number;
    alerts: number;
  }>;
};

type WipRecoveryDashboardProps = {
  defaultPracticeArea?: PracticeArea;
};

export function WipRecoveryDashboard({ defaultPracticeArea }: WipRecoveryDashboardProps) {
  const [summary, setSummary] = useState<WipRecoverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPracticeArea, setSelectedPracticeArea] = useState<PracticeArea | "all">(
    defaultPracticeArea || "all"
  );

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const url = selectedPracticeArea === "all"
          ? "/api/wip-recovery/summary"
          : `/api/wip-recovery/summary?practiceArea=${selectedPracticeArea}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch WIP recovery summary");
        
        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error("Failed to fetch WIP recovery summary:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [selectedPracticeArea]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading WIP recovery data…</span>
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No WIP recovery data available.</p>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header with Practice Area Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-foreground" />
          <h2 className="text-xl font-semibold text-foreground">WIP Recovery Optimizer</h2>
        </div>
        
        {/* Practice Area Tabs */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectedPracticeArea === "all" ? "primary" : "outline"}
            onClick={() => setSelectedPracticeArea("all")}
          >
            All
          </Button>
          {PRACTICE_AREA_OPTIONS.map(area => (
            <Button
              key={area.value}
              size="sm"
              variant={selectedPracticeArea === area.value ? "primary" : "outline"}
              onClick={() => setSelectedPracticeArea(area.value)}
            >
              {area.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Unbilled</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalUnbilled)}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Unbilled Time</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.totalUnbilledTime.toFixed(1)}h</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Unbilled Disbursements</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalUnbilledDisbursements)}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Recovery Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.recoveryRate.toFixed(1)}%</p>
          {summary.recoveryRate < 75 && (
            <p className="text-xs text-amber-400 mt-1">Industry average: 75%</p>
          )}
        </Card>
      </div>

      {/* Alerts */}
      {summary.alerts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Recovery Alerts</h3>
            <Badge variant="outline">{summary.alerts.length}</Badge>
          </div>

          <div className="space-y-3">
            {summary.alerts.map(alert => (
              <div
                key={alert.id}
                className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Link
                        href={`/cases/${alert.caseId}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {alert.caseTitle}
                      </Link>
                    </div>
                    <p className="text-sm text-foreground mb-1">{alert.message}</p>
                    {alert.unbilledAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Unbilled: {formatCurrency(alert.unbilledAmount)}
                        {alert.daysUnbilled > 0 && ` • ${alert.daysUnbilled} days old`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-2 rounded bg-cyan-950/30 border border-cyan-800/30">
                  <p className="text-xs font-medium text-cyan-300 mb-1">Recommended Action:</p>
                  <p className="text-xs text-cyan-200/90">{alert.recommendedAction}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Practice Area Breakdown */}
      {selectedPracticeArea === "all" && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">By Practice Area</h3>
          <div className="space-y-2">
            {Object.entries(summary.byPracticeArea).map(([area, data]) => {
              if (data.unbilled === 0 && data.alerts === 0) return null;
              const areaLabel = PRACTICE_AREA_OPTIONS.find(a => a.value === area)?.label || area;
              return (
                <div
                  key={area}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                >
                  <span className="text-sm font-medium text-foreground">{areaLabel}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(data.unbilled)}
                    </span>
                    {data.alerts > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {data.alerts} alert{data.alerts !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

