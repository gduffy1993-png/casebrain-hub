"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

type DisclosureTrackerProps = {
  caseId: string;
};

type DisclosureData = {
  initialDisclosureReceived: boolean;
  initialDisclosureDate: string | null;
  fullDisclosureReceived: boolean;
  fullDisclosureDate: string | null;
  missingItems: string[];
  disclosureRequested: boolean;
  disclosureRequestDate: string | null;
  disclosureDeadline: string | null;
  lateDisclosure: boolean;
  incompleteDisclosure: boolean;
  disclosureIssues: string[];
};

export function DisclosureTracker({ caseId }: DisclosureTrackerProps) {
  const [disclosure, setDisclosure] = useState<DisclosureData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDisclosure() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/disclosure`);
        if (res.ok) {
          const result = await res.json();
          setDisclosure(result);
        }
      } catch (error) {
        console.error("Failed to fetch disclosure:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDisclosure();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Disclosure Tracker" description="Loading disclosure status..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  if (!disclosure) {
    return (
      <Card title="Disclosure Tracker" description="Disclosure information unavailable">
        <div className="text-center py-4 text-muted-foreground text-sm">
          No disclosure data available
        </div>
      </Card>
    );
  }

  const hasIssues = disclosure.lateDisclosure || disclosure.incompleteDisclosure || disclosure.missingItems.length > 0;

  return (
    <Card
      title="Disclosure Tracker"
      description="Track prosecution disclosure and identify missing items"
    >
      <div className="space-y-4">
        {/* Disclosure Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded bg-muted/30">
            <span className="text-sm text-foreground">Initial Disclosure</span>
            {disclosure.initialDisclosureReceived ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                {disclosure.initialDisclosureDate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(disclosure.initialDisclosureDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-muted/30">
            <span className="text-sm text-foreground">Full Disclosure</span>
            {disclosure.fullDisclosureReceived ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                {disclosure.fullDisclosureDate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(disclosure.fullDisclosureDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>

        {/* Missing Items */}
        {disclosure.missingItems.length > 0 && (
          <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">Missing Items</span>
            </div>
            <ul className="space-y-1 text-xs text-amber-300">
              {disclosure.missingItems.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {hasIssues && (
          <div className="p-3 rounded-lg border border-red-500/50 bg-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Disclosure Issues</span>
            </div>
            <ul className="space-y-1 text-xs text-red-300">
              {disclosure.lateDisclosure && <li>• Late disclosure</li>}
              {disclosure.incompleteDisclosure && <li>• Incomplete disclosure</li>}
              {disclosure.disclosureIssues.map((issue, i) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Deadline */}
        {disclosure.disclosureDeadline && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Disclosure Deadline</span>
            </div>
            <span className="text-sm font-medium">
              {new Date(disclosure.disclosureDeadline).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Request Button */}
        {!disclosure.disclosureRequested && (
          <Button variant="outline" className="w-full">
            Request Full Disclosure
          </Button>
        )}
      </div>
    </Card>
  );
}

