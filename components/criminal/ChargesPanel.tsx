"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Charge = {
  id: string;
  offence: string;
  section: string | null;
  chargeDate: string | null;
  location: string | null;
  value: number | null;
  details: string | null;
  status: string;
};

type ChargesPanelProps = {
  caseId: string;
};

export function ChargesPanel({ caseId }: ChargesPanelProps) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [detectedCharges, setDetectedCharges] = useState<string[]>([]);

  useEffect(() => {
    async function fetchCharges() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/charges`);
        if (res.ok) {
          const result = await res.json();
          // Handle ApiResponse format: { ok: true, data: { charges: [...] } }
          // or legacy format: { charges: [...] }
          const chargesData: Charge[] = result.data?.charges || result.charges || [];

          // Dedupe by offence + section, prefer first (assume highest confidence order)
          const dedupedMap = new Map<string, Charge>();
          chargesData.forEach((c) => {
            const key = `${c.offence || ""}:${c.section || ""}`.toLowerCase().trim();
            if (!dedupedMap.has(key)) {
              dedupedMap.set(key, c);
            }
          });

          // Clean location junk text
          const cleaned = Array.from(dedupedMap.values()).map((c) => {
            const loc = c.location || "";
            const cleanedLocation = loc.includes("precision") && loc.toLowerCase().includes("not disclosed")
              ? "Not disclosed"
              : loc.replace(/precision\)\.?\s*Not disclosed/i, "Not disclosed");
            return { ...c, location: cleanedLocation };
          });

          setCharges(cleaned);
        }
      } catch (error) {
        console.error("Failed to fetch charges:", error);
      } finally {
        setLoading(false);
      }
    }
    
    async function checkDetectedCharges() {
      // Check key facts for detected charges in primaryIssues or causeOfAction
      try {
        const res = await fetch(`/api/cases/${caseId}/key-facts`);
        if (res.ok) {
          const result = await res.json();
          const keyFacts = result.data?.keyFacts || result.keyFacts;
          if (keyFacts) {
            const detected: string[] = [];
            // Check primaryIssues for charge mentions
            if (keyFacts.primaryIssues) {
              keyFacts.primaryIssues.forEach((issue: string) => {
                if (issue.includes("Charge:") || issue.includes("Offence:")) {
                  detected.push(issue);
                }
              });
            }
            // Check causeOfAction
            if (keyFacts.causeOfAction) {
              detected.push(keyFacts.causeOfAction);
            }
            setDetectedCharges(detected);
          }
        }
      } catch {
        // Silently fail - detection check is optional
      }
    }
    
    fetchCharges();
    checkDetectedCharges();
  }, [caseId]);

  if (loading) {
    return (
      <Card title="Charges" description="Loading charges..." className="animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>Charges & Offences</span>
          {charges.length > 0 && <Badge variant="secondary">{charges.length}</Badge>}
        </div>
      }
      description="Criminal charges and offences"
      action={
        <Button variant="outline" size="sm">
          <Plus className="h-3 w-3 mr-1" />
          Add Charge
        </Button>
      }
    >
      {charges.length === 0 ? (
        detectedCharges.length > 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-400 mb-2">Detected charges (unconfirmed)</p>
              <div className="space-y-2">
                {detectedCharges.map((charge, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    {charge}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Charges detected in case documents but not yet confirmed in structured data.
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => {
                  // This would open the Add Charge UI - for now just a placeholder
                  // The actual implementation would depend on your Add Charge modal/dialog
                  console.log("Add charge clicked");
                }}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Charge
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No charges recorded</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {charges.map((charge) => (
            <div key={charge.id} className="p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{charge.offence}</h4>
                  {charge.section && (
                    <p className="text-xs text-muted-foreground mt-1">{charge.section}</p>
                  )}
                  {charge.details && (
                    <p className="text-xs text-muted-foreground mt-1">{charge.details}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {charge.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {charge.chargeDate && (
                  <span>Date: {new Date(charge.chargeDate).toLocaleDateString()}</span>
                )}
                {charge.location && <span>Location: {charge.location}</span>}
                {charge.value && <span>Value: £{charge.value.toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

