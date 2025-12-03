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
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-accent/60">
          <span>Overall Case Health</span>
          <span className="font-medium">{overallScore}%</span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-accent/10">
          <div
            className={`h-full transition-all duration-500 ${
              overallStatus === "GREEN"
                ? "bg-green-500"
                : overallStatus === "AMBER"
                  ? "bg-warning"
                  : "bg-danger"
            }`}
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
      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-accent/50">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Good (70-100)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span>Attention (40-69)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-danger" />
          <span>Action Needed (0-39)</span>
        </div>
      </div>
    </Card>
  );
}

function CellCard({ cell }: { cell: CaseHeatmapCell }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div
      className={`rounded-xl border p-3 transition-all hover:shadow-sm ${statusBgColors[cell.status]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent/70">
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
            className="text-[10px] text-accent/40 hover:text-accent/70"
            title={isExpanded ? "Hide breakdown" : "Show breakdown"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
      </div>
      <div className="mt-2">
        <div className="text-lg font-bold">{cell.score}%</div>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-accent/50">
          {cell.reason}
        </p>
        {isExpanded && cell.breakdown && (
          <div className="mt-2 space-y-1 rounded-md bg-accent/5 p-2 text-[9px] text-accent/60">
            <div className="font-semibold text-accent/70">Key Factors:</div>
            {cell.breakdown.map((item, idx) => {
              // Check if this is a special breakdown line (raw score, floor, cap, final)
              const isSpecialLine = item.factor.includes("Raw score:") || 
                                   item.factor.includes("Score floor applied:") || 
                                   item.factor.includes("Score cap applied:") || 
                                   item.factor.includes("Final score:");
              
              return (
                <div key={idx} className={`flex items-start gap-1 ${isSpecialLine ? "border-t border-accent/10 pt-1 mt-1" : ""}`}>
                  <span className="text-accent/40">{isSpecialLine ? "→" : "•"}</span>
                  <span className={`flex-1 ${isSpecialLine ? "font-medium text-accent/80" : ""}`}>{item.factor}</span>
                  {!isSpecialLine && item.impact !== 0 && (
                    <span className="font-medium text-accent/50">{item.impact > 0 ? "+" : ""}{item.impact}%</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
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

