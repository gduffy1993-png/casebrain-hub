import React from "react";
import { AlertTriangle } from "lucide-react";
import type { CaseIngestionAssessment } from "@/lib/upload/ingestion-assessment";

export function IngestionGateNotice({
  assessment,
  surface,
}: {
  assessment: CaseIngestionAssessment;
  surface: "overview" | "chase" | "court";
}) {
  const affected = assessment.documents
    .filter((document) => !document.assessment.substantiveOutputsAllowed)
    .map((document) => document.documentName)
    .filter((name): name is string => Boolean(name?.trim()));

  return (
    <section
      className="rounded-xl border border-amber-300/70 bg-amber-50 p-5 text-amber-950"
      data-testid="ingestion-gate-notice"
      data-ingestion-decision={assessment.decision}
      data-ingestion-surface={surface}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Source extraction incomplete</h2>
          <p className="text-sm">PDF could not be safely read.</p>
          <p className="text-xs">Reprocess/OCR/solicitor review required.</p>
          <p className="text-xs font-semibold">Substantive outputs withheld.</p>
          {affected.length > 0 ? (
            <p className="pt-1 text-[11px] text-amber-800">
              Affected source{affected.length === 1 ? "" : "s"}: {affected.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
