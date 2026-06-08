"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Plus, Play, Download, Calendar } from "lucide-react";
import { format } from "date-fns";

type CustomReport = {
  id: string;
  name: string;
  description: string | null;
  dataSource: string;
  chartType: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomReportsPanelProps = {
  caseId?: string;
};

export function CustomReportsPanel({ caseId }: CustomReportsPanelProps) {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const response = await fetch("/api/reports/custom");
        if (response.ok) {
          const data = await response.json();
          setReports(data);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  const handleExecute = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/custom/${reportId}/execute`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Report executed: ${result.summary.totalRows} rows`);
        // TODO: Show results in modal or new page
      }
    } catch (error) {
      console.error("Failed to execute report:", error);
      alert("Failed to execute report");
    }
  };

  const getDataSourceColor = (source: string) => {
    switch (source) {
      case "cases":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "time_entries":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "invoices":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "communication_events":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Reports</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            No custom reports yet
          </p>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Report
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{report.name}</span>
                    <Badge className={getDataSourceColor(report.dataSource)}>
                      {report.dataSource.replace("_", " ")}
                    </Badge>
                    {report.chartType && (
                      <Badge variant="outline">{report.chartType}</Badge>
                    )}
                  </div>
                  {report.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {report.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Created {format(new Date(report.createdAt), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExecute(report.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

