"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Copy, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type NextMove = {
  rightNow: {
    action: string;
    readyToUse: string;
    who: string;
    deadline?: string;
  };
  thisWeek: {
    action: string;
    readyToUse: string;
    who: string;
    dependencies: string[];
  };
  thisMonth: {
    action: string;
    readyToUse: string;
    who: string;
    dependencies: string[];
  };
  dependencies: string[];
  combinedActionPlan: string;
};

type NextMovePanelProps = {
  caseId: string;
};

export function NextMovePanel({ caseId }: NextMovePanelProps) {
  const [nextMove, setNextMove] = useState<NextMove | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchNextMove() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/next-move`);
        if (!response.ok) {
          throw new Error("Failed to fetch next move");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<NextMove>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate next move.");
          setNextMove(null);
          return;
        }

        setNextMove(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch next move:", err);
        setError("Next move not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchNextMove();
  }, [caseId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Determining next move…</span>
        </div>
      </Card>
    );
  }

  if (error || !nextMove) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Next move not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-green-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Play className="h-5 w-5 text-green-400" />
        <h2 className="text-xl font-bold">Next Move Generator</h2>
        <Badge variant="success" className="ml-auto">ACTION FOCUSED</Badge>
      </div>

      <div className="space-y-4">
        {/* RIGHT NOW */}
        <div className="p-4 rounded-lg border-2 border-red-500/30 bg-red-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-400" />
              <span className="font-bold">RIGHT NOW</span>
            </div>
            <Badge variant="danger">{nextMove.rightNow.deadline || "TODAY"}</Badge>
          </div>
          <p className="font-semibold mb-2">{nextMove.rightNow.action}</p>
          <div className="text-xs mb-2">
            <span className="font-medium">Who: </span>
            <span className="text-primary">{nextMove.rightNow.who}</span>
          </div>
          <div className="p-2 bg-background/50 border border-border rounded">
            <pre className="text-xs whitespace-pre-wrap">{nextMove.rightNow.readyToUse}</pre>
          </div>
        </div>

        {/* THIS WEEK */}
        <div className="p-4 rounded-lg border-2 border-orange-500/30 bg-orange-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="font-bold">THIS WEEK</span>
            </div>
            <Badge variant="warning">7 DAYS</Badge>
          </div>
          <p className="font-semibold mb-2">{nextMove.thisWeek.action}</p>
          <div className="text-xs mb-2">
            <span className="font-medium">Who: </span>
            <span className="text-blue-400">{nextMove.thisWeek.who}</span>
          </div>
          {nextMove.thisWeek.dependencies.length > 0 && (
            <div className="text-xs mb-2">
              <span className="font-medium">Dependencies: </span>
              <span>{nextMove.thisWeek.dependencies.join(", ")}</span>
            </div>
          )}
          <div className="p-2 bg-background/50 border border-border rounded">
            <pre className="text-xs whitespace-pre-wrap">{nextMove.thisWeek.readyToUse}</pre>
          </div>
        </div>

        {/* THIS MONTH */}
        <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="font-bold">THIS MONTH</span>
            </div>
            <Badge variant="secondary">30 DAYS</Badge>
          </div>
          <p className="font-semibold mb-2">{nextMove.thisMonth.action}</p>
          <div className="text-xs mb-2">
            <span className="font-medium">Who: </span>
            <span className="text-green-400">{nextMove.thisMonth.who}</span>
          </div>
          {nextMove.thisMonth.dependencies.length > 0 && (
            <div className="text-xs mb-2">
              <span className="font-medium">Dependencies: </span>
              <span>{nextMove.thisMonth.dependencies.join(", ")}</span>
            </div>
          )}
          <div className="p-2 bg-background/50 border border-border rounded">
            <pre className="text-xs whitespace-pre-wrap">{nextMove.thisMonth.readyToUse}</pre>
          </div>
        </div>

        {/* Combined Action Plan */}
        <div className="p-4 bg-muted/50 border border-border rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Combined Action Plan</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(nextMove.combinedActionPlan)}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Plan
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs whitespace-pre-wrap">{nextMove.combinedActionPlan}</pre>
        </div>
      </div>
    </Card>
  );
}
