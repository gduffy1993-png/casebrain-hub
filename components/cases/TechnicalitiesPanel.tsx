"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type Technicality = {
  technicality: string;
  status: "NOT_APPLICABLE" | "EXPLOITABLE" | "CHECK_REQUIRED";
  description: string;
  howToExploit: string | null;
  authority: string | null;
};

type Technicalities = {
  technicalities: Technicality[];
  exploitable: Technicality[];
  readyToUseArguments: string[];
};

type TechnicalitiesPanelProps = {
  caseId: string;
};

export function TechnicalitiesPanel({ caseId }: TechnicalitiesPanelProps) {
  const [technicalities, setTechnicalities] = useState<Technicalities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTechnicalities() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/technicalities`);
        if (!response.ok) {
          throw new Error("Failed to fetch technicalities");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<Technicalities>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate technicalities.");
          setTechnicalities(null);
          return;
        }

        setTechnicalities(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch technicalities:", err);
        setError("Technicalities not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchTechnicalities();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Hunting for technicalities…</span>
        </div>
      </Card>
    );
  }

  if (error || !technicalities) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Technicalities not available yet."}
        </p>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    if (status === "EXPLOITABLE") return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (status === "CHECK_REQUIRED") return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    return <XCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "EXPLOITABLE") return "bg-green-500/20 border-green-500/30 text-green-400";
    if (status === "CHECK_REQUIRED") return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400";
    return "bg-muted border-border text-muted-foreground";
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Technicality Hunter</h2>
        {technicalities.exploitable.length > 0 && (
          <Badge variant="success" className="ml-auto">
            {technicalities.exploitable.length} exploitable
          </Badge>
        )}
      </div>

      {/* Exploitable Technicalities */}
      {technicalities.exploitable.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            Exploitable Technicalities (Use These)
          </h3>
          <div className="space-y-2">
            {technicalities.exploitable.map((tech, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border bg-green-500/10 border-green-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tech.status)}
                    <span className="font-semibold">{tech.technicality}</span>
                  </div>
                </div>
                <p className="text-sm mb-2">{tech.description}</p>
                {tech.howToExploit && (
                  <div className="text-sm mb-2">
                    <span className="font-medium">How to exploit: </span>
                    {tech.howToExploit}
                  </div>
                )}
                {tech.authority && (
                  <div className="text-xs font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                    {tech.authority}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Technicalities */}
      <div>
        <h3 className="text-sm font-semibold mb-2">All Technicalities</h3>
        <div className="space-y-2">
          {technicalities.technicalities.map((tech, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${getStatusColor(tech.status)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(tech.status)}
                  <span className="font-medium text-sm">{tech.technicality}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tech.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs mb-1">{tech.description}</p>
              {tech.howToExploit && (
                <p className="text-xs font-medium">Exploit: {tech.howToExploit}</p>
              )}
              {tech.authority && (
                <code className="text-xs bg-background/50 px-2 py-1 rounded mt-1 inline-block">
                  {tech.authority}
                </code>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ready-to-Use Arguments */}
      {technicalities.readyToUseArguments.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 border border-border rounded">
          <h3 className="text-sm font-semibold mb-2">Ready-to-Use Arguments</h3>
          <div className="space-y-1">
            {technicalities.readyToUseArguments.map((arg, idx) => (
              <div key={idx} className="text-sm">{arg}</div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
