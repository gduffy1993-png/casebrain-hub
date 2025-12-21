"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, AlertTriangle, Copy, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type ClientCommunication = {
  whatToTell: {
    summary: string;
    keyPoints: string[];
    expectations: string[];
    timeline: string;
  };
  whatNotToSay: string[];
  readyToUseUpdate: string;
  clientFriendlyAngle: string;
  riskAssessment: {
    level: "LOW" | "MEDIUM" | "HIGH";
    explanation: string;
  };
};

type ClientCommunicationPanelProps = {
  caseId: string;
};

export function ClientCommunicationPanel({ caseId }: ClientCommunicationPanelProps) {
  const [communication, setCommunication] = useState<ClientCommunication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchCommunication() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/client-communication`);
        if (!response.ok) {
          throw new Error("Failed to fetch client communication");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<ClientCommunication>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate client communication.");
          setCommunication(null);
          return;
        }

        setCommunication(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch client communication:", err);
        setError("Client communication not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchCommunication();
  }, [caseId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskColor = (level: string) => {
    if (level === "LOW") return "text-green-400";
    if (level === "MEDIUM") return "text-yellow-400";
    return "text-red-400";
  };

  const getRiskBadge = (level: string) => {
    if (level === "LOW") return "success";
    if (level === "MEDIUM") return "warning";
    return "danger";
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating client communication…</span>
        </div>
      </Card>
    );
  }

  if (error || !communication) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Client communication not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-purple-500/20">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-purple-400" />
        <h2 className="text-xl font-bold">Client Communication Generator</h2>
        <Badge variant={getRiskBadge(communication.riskAssessment.level)} className="ml-auto">
          {communication.riskAssessment.level} Risk
        </Badge>
      </div>

      <div className="space-y-4">
        {/* What to Tell */}
        <div className="p-4 rounded-lg border-2 border-green-500/30 bg-green-500/10">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-400" />
            What to Tell Client
          </h3>
          <p className="text-sm mb-3 font-medium">{communication.whatToTell.summary}</p>
          <div className="mb-3">
            <span className="text-xs font-medium">Key Points:</span>
            <ul className="mt-1 space-y-1">
              {communication.whatToTell.keyPoints.map((point, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-3">
            <span className="text-xs font-medium">Expectations:</span>
            <ul className="mt-1 space-y-1">
              {communication.whatToTell.expectations.map((exp, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>{exp}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-medium">Timeline:</span>
            <p className="text-xs mt-1">{communication.whatToTell.timeline}</p>
          </div>
        </div>

        {/* What NOT to Say */}
        <div className="p-4 rounded-lg border-2 border-red-500/30 bg-red-500/10">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            What NOT to Say
          </h3>
          <ul className="space-y-1">
            {communication.whatNotToSay.map((item, idx) => (
              <li key={idx} className="text-xs flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Assessment */}
        <div className="p-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Risk Assessment
            </h3>
            <Badge variant={getRiskBadge(communication.riskAssessment.level)}>
              {communication.riskAssessment.level}
            </Badge>
          </div>
          <p className="text-xs">{communication.riskAssessment.explanation}</p>
        </div>

        {/* Ready-to-Use Update */}
        <div className="p-4 bg-muted/50 border border-border rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Ready-to-Use Client Update</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(communication.readyToUseUpdate)}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Update
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-y-auto bg-background/50 p-3 rounded border border-border">
            {communication.readyToUseUpdate}
          </pre>
        </div>
      </div>
    </Card>
  );
}
