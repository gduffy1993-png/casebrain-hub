import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { EvidenceChangeCompareResult } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { buildCaseHandoverSummary } from "./build-case-handover-summary";
import { buildDisclosureChaseDraft } from "./build-disclosure-chase-draft";
import { buildHearingPrepNote } from "./build-hearing-prep-note";
import type { SolicitorExportResult, SolicitorExportType, SolicitorExportContext } from "./export-types";

export type BuildSolicitorExportOptions = {
  clientStress?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput;
  evidenceChanges?: EvidenceChangeCompareResult | null;
};

export function buildSolicitorExport(
  type: SolicitorExportType,
  reasoning: ReasoningV2ViewModel,
  ctx: SolicitorExportContext,
  options: BuildSolicitorExportOptions = {},
): SolicitorExportResult {
  if (type === "disclosure_chase") {
    return buildDisclosureChaseDraft(reasoning, ctx, options.clientStress);
  }
  if (type === "case_handover") {
    return buildCaseHandoverSummary(reasoning, ctx, {
      clientStress: options.clientStress,
      readinessInput: options.readinessInput,
      evidenceChanges: options.evidenceChanges,
    });
  }
  return buildHearingPrepNote(reasoning, ctx, {
    clientStress: options.clientStress,
    readinessInput: options.readinessInput,
    evidenceChanges: options.evidenceChanges,
  });
}
