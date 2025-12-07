"use client";

import { useState } from "react";
import { ConflictChecker } from "@/components/conflict/ConflictChecker";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type IntakeConflictCheckProps = {
  orgId: string;
  clientName?: string;
  opponentName?: string;
  onConflictCheckComplete?: (hasConflicts: boolean) => void;
};

export function IntakeConflictCheck({
  orgId,
  clientName,
  opponentName,
  onConflictCheckComplete,
}: IntakeConflictCheckProps) {
  const [clientChecked, setClientChecked] = useState(false);
  const [opponentChecked, setOpponentChecked] = useState(false);
  const [hasDirectConflicts, setHasDirectConflicts] = useState(false);
  
  const handleClientConflict = (conflicts: Array<{ conflictType: string }>) => {
    const hasDirect = conflicts.some((c) => c.conflictType === "direct");
    setHasDirectConflicts(hasDirect);
    setClientChecked(true);
    if (onConflictCheckComplete) {
      onConflictCheckComplete(hasDirect);
    }
  };
  
  const handleOpponentConflict = (conflicts: Array<{ conflictType: string }>) => {
    const hasDirect = conflicts.some((c) => c.conflictType === "direct");
    if (hasDirect) {
      setHasDirectConflicts(true);
    }
    setOpponentChecked(true);
    if (onConflictCheckComplete) {
      onConflictCheckComplete(hasDirect);
    }
  };
  
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Conflict Check (SRA Requirement)
        </div>
      }
      description="Check for conflicts of interest before creating case"
    >
      <div className="space-y-4">
        {hasDirectConflicts && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h4 className="font-semibold text-red-400">Direct Conflicts Found</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Direct conflicts have been detected. Do not proceed with case creation without resolution.
            </p>
          </div>
        )}
        
        {clientName && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">Client: {clientName}</span>
              {clientChecked && (
                <Badge variant={hasDirectConflicts ? "danger" : "success"} size="sm">
                  {hasDirectConflicts ? "Conflicts Found" : "Clear"}
                </Badge>
              )}
            </div>
            <ConflictChecker
              orgId={orgId}
              entityType="client"
              onConflictFound={handleClientConflict}
            />
          </div>
        )}
        
        {opponentName && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">Opponent: {opponentName}</span>
              {opponentChecked && (
                <Badge variant={hasDirectConflicts ? "danger" : "success"} size="sm">
                  {hasDirectConflicts ? "Conflicts Found" : "Clear"}
                </Badge>
              )}
            </div>
            <div className="mt-2">
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Enter "{opponentName}" in the search box below to check for conflicts.
              </p>
              <ConflictChecker
                orgId={orgId}
                entityType="opponent"
                onConflictFound={handleOpponentConflict}
              />
            </div>
            </div>
          </div>
        )}
        
        {!clientName && !opponentName && (
          <p className="text-sm text-muted-foreground">
            Enter client and opponent names above to check for conflicts.
          </p>
        )}
        
        {clientChecked && opponentChecked && !hasDirectConflicts && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-400">No direct conflicts found. Safe to proceed.</span>
          </div>
        )}
      </div>
    </Card>
  );
}

