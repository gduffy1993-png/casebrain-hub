"use client";

import type { BundleTruthLedger, MaterialStatus, NormalisedMaterialRow } from "@/lib/criminal/bundle-truth-types";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

const STATUS_LABEL: Record<MaterialStatus, string> = {
  served: "Served / on file",
  draft: "Draft",
  unsigned: "Unsigned",
  referred_only: "Referred only",
  outstanding: "Outstanding / missing",
  absent: "Absent",
  partial: "Partial / incomplete",
  unclear: "Not safely confirmed",
};

function statusTone(status: MaterialStatus): string {
  switch (status) {
    case "served":
      return "text-emerald-300";
    case "partial":
    case "draft":
    case "unsigned":
    case "referred_only":
      return "text-amber-300";
    case "outstanding":
    case "absent":
      return "text-rose-300";
    default:
      return "text-slate-400";
  }
}

function pageHint(row: NormalisedMaterialRow): string | null {
  const hay = `${row.displayLine} ${row.detail ?? ""} ${row.sourceAnchor.excerpt ?? ""} ${row.scheduleRef ?? ""}`;
  const range = hay.match(/\bpages?\s+(\d+)\s*[-–—]\s*(\d+)\b/i);
  if (range) return `pp. ${range[1]}–${range[2]}`;
  const single = hay.match(/\b(?:page|p\.?)\s*(\d+)\b/i);
  if (single) return `p. ${single[1]}`;
  return null;
}

function typeHint(row: NormalisedMaterialRow): string {
  const priority = row.sourceAnchor.documentPriority;
  if (priority && priority !== "unknown") {
    return priority.replace(/_/g, " ").toUpperCase();
  }
  const label = row.label.toLowerCase();
  if (/\bmg6c?\b/.test(label)) return "MG6 / schedule";
  if (/\bmg11\b/.test(label)) return "MG11";
  if (/\bmg5\b/.test(label)) return "MG5";
  if (/cctv|footage|stills/.test(label)) return "CCTV / imagery";
  if (/interview|pace/.test(label)) return "Interview";
  if (/phone|subscriber|download|handset|sim/.test(label)) return "Digital / phone";
  if (/\bcad\b|999/.test(label)) return "CAD / 999";
  if (/charge|indictment/.test(label)) return "Charge";
  return "Source material";
}

function sortMaterials(rows: NormalisedMaterialRow[]): NormalisedMaterialRow[] {
  const rank = (s: MaterialStatus): number => {
    switch (s) {
      case "outstanding":
      case "absent":
        return 0;
      case "partial":
      case "draft":
      case "unsigned":
      case "referred_only":
      case "unclear":
        return 1;
      case "served":
        return 2;
      default:
        return 3;
    }
  };
  return [...rows].sort((a, b) => rank(a.status) - rank(b.status) || a.label.localeCompare(b.label));
}

/**
 * Papers tab inventory — PDF/ledger material rows only.
 * Deliberately not a Control Room / Court pressure clone.
 */
export function PapersDocInventoryPanel({
  ledger,
  loading,
  documentCount,
  textChars,
}: {
  ledger: BundleTruthLedger | null;
  loading?: boolean;
  documentCount?: number | null;
  textChars?: number | null;
}) {
  const materials = sortMaterials(ledger?.materials ?? []).slice(0, 40);
  const served = materials.filter((m) => m.status === "served").length;
  const gaps = materials.filter((m) =>
    ["outstanding", "absent", "partial", "draft", "unsigned", "referred_only", "unclear"].includes(m.status),
  ).length;

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-3`}
      data-testid="papers-doc-inventory"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={workflowSectionTitle}>Papers inventory</p>
          <p className="text-xs text-slate-500 mt-1">
            Document / schedule inventory from uploaded papers — not a court pressure desk.
          </p>
        </div>
        <div className="text-[11px] text-slate-500 text-right space-y-0.5">
          {typeof documentCount === "number" ? <p>{documentCount} file(s) on record</p> : null}
          {typeof textChars === "number" && textChars > 0 ? (
            <p>{Math.round(textChars / 1000)}k chars extracted</p>
          ) : null}
          {ledger?.reviewRequired ? <p className="text-amber-400/90">Provisional — solicitor review</p> : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading papers inventory…</p>
      ) : !materials.length ? (
        <p className="text-sm text-slate-400 leading-relaxed" data-testid="papers-inventory-empty">
          No schedule / material rows detected yet from the uploaded extract. Open File to confirm the
          PDF is readable — do not invent a document list.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-slate-500">
            {materials.length} material row(s) · {served} served/on-file · {gaps} gap / partial / unclear
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-700/60">
                  <th className="py-1.5 pr-3 font-medium">Material</th>
                  <th className="py-1.5 pr-3 font-medium">Type</th>
                  <th className="py-1.5 pr-3 font-medium">Status</th>
                  <th className="py-1.5 font-medium">Pages / ref</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((row) => {
                  const pages = pageHint(row);
                  const ref = row.scheduleRef?.trim() || null;
                  return (
                    <tr key={row.id} className="border-b border-slate-800/80 align-top">
                      <td className="py-2 pr-3 text-slate-200">
                        <p className="font-medium leading-snug">{row.label}</p>
                        {row.detail ? (
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                            {row.detail}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{typeHint(row)}</td>
                      <td className={`py-2 pr-3 whitespace-nowrap ${statusTone(row.status)}`}>
                        {STATUS_LABEL[row.status]}
                      </td>
                      <td className="py-2 text-slate-500 whitespace-nowrap">
                        {[pages, ref].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Inventory is provisional and limited to what the extract establishes. Missing ranges appear
            only when the papers state them — gaps are not invented for a fuller-looking list.
          </p>
        </>
      )}
    </section>
  );
}
