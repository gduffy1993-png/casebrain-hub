"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, RefreshCw, Sparkles } from "lucide-react";
import type { SupervisionPack } from "@/lib/housing/supervision-pack";

type SupervisionPackPanelProps = {
  caseId: string;
};

export function SupervisionPackPanel({ caseId }: SupervisionPackPanelProps) {
  const [pack, setPack] = useState<SupervisionPack | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchPack = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/supervision/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        setPack(data.pack);
        setMarkdown(data.markdown);
      }
    } catch (error) {
      console.error("Failed to fetch supervision pack", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePack = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/supervision/generate/${caseId}`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setPack(data.pack);
        setMarkdown(data.markdown);
      }
    } catch (error) {
      console.error("Failed to generate supervision pack", error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadMarkdown = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supervision-pack-${caseId}-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchPack();
  }, [caseId]);

  if (loading && !pack) {
    return (
      <Card title="Supervision Pack Generator">
        <p className="text-sm text-accent/60">Loading supervision pack...</p>
      </Card>
    );
  }

  return (
    <Card
      title="Supervision Pack Generator"
      description="One-click supervisor report generation. Replaces supervision notes trainees write on Word."
      action={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPack}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {markdown && (
            <Button variant="secondary" size="sm" onClick={downloadMarkdown} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={generatePack}
            disabled={generating}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : "Generate Pack"}
          </Button>
        </div>
      }
    >
      {pack ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
              Case Summary
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-accent/60">Practice Area</p>
                <p className="font-semibold text-accent">{pack.summary.practiceArea}</p>
              </div>
              <div>
                <p className="text-xs text-accent/60">Stage</p>
                <p className="font-semibold text-accent">{pack.summary.stage}</p>
              </div>
              <div>
                <p className="text-xs text-accent/60">Priority</p>
                <Badge
                  variant={
                    pack.summary.priority === "emergency"
                      ? "danger"
                      : pack.summary.priority === "high"
                        ? "danger"
                        : pack.summary.priority === "medium"
                          ? "warning"
                          : "secondary"
                  }
                >
                  {pack.summary.priority.toUpperCase()} ({pack.summary.priorityScore}/100)
                </Badge>
              </div>
            </div>
            <p className="text-xs text-accent/80 mt-3">{pack.summary.facts}</p>
          </div>

          {/* Limitation */}
          <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
              Limitation Position
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {pack.limitation.limitationDate && (
                <div>
                  <p className="text-xs text-accent/60">Limitation Date</p>
                  <p className="font-semibold text-accent">
                    {new Date(pack.limitation.limitationDate).toLocaleDateString("en-GB")}
                  </p>
                </div>
              )}
              {pack.limitation.daysRemaining !== null && (
                <div>
                  <p className="text-xs text-accent/60">Days Remaining</p>
                  <p
                    className={`font-semibold ${
                      pack.limitation.daysRemaining < 0
                        ? "text-danger"
                        : pack.limitation.daysRemaining <= 90
                          ? "text-danger"
                          : pack.limitation.daysRemaining <= 180
                            ? "text-warning"
                            : "text-accent"
                    }`}
                  >
                    {pack.limitation.daysRemaining}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-accent/60">Status</p>
                <Badge
                  variant={
                    pack.limitation.status === "expired"
                      ? "danger"
                      : pack.limitation.status === "urgent"
                        ? "danger"
                        : pack.limitation.status === "monitoring"
                          ? "warning"
                          : "secondary"
                  }
                >
                  {pack.limitation.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-accent/80 mt-3">{pack.limitation.explanation}</p>
          </div>

          {/* Hazards */}
          <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
              Hazard Position
            </p>
            <div className="space-y-2 text-sm">
              {pack.hazards.category1Hazards.length > 0 && (
                <div>
                  <p className="text-xs text-accent/60">Category 1 Hazards</p>
                  <p className="font-semibold text-danger">
                    {pack.hazards.category1Hazards.join(", ")}
                  </p>
                </div>
              )}
              {pack.hazards.category2Hazards.length > 0 && (
                <div>
                  <p className="text-xs text-accent/60">Category 2 Hazards</p>
                  <p className="font-semibold text-warning">
                    {pack.hazards.category2Hazards.join(", ")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-accent/60">Unfit for Habitation</p>
                <Badge variant={pack.hazards.unfitForHabitation ? "danger" : "secondary"}>
                  {pack.hazards.unfitForHabitation ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Awaab's Law */}
          {pack.awaabsLaw.applicable && (
            <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
                Awaab's Law Status
              </p>
              {pack.awaabsLaw.status && (
                <p className="text-xs text-accent/80 mb-3">{pack.awaabsLaw.status}</p>
              )}
              {pack.awaabsLaw.riskCategory && (
                <Badge variant="danger" className="mb-2">
                  Risk Category {pack.awaabsLaw.riskCategory}
                </Badge>
              )}
              {pack.awaabsLaw.enforcementChecklist.length > 0 && (
                <div className="mt-3 space-y-2">
                  {pack.awaabsLaw.enforcementChecklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <span
                        className={
                          item.status === "completed"
                            ? "text-primary"
                            : item.status === "overdue"
                              ? "text-danger"
                              : "text-accent/30"
                        }
                      >
                        {item.status === "completed" ? "✓" : item.status === "overdue" ? "✗" : "○"}
                      </span>
                      <span className="text-accent/80">{item.item}</span>
                      {item.deadline && (
                        <span className="text-accent/60">
                          ({new Date(item.deadline).toLocaleDateString("en-GB")})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vulnerability */}
          {pack.vulnerability.factors.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
                Vulnerability & Priority
              </p>
              <div className="space-y-2">
                {pack.vulnerability.factors.map((factor, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge
                      variant={
                        factor.severity === "critical"
                          ? "danger"
                          : factor.severity === "high"
                            ? "danger"
                            : factor.severity === "medium"
                              ? "warning"
                              : "secondary"
                      }
                      className="text-xs"
                    >
                      {factor.severity.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-accent/80">{factor.description}</p>
                  </div>
                ))}
              </div>
              {pack.vulnerability.crossRisk && (
                <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-2">
                  <p className="text-xs font-semibold text-danger">
                    ⚠️ CROSS-RISK: Health vulnerability combined with relevant hazard
                  </p>
                </div>
              )}
              <p className="text-xs text-accent/70 mt-3">
                Recommended Urgency: <strong>{pack.vulnerability.recommendedUrgency.toUpperCase()}</strong>
              </p>
            </div>
          )}

          {/* Risk Alerts */}
          {pack.riskAlerts.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
                Risk Alerts ({pack.riskAlerts.length})
              </p>
              <div className="space-y-2">
                {pack.riskAlerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-primary/20 bg-surface-muted/70 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "danger"
                            : alert.severity === "high"
                              ? "danger"
                              : alert.severity === "medium"
                                ? "warning"
                                : "secondary"
                        }
                        className="text-xs"
                      >
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <p className="font-semibold text-accent text-sm">{alert.title}</p>
                    </div>
                    <p className="text-xs text-accent/80">{alert.message}</p>
                  </div>
                ))}
                {pack.riskAlerts.length > 5 && (
                  <p className="text-xs text-accent/60 italic">
                    + {pack.riskAlerts.length - 5} more risk alerts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {pack.recommendedActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
                Recommended Actions ({pack.recommendedActions.length})
              </p>
              <ul className="space-y-2">
                {pack.recommendedActions.map((action, index) => (
                  <li key={index} className="text-xs text-accent/80 flex gap-2">
                    <Badge
                      variant={
                        action.priority === "urgent"
                          ? "danger"
                          : action.priority === "high"
                            ? "danger"
                            : action.priority === "medium"
                              ? "warning"
                              : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {action.priority.toUpperCase()}
                    </Badge>
                    <span className="flex-1">
                      {action.action}
                      {action.deadline && (
                        <span className="text-accent/60 ml-2">(Due: {action.deadline})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Outstanding Tasks */}
          {pack.outstandingTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/70 mb-2">
                Outstanding Tasks ({pack.outstandingTasks.length})
              </p>
              <ul className="space-y-1">
                {pack.outstandingTasks.map((task, index) => (
                  <li key={index} className="text-xs text-accent/80 flex gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      {task.task}
                      {task.assigned && <span className="text-accent/60"> (Assigned: {task.assigned})</span>}
                      {task.dueDate && <span className="text-accent/60"> (Due: {task.dueDate})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-accent/50 italic mt-4">{pack.disclaimer}</p>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-primary/50 mx-auto mb-4" />
          <p className="text-sm text-accent/60 mb-4">
            No supervision pack found. Generate one to create a comprehensive supervisor report.
          </p>
          <Button variant="primary" size="sm" onClick={generatePack} disabled={generating}>
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate Supervision Pack"}
          </Button>
        </div>
      )}
    </Card>
  );
}

