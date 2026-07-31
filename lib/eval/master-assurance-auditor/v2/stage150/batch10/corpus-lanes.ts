/**
 * Batch-10 corpus lanes — separate denominators; never merge duplicate counts.
 */

import path from "node:path";
import type { Batch10CorpusLaneId } from "./schemas";

export type Batch10CorpusLane = {
  laneId: Batch10CorpusLaneId;
  rootRelative: string;
  enumeration: "esa_case_dirs" | "gold_case_dirs" | "flat_case_dirs" | "run_manifest_only" | "file_inventory";
  note: string;
  /** Blueprint/receipt-only — not materialised case packets. */
  blueprintOnly: boolean;
};

export const BATCH10_CORPUS_LANES: readonly Batch10CorpusLane[] = [
  {
    laneId: "esa_valid_499",
    rootRelative: path.join("artifacts", "evidence-state-audit-local", "cases"),
    enumeration: "esa_case_dirs",
    note: "Unique-valid ESA trio packets (bundle-text + casebrain-output + truth-key). Preserve unchanged.",
    blueprintOnly: false,
  },
  {
    laneId: "esa_materialised_530_all_dirs",
    rootRelative: path.join("artifacts", "evidence-state-audit-local", "cases"),
    enumeration: "flat_case_dirs",
    note: "All ESA case directories including incomplete/demo-audit (materialised-530 lane).",
    blueprintOnly: false,
  },
  {
    laneId: "esa_demo_audit_pdf_backed",
    rootRelative: path.join("artifacts", "evidence-state-audit-local", "cases"),
    enumeration: "flat_case_dirs",
    note: "demo-audit-* under ESA root with bundle.pdf + pdf-extraction-meta (source-backed).",
    blueprintOnly: false,
  },
  {
    laneId: "gold_manual_proof_set_v1",
    rootRelative: path.join("artifacts", "casebrain-qa", "gold-manual-proof-set-v1"),
    enumeration: "gold_case_dirs",
    note: "Preserved gold CASE-01..20; lineage to demo-audit families — do not double-count as unique sources.",
    blueprintOnly: false,
  },
  {
    laneId: "scale3000_messy_pdf_proof_v9",
    rootRelative: path.join("artifacts", "casebrain-qa", "messy-pdf-proof-v9-scale3000"),
    enumeration: "file_inventory",
    note: "Scale-3000 proof receipts/summaries — blueprint/receipt lane unless case packets materialise.",
    blueprintOnly: true,
  },
  {
    laneId: "scale3000_solicitor_materialisation_runs",
    rootRelative: path.join(
      "artifacts",
      "casebrain-qa",
      "integrity-programme",
      "scale3000-solicitor-materialisation",
    ),
    enumeration: "run_manifest_only",
    note: "Integrity-programme scale3000 solicitor materialisation run artefacts — not CaseBrain case packets.",
    blueprintOnly: true,
  },
  {
    laneId: "phase11_related_gold",
    rootRelative: path.join("artifacts", "casebrain-qa", "gold-manual-proof-set-v1"),
    enumeration: "gold_case_dirs",
    note: "Phase-11 gold freeze uses gold-manual packets; same root counted under separate lane label.",
    blueprintOnly: false,
  },
  {
    laneId: "malik_price_heavy_bundle",
    rootRelative: path.join("artifacts", "casebrain-qa", "malik-price-generation-v2-untouched-run"),
    enumeration: "file_inventory",
    note: "Malik–Price heavy-bundle run screenshots/JSON receipts — not structured case packets.",
    blueprintOnly: true,
  },
  {
    laneId: "pdf_gold_manual_proof_packs",
    rootRelative: path.join("artifacts", "casebrain-qa", "messy-pdf-proof-v1"),
    enumeration: "file_inventory",
    note: "Earlier messy-PDF proof packs / summaries.",
    blueprintOnly: true,
  },
  {
    laneId: "controlled_pilot_assets",
    rootRelative: path.join("artifacts", "casebrain-qa", "solicitor-pilot-bundle-v1"),
    enumeration: "gold_case_dirs",
    note: "Solicitor pilot CASE subsets with review packets.",
    blueprintOnly: false,
  },
  {
    laneId: "demo_audit_thirty_surfaces",
    rootRelative: path.join("artifacts", "casebrain-qa", "demo-audit-thirty"),
    enumeration: "flat_case_dirs",
    note: "Surface-only demo-audit packs (outputs without PDF page meta in this lane).",
    blueprintOnly: false,
  },
  {
    laneId: "demo_audit_five_surfaces",
    rootRelative: path.join("artifacts", "casebrain-qa", "demo-audit-five"),
    enumeration: "flat_case_dirs",
    note: "Five-case surface packs; lineage overlaps demo-audit PDF sources.",
    blueprintOnly: false,
  },
];
