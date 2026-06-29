"use client";

import { useState } from "react";
import { Copy, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FIRM_SENDABILITY_LABELS } from "@/lib/criminal/trust/firm-facing-labels";
import type { ExportPackModel, ExportPackSectionId } from "@/lib/criminal/export-pack/types";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

const COPY_SECTIONS: ExportPackSectionId[] = [
  "cps_chase",
  "court_note",
  "client_summary",
  "evidence_gaps",
  "do_not_overstate",
];

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

export function ExportPackPanel({ model }: { model: ExportPackModel }) {
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
    const full = model.sections.find((s) => s.id === "full_pack");
    if (!full) return;
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
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-400/90 shrink-0" />
            <h2 className={workflowSectionTitle}>Export pack</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{model.reviewNotice}</p>
        </div>
        <Badge variant="outline" size="sm" className="text-[10px] shrink-0">
          {FIRM_SENDABILITY_LABELS[model.version.sendability]}
        </Badge>
      </div>

      <div className="rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 text-[11px] text-slate-400 space-y-1" data-testid="export-pack-version">
        <p className="font-semibold text-slate-300">Version stamp</p>
        <p>Export ID: {model.version.exportId}</p>
        <p>Generated: {new Date(model.version.generatedAt).toLocaleString()}</p>
        {model.version.appVersion ? <p>Build: {model.version.appVersion}</p> : null}
        <p>{model.version.reviewFooter}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {COPY_SECTIONS.map((id) => {
          const section = model.sections.find((s) => s.id === id);
          if (!section) return null;
          return (
            <div
              key={id}
              className="rounded-md border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 space-y-2"
              data-testid={`export-pack-section-${id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs font-medium text-slate-200">{section.title}</p>
                <Badge variant="secondary" size="sm" className="text-[9px]">
                  {section.sendabilityLabel}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-3 whitespace-pre-wrap">
                {section.textForClipboard.slice(0, 220)}
                {section.textForClipboard.length > 220 ? "…" : ""}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] w-full sm:w-auto"
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
