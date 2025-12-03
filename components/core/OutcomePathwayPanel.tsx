"use client";

import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  CheckCircle,
  Circle,
  BarChart3,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OutcomePathway } from "@/lib/types/casebrain";

type OutcomePathwayPanelProps = {
  pathway: OutcomePathway;
};

const costBandLabels = {
  LOW: "£500 - £5,000",
  MEDIUM: "£5,000 - £15,000",
  HIGH: "£15,000 - £50,000",
  VERY_HIGH: "£50,000+",
};

const confidenceColors = {
  LOW: "text-warning",
  MEDIUM: "text-primary",
  HIGH: "text-success",
};

export function OutcomePathwayPanel({ pathway }: OutcomePathwayPanelProps) {
  const completedSteps = pathway.expectedSteps.filter(s => s.isCompleted).length;
  const totalSteps = pathway.expectedSteps.length;
  const progressPercent = (completedSteps / totalSteps) * 100;

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-secondary" />
          Outcome Pathway
        </div>
      }
      description="Typical case progression and estimates"
    >
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Clock className="h-3.5 w-3.5" />
            Time to Resolution
          </div>
          <p className="mt-1 text-lg font-bold text-accent">
            {pathway.estimatedTimeToResolution}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/5 border border-secondary/10 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary">
            <DollarSign className="h-3.5 w-3.5" />
            Cost Band
          </div>
          <p className="mt-1 text-lg font-bold text-accent">
            {pathway.estimatedCostBand}
          </p>
          <p className="text-[10px] text-accent-muted">
            {costBandLabels[pathway.estimatedCostBand]}
          </p>
        </div>

        <div className="rounded-xl bg-accent/5 border border-accent/10 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-accent-soft">
            <BarChart3 className="h-3.5 w-3.5" />
            Confidence
          </div>
          <p className={`mt-1 text-lg font-bold ${confidenceColors[pathway.confidence]}`}>
            {pathway.confidence}
          </p>
          <p className="text-[10px] text-accent-muted">
            Based on {pathway.similarCasesCount} similar cases
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-accent-soft mb-2">
          <span>Progress: {completedSteps} of {totalSteps} milestones</span>
          <span className="font-semibold text-accent">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-accent-muted">
          Expected Milestones
        </h4>
        <ul className="space-y-2">
          {pathway.expectedSteps.map((step, index) => (
            <li 
              key={index}
              className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                step.isCompleted 
                  ? "bg-success/5" 
                  : index === completedSteps 
                    ? "bg-primary/5 border border-primary/20" 
                    : ""
              }`}
            >
              {step.isCompleted ? (
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
              ) : index === completedSteps ? (
                <div className="relative">
                  <Circle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/50" />
                </div>
              ) : (
                <Circle className="h-4 w-4 text-accent-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${
                  step.isCompleted 
                    ? "text-success line-through opacity-70" 
                    : index === completedSteps 
                      ? "text-primary font-medium" 
                      : "text-accent-soft"
                }`}>
                  {step.step}
                </p>
              </div>
              <span className="text-[10px] text-accent-muted flex-shrink-0">
                {step.typicalTimeframe}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning/5 border border-warning/10 p-3">
        <Info className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-accent-muted">
          These are typical timelines based on similar cases. Actual outcomes vary.
          This is not legal advice or a guarantee of results.
        </p>
      </div>
    </Card>
  );
}

