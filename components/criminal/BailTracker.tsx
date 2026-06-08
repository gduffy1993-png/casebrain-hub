"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Calendar } from "lucide-react";

type BailTrackerProps = {
  caseId: string;
};

type BailData = {
  bailStatus: "bailed" | "remanded" | "police_bail" | null;
  bailConditions: string[];
  nextBailReview: string | null;
  remandTimeHours: number | null;
  bailReturnDate: string | null;
  bailOutcome: string | null;
};

export function BailTracker({ caseId }: BailTrackerProps) {
  const [bail, setBail] = useState<BailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBail() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/bail`);
        if (res.ok) {
          const result = await res.json();
          setBail(result);
        }
      } catch (error) {
        console.error("Failed to fetch bail:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBail();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Bail & Custody" description="Loading bail status..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  if (!bail) {
    return (
      <Card title="Bail & Custody" description="Bail information unavailable">
        <div className="text-center py-4 text-muted-foreground text-sm">
          No bail data available
        </div>
      </Card>
    );
  }

  const getBailStatusColor = (status: string | null) => {
    switch (status) {
      case "bailed":
        return "text-green-400";
      case "remanded":
        return "text-red-400";
      case "police_bail":
        return "text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getBailStatusBadge = (status: string | null) => {
    switch (status) {
      case "bailed":
        return "success";
      case "remanded":
        return "danger";
      case "police_bail":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>Bail & Custody</span>
        </div>
      }
      description="Bail status and conditions"
    >
      <div className="space-y-4">
        {/* Bail Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Bail Status</span>
          </div>
          {bail.bailStatus ? (
            <Badge variant={getBailStatusBadge(bail.bailStatus)}>
              {bail.bailStatus.toUpperCase()}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not recorded</span>
          )}
        </div>

        {/* Bail Conditions */}
        {bail.bailConditions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Conditions</h4>
            <div className="space-y-1">
              {bail.bailConditions.map((condition, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {condition}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 text-xs text-primary hover:underline"
              onClick={() => {
                const text = "Bail conditions:\n\n" + bail.bailConditions.map((c, i) => `${i + 1}. ${c}`).join("\n");
                void navigator.clipboard.writeText(text);
              }}
            >
              Copy conditions for client
            </button>
          </div>
        )}

        {/* Next Review */}
        {bail.nextBailReview && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Next Bail Review</span>
            </div>
            <span className="text-sm font-medium">
              {new Date(bail.nextBailReview).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Return date & outcome (station bail return) */}
        {(bail.bailReturnDate != null || bail.bailOutcome != null) && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-sm font-semibold text-foreground">Return / outcome</h4>
            {bail.bailReturnDate && (
              <p className="text-xs text-muted-foreground">
                Return date: {new Date(bail.bailReturnDate).toLocaleDateString()}
              </p>
            )}
            {bail.bailOutcome && (
              <p className="text-xs text-muted-foreground">
                Outcome: {String(bail.bailOutcome).replace(/_/g, " ")}
                {bail.bailOutcome === "charged" && (
                  <span className="block mt-1 text-primary">Go to Strategy tab to run the case.</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Remand Time */}
        {bail.remandTimeHours !== null && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <span className="text-sm text-foreground">Remand Time</span>
            <span className="text-sm font-medium">{bail.remandTimeHours} hours</span>
          </div>
        )}
      </div>
    </Card>
  );
}

