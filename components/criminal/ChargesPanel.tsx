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

  useEffect(() => {
    async function fetchCharges() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/charges`);
        if (res.ok) {
          const result = await res.json();
          setCharges(result.charges || []);
        }
      } catch (error) {
        console.error("Failed to fetch charges:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCharges();
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
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No charges recorded</p>
        </div>
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

