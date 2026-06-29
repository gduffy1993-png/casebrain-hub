"use client";

import { useState } from "react";
import { Copy, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { H5FeedbackFlag } from "@/components/criminal/feedback-console/H5FeedbackFlag";
import { FIRM_SENDABILITY_LABELS } from "@/lib/criminal/trust/firm-facing-labels";
import { displayCopyBody } from "@/lib/criminal/five-answers/display-labels";
import type { ExportPackModel, ExportPackSectionId } from "@/lib/criminal/export-pack/types";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

const COPY_SECTIONS: ExportPackSectionId[] = [
  "cps_chase",
  "court_note",
  "client_summary",
  "evidence_gaps",
];

const SECTION_SUBTITLES: Record<string, string> = {
  cps_chase: "Requests material only.",
  court_note: "For hearing position only.",
  client_summary: "Plain English, non-advice.",
  evidence_gaps: "Missing / referred / incomplete material.",
  do_not_overstate: "Warnings — not for sending.",
};

function copyLabel(id: ExportPackSectionId): string {
  switch (id) {
    case "cps_chase":
      return "Copy CPS chase";
    case "court_note":
      return "Copy court note";
    case "client_summary":
      return "Copy client summary";
    case "evidence_gaps":
      return "Copy evidence gaps";
    case "do_not_overstate":
      return "Copy warnings";
    default:
      return "Copy";
  }
}

export function ExportPackPanel({ model, caseId }: { model: ExportPackModel; caseId: string }) {
  const [copiedId, setCopiedId] = useState<ExportPackSectionId | "full_pack" | null>(null);

  const copySection = async (id: ExportPackSectionId | "full_pack") => {
    const section = model.sections.find((s) => s.id === id);
    if (!section?.canCopy) return;
    try {
      await navigator.clipboard.writeText(section.textForClipboard);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const downloadFullPack = () => {
    const blob = new Blob([JSON.stringify({ version: model.version, sections: model.sections }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${model.version.exportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-4 border-emerald-500/25 bg-emerald-950/10`}
      data-testid="export-pack-panel"
      id="overview-send"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-400/90 shrink-0" />
            <h2 className={workflowSectionTitle}>Export pack</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{model.reviewNotice}</p>
        </div>
        <H5FeedbackFlag
          caseId={caseId}
          surface="export_pack"
          section="full_pack"
          exportId={model.version.exportId}
          exportType={model.version.exportType}
          outputVersion={model.version.appVersion ?? model.version.bundleVersionLabel}
          sendability={model.version.sendability}
        />
      </div>

      <div
        className="rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1"
        data-testid="export-pack-version"
      >
        <span>
          <span className="text-slate-500">Export ID:</span> {model.version.exportId}
        </span>
        <span>
          <span className="text-slate-500">Sendability:</span>{" "}
          {FIRM_SENDABILITY_LABELS[model.version.sendability]}
        </span>
        <span className="text-amber-400/90">Solicitor review required</span>
      </div>

      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {COPY_SECTIONS.map((id) => {
          const section = model.sections.find((s) => s.id === id);
          if (!section) return null;
          const preview = displayCopyBody(section.textForClipboard).slice(0, 200);
          return (
            <div
              key={id}
              className="rounded-md border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 space-y-2 flex flex-col"
              data-testid={`export-pack-section-${id}`}
            >
              <div>
                <p className="text-xs font-medium text-slate-200">{section.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{SECTION_SUBTITLES[id]}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[9px]">
                <Badge variant="outline" size="sm" className="text-[9px]">
                  {section.sendabilityLabel}
                </Badge>
                <Badge variant="secondary" size="sm" className="text-[9px]">
                  {model.version.exportId.slice(0, 12)}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed flex-1 whitespace-pre-wrap">
                {preview}
                {section.textForClipboard.length > 200 ? "…" : ""}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] w-full sm:w-auto self-start"
                disabled={!section.canCopy}
                onClick={() => copySection(id)}
              >
                <Copy className="h-3 w-3 mr-1" />
                {copiedId === id ? "Copied" : copyLabel(id)}
              </Button>
            </div>
          );
        })}
      </div>

      {(() => {
        const dno = model.sections.find((s) => s.id === "do_not_overstate");
        if (!dno) return null;
        const preview = displayCopyBody(dno.textForClipboard).slice(0, 280);
        return (
          <div
            className="rounded-md border border-amber-500/25 bg-amber-950/15 px-3 py-2.5 space-y-2"
            data-testid="export-pack-section-do_not_overstate"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-amber-200/90">{dno.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{SECTION_SUBTITLES.do_not_overstate}</p>
              </div>
              <Badge variant="outline" size="sm" className="text-[9px] shrink-0">
                {dno.sendabilityLabel}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-4">
              {preview}
              {dno.textForClipboard.length > 280 ? "…" : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              disabled={!dno.canCopy}
              onClick={() => copySection("do_not_overstate")}
            >
              <Copy className="h-3 w-3 mr-1" />
              {copiedId === "do_not_overstate" ? "Copied" : copyLabel("do_not_overstate")}
            </Button>
          </div>
        );
      })()}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 text-xs"
          disabled={!model.sections.find((s) => s.id === "full_pack")?.canCopy}
          onClick={() => copySection("full_pack")}
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          {copiedId === "full_pack" ? "Full pack copied" : "Copy full pack"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={downloadFullPack}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Download JSON
        </Button>
      </div>
    </section>
  );
}
