"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MousePointerClick, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type ProsecutionTrap = {
  trap: string;
  question: string;
  expectedAnswer: string;
  trapQuestion: string;
  result: string;
  readyToUse: string;
};

type ProsecutionTraps = {
  traps: ProsecutionTrap[];
  topTraps: ProsecutionTrap[];
};

type ProsecutionTrapsPanelProps = {
  caseId: string;
};

export function ProsecutionTrapsPanel({ caseId }: ProsecutionTrapsPanelProps) {
  const [traps, setTraps] = useState<ProsecutionTraps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTraps() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/prosecution-traps`);
        if (!response.ok) {
          throw new Error("Failed to fetch prosecution traps");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<ProsecutionTraps>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate traps.");
          setTraps(null);
          return;
        }

        setTraps(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch prosecution traps:", err);
        setError("Prosecution traps not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchTraps();
  }, [caseId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Setting prosecution traps…</span>
        </div>
      </Card>
    );
  }

  if (error || !traps) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Prosecution traps not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MousePointerClick className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Prosecution Trap Setter</h2>
        {traps.topTraps.length > 0 && (
          <Badge variant="warning" className="ml-auto">
            {traps.topTraps.length} top traps
          </Badge>
        )}
      </div>

      {traps.traps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MousePointerClick className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No traps identified yet</p>
          <p className="text-xs mt-1">Upload case documents to begin analysis</p>
        </div>
      ) : (
        <>
          {/* Top Traps */}
          {traps.topTraps.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Top Traps (Use These First)</h3>
              <div className="space-y-3">
                {traps.topTraps.map((trap, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{trap.trap}</h4>
                      <Badge variant="warning">TRAP</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Question: </span>
                        <span className="text-primary">"{trap.question}"</span>
                      </div>
                      <div>
                        <span className="font-medium">Expected Answer: </span>
                        <span className="text-green-400">"{trap.expectedAnswer}"</span>
                      </div>
                      <div>
                        <span className="font-medium">Trap Question: </span>
                        <span className="text-red-400">"{trap.trapQuestion}"</span>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <span className="font-medium">Result: </span>
                        <span className="text-green-400">{trap.result}</span>
                      </div>
                      <div className="p-2 bg-background/50 border border-border rounded">
                        <span className="font-medium">Ready-to-Use: </span>
                        <span className="text-xs">{trap.readyToUse}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(trap.readyToUse, `trap-${idx}`)}
                      >
                        {copied === `trap-${idx}` ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Trap
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Traps */}
          {traps.traps.length > traps.topTraps.length && (
            <div>
              <h3 className="text-sm font-semibold mb-2">All Traps</h3>
              <div className="space-y-2">
                {traps.traps
                  .filter((t) => !traps.topTraps.includes(t))
                  .map((trap, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/30 border-border">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{trap.trap}</h4>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="font-medium">Q: </span>
                          {trap.question}
                        </div>
                        <div>
                          <span className="font-medium">Trap: </span>
                          {trap.trapQuestion}
                        </div>
                        <div className="text-muted-foreground">{trap.result}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
