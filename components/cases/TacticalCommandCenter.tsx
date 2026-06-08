"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, ArrowRight, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type Move = {
  action: string;
  timeline: "TODAY" | "THIS_WEEK" | "NEXT_WEEK" | "THIS_MONTH";
  readyToUse: string;
  who: "SOLICITOR" | "BARRISTER" | "CLIENT" | "TEAM";
  dependencies?: string[];
};

type TacticalCommand = {
  theAngle: {
    strategy: string;
    whyThisWins: string;
    winProbability: number;
    keyEvidence: string[];
    authority: string[];
    evidenceStrengthWarning?: string;
    realisticOutcome?: string;
  };
  theMove: {
    immediateAction: Move;
    nextSteps: Move[];
    combinedReadyToUse: string;
  };
  theBackup: {
    angle: string;
    whyBackupWorks: string;
    backupMove: Move;
    whenToSwitch: string[];
    winProbability: number;
  };
};

type TacticalCommandCenterProps = {
  caseId: string;
};

export function TacticalCommandCenter({ caseId }: TacticalCommandCenterProps) {
  const [command, setCommand] = useState<TacticalCommand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommand() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/tactical-command`);
        if (!response.ok) {
          throw new Error("Failed to fetch tactical command");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<TacticalCommand>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate tactical command.");
          setCommand(null);
          return;
        }

        setCommand(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch tactical command:", err);
        setError("Tactical command not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchCommand();
  }, [caseId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getTimelineColor = (timeline: string) => {
    if (timeline === "TODAY") return "bg-red-500/20 border-red-500/50 text-red-400";
    if (timeline === "THIS_WEEK") return "bg-orange-500/20 border-orange-500/50 text-orange-400";
    if (timeline === "NEXT_WEEK") return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
    return "bg-blue-500/20 border-blue-500/50 text-blue-400";
  };

  const getWhoColor = (who: string) => {
    if (who === "SOLICITOR") return "text-primary";
    if (who === "BARRISTER") return "text-blue-400";
    if (who === "CLIENT") return "text-green-400";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating tactical command…</span>
        </div>
      </Card>
    );
  }

  if (error || !command) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Tactical command not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Tactical Command Center</h2>
      </div>

      <div className="space-y-6">
        {/* THE ANGLE */}
        <div className="p-5 rounded-lg border-2 border-primary/30 bg-primary/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              THE ANGLE
            </h3>
            <Badge variant={command.theAngle.winProbability >= 70 ? "success" : command.theAngle.winProbability >= 40 ? "warning" : "danger"}>
              {command.theAngle.winProbability}% Win
            </Badge>
          </div>
          <p className="text-lg font-semibold mb-2">{command.theAngle.strategy}</p>
          <p className="text-sm text-muted-foreground mb-3">{command.theAngle.whyThisWins}</p>
          {command.theAngle.evidenceStrengthWarning && (
            <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span className="text-xs font-medium">Professional Judgment Warning</span>
              </div>
              <p className="text-xs">{command.theAngle.evidenceStrengthWarning}</p>
            </div>
          )}
          {command.theAngle.realisticOutcome && (
            <div className="mb-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
              <span className="text-xs font-medium">Realistic Outcome: </span>
              <span className="text-xs">{command.theAngle.realisticOutcome}</span>
            </div>
          )}
          {command.theAngle.keyEvidence.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium">Key Evidence: </span>
              <span className="text-xs">{command.theAngle.keyEvidence.join(", ")}</span>
            </div>
          )}
          {command.theAngle.authority.length > 0 && (
            <div>
              <span className="text-xs font-medium">Authority: </span>
              <span className="text-xs font-mono">{command.theAngle.authority.join(", ")}</span>
            </div>
          )}
        </div>

        {/* THE MOVE */}
        <div className="p-5 rounded-lg border-2 border-green-500/30 bg-green-500/10">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <ArrowRight className="h-5 w-5 text-green-400" />
            THE MOVE
          </h3>

          {/* Immediate Action */}
          <div className={`p-4 rounded-lg border mb-3 ${getTimelineColor(command.theMove.immediateAction.timeline)}`}>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="danger">IMMEDIATE</Badge>
              <Badge variant="secondary" className={getWhoColor(command.theMove.immediateAction.who)}>
                {command.theMove.immediateAction.who}
              </Badge>
            </div>
            <p className="font-semibold mb-2">{command.theMove.immediateAction.action}</p>
            <div className="text-xs bg-background/50 p-2 rounded border border-border">
              <pre className="whitespace-pre-wrap">{command.theMove.immediateAction.readyToUse}</pre>
            </div>
          </div>

          {/* Next Steps */}
          {command.theMove.nextSteps.map((step, idx) => (
            <div key={idx} className={`p-4 rounded-lg border mb-3 ${getTimelineColor(step.timeline)}`}>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">{step.timeline.replace("_", " ")}</Badge>
                <Badge variant="secondary" className={getWhoColor(step.who)}>
                  {step.who}
                </Badge>
              </div>
              <p className="font-semibold mb-2">{step.action}</p>
              <div className="text-xs bg-background/50 p-2 rounded border border-border">
                <pre className="whitespace-pre-wrap">{step.readyToUse}</pre>
              </div>
            </div>
          ))}

          {/* Combined Ready-to-Use */}
          <div className="mt-4 p-3 bg-background/50 border border-border rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Combined Action Plan</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(command.theMove.combinedReadyToUse, "move")}
              >
                {copied === "move" ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <pre className="text-xs whitespace-pre-wrap">{command.theMove.combinedReadyToUse}</pre>
          </div>
        </div>

        {/* THE BACKUP */}
        <div className="p-5 rounded-lg border-2 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              THE BACKUP
            </h3>
            <Badge variant={command.theBackup.winProbability >= 70 ? "success" : command.theBackup.winProbability >= 40 ? "warning" : "danger"}>
              {command.theBackup.winProbability}% Win
            </Badge>
          </div>
          <p className="font-semibold mb-2">{command.theBackup.angle}</p>
          <p className="text-sm text-muted-foreground mb-3">{command.theBackup.whyBackupWorks}</p>

          {/* Backup Move */}
          <div className={`p-4 rounded-lg border mb-3 ${getTimelineColor(command.theBackup.backupMove.timeline)}`}>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="warning">BACKUP MOVE</Badge>
              <Badge variant="secondary" className={getWhoColor(command.theBackup.backupMove.who)}>
                {command.theBackup.backupMove.who}
              </Badge>
            </div>
            <p className="font-semibold mb-2">{command.theBackup.backupMove.action}</p>
            <div className="text-xs bg-background/50 p-2 rounded border border-border">
              <pre className="whitespace-pre-wrap">{command.theBackup.backupMove.readyToUse}</pre>
            </div>
          </div>

          {/* When to Switch */}
          <div className="mt-3">
            <span className="text-xs font-semibold">When to Switch:</span>
            <ul className="mt-1 space-y-1">
              {command.theBackup.whenToSwitch.map((condition, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
