"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MissingEvidencePanel } from "@/components/core/MissingEvidencePanel";
import { DisclosureTrackerTable } from "./DisclosureTrackerTable";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type CaseEvidenceColumnProps = {
  caseId: string;
  snapshot: CaseSnapshot;
};

export function CaseEvidenceColumn({ caseId, snapshot }: CaseEvidenceColumnProps) {
  return (
    <div className="space-y-6">
      {/* Documents */}
      <Card title="Documents" description="Case documents and evidence">
        <div className="space-y-2">
          {snapshot.evidence.documents.length > 0 ? (
            snapshot.evidence.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/10"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{doc.name}</span>
                  {doc.type && (
                    <Badge variant="outline" className="text-xs">
                      {doc.type}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No documents uploaded yet
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      </Card>

      {/* Missing Evidence */}
      <MissingEvidencePanel caseId={caseId} />

      {/* Disclosure Tracker Table */}
      <DisclosureTrackerTable items={snapshot.evidence.disclosureItems} />
    </div>
  );
}

