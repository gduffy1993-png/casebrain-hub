"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type ClientAdvicePanelProps = {
  caseId: string;
};

type ClientAdvice = {
  doActions: string[];
  dontActions: string[];
  risks: string[];
  overallAdvice: string;
};

export function ClientAdvicePanel({ caseId }: ClientAdvicePanelProps) {
  const [advice, setAdvice] = useState<ClientAdvice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdvice() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/client-advice`);
        if (res.ok) {
          const result = await res.json();
          setAdvice(result);
        }
      } catch (error) {
        console.error("Failed to fetch client advice:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAdvice();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Client Advice" description="Generating advice..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  if (!advice) {
    return (
      <Card title="Client Advice" description="Client advice unavailable">
        <div className="text-center py-4 text-muted-foreground text-sm">
          No advice available
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>Client Advice</span>
        </div>
      }
      description="What the client should and shouldn't do"
    >
      <div className="space-y-4">
        {/* Overall Advice */}
        {advice.overallAdvice && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/50">
            <p className="text-sm text-foreground">{advice.overallAdvice}</p>
          </div>
        )}

        {/* DO Actions */}
        {advice.doActions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <h4 className="text-sm font-semibold text-foreground">DO</h4>
            </div>
            <ul className="space-y-1">
              {advice.doActions.map((action, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* DON'T Actions */}
        {advice.dontActions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <h4 className="text-sm font-semibold text-foreground">DON'T</h4>
            </div>
            <ul className="space-y-1">
              {advice.dontActions.map((action, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {advice.risks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-foreground">Risks</h4>
            </div>
            <ul className="space-y-1">
              {advice.risks.map((risk, i) => (
                <li key={i} className="text-xs text-amber-300 flex items-start gap-2">
                  <span className="mt-1">⚠</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

