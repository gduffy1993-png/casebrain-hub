"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Circle, Clock } from "lucide-react";

type TimelineStage = {
  stage: string;
  stageNumber: number;
  totalStages: number;
  title: string;
  description: string;
  estimatedDuration: string;
  whatHappens: string[];
  whatYouNeedToDo: string[];
  typicalTimeline: string;
};

type ClientTimelinePanelProps = {
  caseId: string;
  currentStage?: string;
};

export function ClientTimelinePanel({ caseId, currentStage }: ClientTimelinePanelProps) {
  const [timeline, setTimeline] = useState<TimelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        setLoading(true);
        const response = await fetch(`/api/client-expectations/${caseId}/timeline`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch timeline");
        }
        
        const data = await response.json();
        setTimeline(data.timeline || []);
      } catch (error) {
        console.error("Failed to fetch timeline:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTimeline();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading timeline…</span>
        </div>
      </Card>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No timeline data available.</p>
      </Card>
    );
  }

  const currentStageNumber = currentStage
    ? timeline.findIndex(s => s.stage === currentStage) + 1
    : 1;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-foreground" />
        <h3 className="text-lg font-semibold text-foreground">What to Expect</h3>
      </div>

      <div className="space-y-4">
        {timeline.map((stage, idx) => {
          const isCurrent = stage.stageNumber === currentStageNumber;
          const isCompleted = stage.stageNumber < currentStageNumber;
          const isUpcoming = stage.stageNumber > currentStageNumber;

          return (
            <div
              key={stage.stage}
              className={`p-4 rounded-lg border ${
                isCurrent
                  ? "bg-cyan-950/30 border-cyan-800/50"
                  : isCompleted
                  ? "bg-green-950/20 border-green-800/30"
                  : "bg-muted/30 border-border/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : isCurrent ? (
                    <Circle className="h-5 w-5 text-cyan-400 fill-cyan-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        Stage {stage.stageNumber}: {stage.title}
                      </h4>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stage.description}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {stage.estimatedDuration}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">What Happens:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {stage.whatHappens.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">What You Need to Do:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {stage.whatYouNeedToDo.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2 italic">
                {stage.typicalTimeline}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

