import type { BundleContradiction, BundleContradictionType } from "@/lib/criminal/extract-bundle-contradictions";
import { buildContradictionActions } from "@/lib/criminal/contradiction-actions";
import type { ContradictionSurfaceKind, FiveAnswersContradictionRow } from "./types";

function surfaceKindForType(type: BundleContradictionType): ContradictionSurfaceKind {
  switch (type) {
    case "location":
    case "sequence_order":
    case "sequence_timeline":
    case "multi_incident_dates":
      return "timeline_mismatch";
    case "first_contact":
    case "loss_figure":
    case "scope_multi_vs_single":
    case "scope_indictment_count":
    case "strength_serious_vs_minor":
    case "multi_incident_complainants":
      return "statement_conflict";
    case "triangulation_mg11_cctv":
    case "triangulation_dispatch_scene":
    case "triangulation_bwv_account":
      return "attribution_issue";
    case "cctv_window":
    case "strength_force_vs_cctv":
      return "source_contradiction";
    default:
      return "missing_underlying_material";
  }
}

const SURFACE_LABELS: Record<ContradictionSurfaceKind, string> = {
  statement_conflict: "Statement conflict",
  timeline_mismatch: "Timeline mismatch",
  attribution_issue: "Attribution issue",
  source_contradiction: "Source contradiction",
  missing_underlying_material: "Missing underlying material",
};

export function surfaceContradictions(contradictions: BundleContradiction[]): FiveAnswersContradictionRow[] {
  const actions = buildContradictionActions(contradictions);
  return actions.slice(0, 6).map((action) => {
    const kind = surfaceKindForType(action.type);
    return {
      kind,
      label: SURFACE_LABELS[kind],
      summary: action.summaryRisk || action.label,
    };
  });
}
