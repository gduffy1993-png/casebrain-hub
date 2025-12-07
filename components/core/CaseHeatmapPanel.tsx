"use client";

import { useState } from "react";
import { Activity, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CaseHeatmap, CaseHeatmapCell, HeatmapStatus } from "@/lib/types/casebrain";

type CaseHeatmapPanelProps = {
  heatmap: CaseHeatmap;
};

const statusColors: Record<HeatmapStatus, string> = {
  RED: "bg-danger text-white",
  AMBER: "bg-warning text-white",
  GREEN: "bg-green-500 text-white",
};

const statusBgColors: Record<HeatmapStatus, string> = {
  RED: "bg-danger/10 border-danger/20",
  AMBER: "bg-warning/10 border-warning/20",
  GREEN: "bg-green-500/10 border-green-500/20",
};

const issueLabels: Record<string, string> = {
  LIABILITY: "Liability",
  CAUSATION: "Causation",
  QUANTUM: "Quantum",
  EVIDENCE_COMPLETENESS: "Evidence",
  LIMITATION_RISK: "Limitation",
  HOUSING_STANDARD: "Housing Std",
  AWAAB_RISK: "Awaab's Law",
  PROCEDURAL_COMPLIANCE: "Procedure",
  DEADLINE_RISK: "Deadlines",
};

const StatusIcon = ({ status }: { status: HeatmapStatus }) => {
  switch (status) {
    case "RED":
      return <AlertCircle className="h-4 w-4" />;
    case "AMBER":
      return <Info className="h-4 w-4" />;
    case "GREEN":
      return <CheckCircle className="h-4 w-4" />;
  }
};

export function CaseHeatmapPanel({ heatmap }: CaseHeatmapPanelProps) {
  const { cells, overallScore, overallStatus } = heatmap;

  // Sort cells by score (lowest first for visibility)
  const sortedCells = [...cells].sort((a, b) => a.score - b.score);

  return (
    <Card
      title="Case Health"
      description="RAG assessment across key case dimensions."
      action={
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${statusColors[overallStatus]}`}
        >
          <Activity className="h-4 w-4" />
          {overallScore}%
        </div>
      }
    >
      {/* Overall Score Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Overall Case Health</span>
          <span className="font-medium text-foreground">{overallScore}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 transition-all duration-500 shadow-sm"
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Grid of Cells */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {sortedCells.map((cell) => (
          <CellCard key={cell.issue} cell={cell} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 border border-border/50">
          <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm" />
          <span className="text-muted-foreground font-medium">Good (70-100)</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 border border-border/50">
          <span className="h-2 w-2 rounded-full bg-warning shadow-sm" />
          <span className="text-muted-foreground font-medium">Attention (40-69)</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 border border-border/50">
          <span className="h-2 w-2 rounded-full bg-danger shadow-sm" />
          <span className="text-muted-foreground font-medium">Action Needed (0-39)</span>
        </div>
      </div>
    </Card>
  );
}

function CellCard({ cell }: { cell: CaseHeatmapCell }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine border and shadow colors based on status
  const getCardStyles = () => {
    switch (cell.status) {
      case "GREEN":
        return "border-green-400/50 shadow-green-900/30";
      case "AMBER":
        return "border-amber-400/50 shadow-amber-900/30";
      case "RED":
        return "border-red-500/60 shadow-red-900/40";
      default:
        return "border-border/70";
    }
  };
  
  return (
    <div
      className={`rounded-2xl bg-muted border ${getCardStyles()} shadow-md shadow-black/30 p-4 flex flex-col gap-1 transition-all hover:shadow-lg`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-muted-foreground">
          {issueLabels[cell.issue] ?? cell.issue}
        </span>
        <div className="flex items-center gap-1">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full ${statusColors[cell.status]}`}
          >
            <StatusIcon status={cell.status} />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title={isExpanded ? "Hide breakdown" : "Show breakdown"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
      </div>
      <div className="text-2xl font-semibold text-white">
        {cell.score}%
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {cell.reason}
      </p>
      {isExpanded && cell.breakdown && (
        <div className="mt-2 space-y-1 rounded-md bg-card/50 p-2 text-[9px] text-muted-foreground border border-border/50">
          <div className="font-semibold text-foreground mb-1">Key Factors:</div>
          {cell.breakdown.map((item, idx) => {
            // Check if this is a special breakdown line (raw score, floor, cap, final)
            const isSpecialLine = item.factor.includes("Raw score:") || 
                                 item.factor.includes("Score floor applied:") || 
                                 item.factor.includes("Score cap applied:") || 
                                 item.factor.includes("Final score:");
            
            return (
              <div key={idx} className={`flex items-start gap-1 ${isSpecialLine ? "border-t border-border/30 pt-1 mt-1" : ""}`}>
                <span className="text-muted-foreground">{isSpecialLine ? "→" : "•"}</span>
                <span className={`flex-1 ${isSpecialLine ? "font-medium text-foreground" : "text-muted-foreground"}`}>{item.factor}</span>
                {!isSpecialLine && item.impact !== 0 && (
                  <span className="font-medium text-muted-foreground">{item.impact > 0 ? "+" : ""}{item.impact}%</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Compact heatmap view for sidebars
 */
export function CaseHeatmapCompact({ heatmap }: CaseHeatmapPanelProps) {
  const { cells, overallScore, overallStatus } = heatmap;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent/60">Case Health</span>
        <div
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[overallStatus]}`}
        >
          <Activity className="h-3 w-3" />
          {overallScore}%
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {cells.map((cell) => (
          <div
            key={cell.issue}
            className={`rounded-md px-2 py-1 text-[10px] font-medium ${statusColors[cell.status]}`}
            title={`${issueLabels[cell.issue]}: ${cell.reason}`}
          >
            {issueLabels[cell.issue]?.slice(0, 3) ?? cell.issue.slice(0, 3)}
          </div>
        ))}
      </div>
    </div>
  );
}

