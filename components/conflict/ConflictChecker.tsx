"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Search, X } from "lucide-react";

type ConflictCheckerProps = {
  caseId?: string;
  orgId: string;
  entityType?: "client" | "opponent" | "witness" | "expert" | "related_party";
  onConflictFound?: (conflicts: Conflict[]) => void;
};

type Conflict = {
  id: string;
  entityName: string;
  entityType: "client" | "opponent" | "witness" | "expert" | "related_party";
  conflictType: "direct" | "potential" | "resolved";
  caseId?: string;
  notes?: string;
};

export function ConflictChecker({
  caseId,
  orgId,
  entityType: propEntityType,
  onConflictFound,
}: ConflictCheckerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [entityType, setEntityType] = useState<Conflict["entityType"]>(propEntityType || "client");
  
  const checkConflicts = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    try {
      const res = await fetch("/api/conflicts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          entityName: searchTerm.trim(),
          entityType,
          caseId,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
        if (onConflictFound && data.conflicts?.length > 0) {
          onConflictFound(data.conflicts);
        }
      }
    } catch (error) {
      console.error("Failed to check conflicts:", error);
    } finally {
      setSearching(false);
    }
  };
  
  const hasDirectConflicts = conflicts.some((c) => c.conflictType === "direct");
  const hasPotentialConflicts = conflicts.some((c) => c.conflictType === "potential");
  
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Conflict Checker
        </div>
      }
      description="SRA requirement: Check for conflicts of interest before taking cases"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="entityName">Entity Name</Label>
          <div className="flex gap-2">
            <Input
              id="entityName"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter client, opponent, or related party name"
              onKeyDown={(e) => {
                if (e.key === "Enter") checkConflicts();
              }}
            />
            <Button
              onClick={checkConflicts}
              disabled={!searchTerm.trim() || searching}
              variant="primary"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Entity Type Selector - only show if not provided as prop */}
        {!propEntityType && (
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <div className="flex flex-wrap gap-2">
              {(["client", "opponent", "witness", "expert", "related_party"] as const).map((type) => (
                <Button
                  key={type}
                  variant={entityType === type ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setEntityType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Results */}
        {conflicts.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            {hasDirectConflicts && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h4 className="font-semibold text-red-400">Direct Conflicts Found</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  This entity has direct conflicts. Do not proceed without resolution.
                </p>
              </div>
            )}
            
            {hasPotentialConflicts && !hasDirectConflicts && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold text-amber-400">Potential Conflicts Found</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review potential conflicts before proceeding.
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{conflict.entityName}</span>
                      <Badge
                        variant={
                          conflict.conflictType === "direct"
                            ? "danger"
                            : conflict.conflictType === "potential"
                              ? "warning"
                              : "outline"
                        }
                        size="sm"
                      >
                        {conflict.conflictType}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {conflict.entityType}
                      </Badge>
                    </div>
                    {conflict.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{conflict.notes}</p>
                    )}
                    {conflict.caseId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Related to case: {conflict.caseId.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {conflicts.length === 0 && searchTerm && !searching && (
          <div className="flex items-center gap-2 p-4 rounded-lg border border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-400">No conflicts found</span>
          </div>
        )}
      </div>
    </Card>
  );
}

