/**
 * Production adapter: document/page units → canonical pipeline → real solicitor builders.
 * Integration contracts must call this (or the builders it invokes) — not a parallel payload shape.
 */

import {
  buildCanonicalPipelineFromDocumentUnits,
  type LiveCanonicalPipelineResult,
  type UploadedDocumentUnit,
} from "@/lib/criminal/build-from-document-units";
import {
  serializeCanonicalFindingForSurface,
  type CanonicalFinding,
} from "@/lib/criminal/canonical-finding-model";
import { buildHearingWarRoomBrief, type HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import {
  buildDisclosureChaseBrief,
  type DisclosureChaseBrief,
} from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import type { FiveAnswersEvidenceRow, FiveAnswersViewModel } from "@/lib/criminal/five-answers/types";
import { buildExportPack } from "@/lib/criminal/export-pack/build-export-pack";
import type { ExportPackModel } from "@/lib/criminal/export-pack/types";
import { buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import { composeStructuredSolicitorOutput } from "@/lib/criminal/structured-solicitor-output";
import {
  buildCriminalStructuredKeyFacts,
  appendCanonicalFindingsToKeyFacts,
} from "@/lib/criminal/key-facts-v2";
import type { KeyFactsV2Hierarchy } from "@/lib/types/casebrain";
import { extractCriminalCaseMeta } from "@/lib/criminal/structured-extractor";
import { clientSafeSummaryDisclaimerWithProvenance } from "@/lib/criminal/client-safe-summary-compose";
import { buildControlRoomComputedSupervisorSignals } from "@/lib/criminal/supervisor-queue/build-control-room-computed-signals";
import { buildCanonicalMatterStateV1 } from "@/lib/criminal/canonical-matter-state/build";
import type { CanonicalMatterStateV1 } from "@/lib/criminal/canonical-matter-state/schema";
import type { StructuredChargeView } from "@/lib/criminal/structured-charge-state";
import {
  scanCrossExitConsistency,
  type CrossExitScanResult,
} from "@/lib/criminal/cross-exit-contradiction-scanner";

export type LiveProductionSurfaces = {
  pipeline: LiveCanonicalPipelineResult;
  matterState: CanonicalMatterStateV1;
  charges: StructuredChargeView[];
  keyFacts: KeyFactsV2Hierarchy;
  truthMap: FiveAnswersViewModel;
  disclosureChase: DisclosureChaseBrief;
  warRoom: HearingWarRoomBrief;
  exportPack: ExportPackModel;
  controlRoom: {
    signals: ReturnType<typeof buildControlRoomComputedSupervisorSignals>;
    findings: ReturnType<typeof serializeCanonicalFindingForSurface>[];
  };
  copyLines: Array<{
    kind: string;
    text: string;
    canCopy: boolean;
    provenanceLine: string;
  }>;
  composedProse: {
    courtLine: string | null;
    cpsChase: string | null;
    clientDisclaimer: string;
    limitations: string[];
  };
  /** PDF exit: provenance lines + limitations that must travel into any PDF export. */
  pdf: {
    provenanceLines: string[];
    limitations: string[];
  };
  api: {
    findings: ReturnType<typeof serializeCanonicalFindingForSurface>[];
    documentRoles: Array<{ id: string; title: string | null; role: string }>;
    charges: StructuredChargeView[];
    evidenceState: LiveCanonicalPipelineResult["evidenceState"];
    attribution: LiveCanonicalPipelineResult["attribution"];
    hearingLifecycle: LiveCanonicalPipelineResult["hearingLifecycle"];
  };
  /** Limitations that must survive on every solicitor-facing exit. */
  requiredLimitations: string[];
  /** Result of scanning every exit against the canonical state. */
  crossExit: CrossExitScanResult;
};

/**
 * Limitations that no exit may drop: unresolved finding limitations plus every
 * unreconciled evidence-state contradiction.
 */
function requiredLimitationsFor(pipeline: LiveCanonicalPipelineResult): string[] {
  return Array.from(
    new Set(
      [
        ...pipeline.findings
          .filter((f) => f.unresolved)
          .map((f) => f.provenance.unresolvedConflictOrLimitation),
        ...pipeline.evidenceState.contradictions.map((c) => c.description),
        pipeline.hearingLifecycle.conflictDescription,
      ].filter((x): x is string => Boolean(x)),
    ),
  );
}

function evidenceRowsForFiveAnswers(
  pipeline: LiveCanonicalPipelineResult,
): FiveAnswersEvidenceRow[] {
  return pipeline.evidenceRows.map((r) => {
    const row: FiveAnswersEvidenceRow = {
      label: r.label,
      existence: r.existence as FiveAnswersEvidenceRow["existence"],
      reliability: "needs_review",
    };
    if (r.note) row.note = r.note;
    else if (!r.pageIdentityKnown) {
      row.note = `${r.sourceDocumentTitle ?? "source"} · exact page unavailable (unsplit whole-document text)`;
    } else if (r.sourcePage) {
      const compiled = r.compiledPage ? ` (compiled ${r.compiledPage})` : "";
      row.note = `${r.sourceDocumentTitle ?? "source"} · ${r.sourcePage}${compiled}`;
    }
    return row;
  });
}

/**
 * Build live solicitor surfaces by invoking the same production builders used by the app.
 */
export function buildLiveProductionSurfacesFromDocumentUnits(
  documents: UploadedDocumentUnit[],
  opts?: {
    caseId?: string;
    allegation?: string;
    caseTitle?: string;
    clientLabel?: string;
  },
): LiveProductionSurfaces {
  const pipeline = buildCanonicalPipelineFromDocumentUnits(documents);
  const caseId = opts?.caseId ?? "live-integration-case";
  const allegation = opts?.allegation ?? "Allegation under review";
  const caseTitle = opts?.caseTitle ?? "Live integration matter";
  const clientLabel = opts?.clientLabel ?? "Client";

  const matterState = buildCanonicalMatterStateV1({
    caseId,
    allegation,
    evidenceRows: evidenceRowsForFiveAnswers(pipeline),
    chaseItems: pipeline.chaseLabels.map((label) => ({ label, baseStatus: "Outstanding" })),
    documents,
  });

  const warRoom = buildHearingWarRoomBrief({
    caseId,
    caseTitle,
    clientLabel,
    allegation,
    stage: "Case management",
    hearingStatus: "Listed",
    bundleHealth: "Review papers",
    positionStatus: "Provisional",
    readiness: "Needs review",
    battleboard: null,
    hasSavedPosition: false,
    chaseItems: pipeline.chaseLabels,
    bundleText: pipeline.bundleText,
    canonicalFindings: pipeline.findings,
  });

  const disclosureChase = buildDisclosureChaseBrief({
    caseId,
    caseTitle,
    clientLabel,
    allegation,
    stage: "Case management",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "Review papers",
    positionStatus: "Provisional",
    battleboard: null,
    snapshotMissing: pipeline.chaseLabels.map((label) => ({ label, status: "Outstanding" })),
    bundleText: pipeline.bundleText,
    canonicalFindings: pipeline.findings,
    // Reconciled canonical items, not the raw per-page observations: chase must not
    // re-ask for anything the reconciled state already treats as served.
    canonicalEvidenceRows: pipeline.evidenceState.items.map((i) => ({
      label: i.label,
      state: i.state,
      modality: i.modality,
      aliases: i.aliases,
    })),
  });

  const truthMap = buildFiveAnswersView({
    allegation,
    warRoom,
    chase: disclosureChase,
    matterConfidence: null,
    doNotOverstate: warRoom.doNotOverstate,
    bundleText: pipeline.bundleText,
    evidenceRowsOverride: evidenceRowsForFiveAnswers(pipeline),
    canonicalFindings: pipeline.findings,
  });

  const meta = extractCriminalCaseMeta({
    text: pipeline.bundleText,
    documentName: documents.map((d) => d.title).join("; "),
    now: new Date(),
  });
  const keyFacts = appendCanonicalFindingsToKeyFacts(
    buildCriminalStructuredKeyFacts(meta, "live-document-units"),
    pipeline.findings,
  );

  const exportPack = buildExportPack({
    caseId,
    allegation,
    warRoom,
    chase: disclosureChase,
    briefPlan: null,
    matterConfidence: null,
    doNotOverstate: warRoom.doNotOverstate,
    primaryRouteTitle: "Live integration",
  });

  const docRows = documents.map((d, idx) => ({
    id: d.id,
    name: d.title,
    raw_text: d.pages.map((p) => p.text).join("\n\n") || d.fullText || "",
    extracted_text: d.pages.map((p) => p.text).join("\n\n") || d.fullText || "",
    sort_order: d.uploadOrder ?? idx,
  }));
  const controlSignals = buildControlRoomComputedSupervisorSignals(
    { caseId, title: caseTitle, hearingDate: null },
    docRows,
  );

  const copyLines = pipeline.findings.map((f) => {
    const copy = buildCopySafeResult({
      text: f.summary,
      kind: "court_line",
      sourceState: f.unresolved ? "needs_review" : "served",
      sourceLabel: f.provenance.sourceDocumentTitle ?? undefined,
    });
    return {
      kind: f.kind,
      text: copy.textForClipboard,
      canCopy: copy.canCopy,
      provenanceLine: f.provenanceLine,
    };
  });

  const courtCompose = composeStructuredSolicitorOutput({
    kind: "court_line",
    subject: allegation,
    evidenceState: pipeline.findings.some((f) => f.unresolved) ? "not_safely_confirmed" : "served",
    whyItMatters: pipeline.findings[0]?.summary ?? "Review relationship findings before advancing.",
    requestedAction: "Record outstanding material and relationship findings on the papers.",
    safetyQualification: "Position remains provisional pending solicitor review.",
  });
  const cpsCompose = composeStructuredSolicitorOutput({
    kind: "cps_chase",
    subject: pipeline.chaseLabels[0] ?? "Outstanding material",
    evidenceState: "missing",
    whyItMatters: "Detected from uploaded papers as outstanding or incomplete.",
    requestedAction: `Please provide ${pipeline.chaseLabels[0] ?? "the outstanding material"}.`,
    safetyQualification: "Chase wording is provisional pending solicitor review.",
  });

  const firstFinding = pipeline.findings[0];
  const clientDisclaimer = clientSafeSummaryDisclaimerWithProvenance({
    sourceDocumentTitle: firstFinding?.provenance.sourceDocumentTitle,
    sourceDocumentType: firstFinding?.provenance.sourceDocumentType,
    sourcePage: firstFinding?.provenance.sourcePage,
    compiledPage: firstFinding?.provenance.compiledPage,
    pageIdentityKnown: firstFinding?.provenance.pageIdentityKnown,
    evidenceState: firstFinding?.provenance.evidenceState ?? "provisional",
    defendant: firstFinding?.defendant,
    countNumber: firstFinding?.countNumber,
  });

  const serialized = pipeline.findings.map(serializeCanonicalFindingForSurface);
  const requiredLimitations = requiredLimitationsFor(pipeline);

  // Every exit carries the same limitation set, so a limitation cannot be lost by
  // travelling through copy, export, PDF or composed prose.
  const composedLimitations = Array.from(
    new Set([
      ...requiredLimitations,
      ...pipeline.findings
        .filter((f) => f.unresolved)
        .map((f) => f.provenance.unresolvedConflictOrLimitation || f.provenanceLine)
        .filter((x): x is string => Boolean(x)),
    ]),
  );

  const hearing = {
    status: warRoom.hearingStatus ?? null,
    dateIso: pipeline.hearingLifecycle.latest?.hearingDateIso ?? null,
  };

  const crossExit = scanCrossExitConsistency(
    [
      {
        exit: "control_room",
        texts: serialized.map((f) => f.summary),
        limitations: composedLimitations,
        hearing,
      },
      {
        exit: "war_room",
        texts: findingSummariesForProductionSurfaces(pipeline.findings),
        limitations: composedLimitations,
        hearing,
      },
      {
        exit: "disclosure_chase",
        texts: disclosureChase.items.map(
          (i) => `${i.label} ${i.whyItMatters} ${i.draftChaseWording} ${i.courtLine}`,
        ),
        limitations: composedLimitations,
        hearing,
      },
      {
        exit: "copy",
        texts: copyLines.map((c) => c.text),
        limitations: composedLimitations,
      },
      {
        exit: "composed_prose",
        texts: [
          courtCompose.ok ? (courtCompose.text ?? "") : "",
          cpsCompose.ok ? (cpsCompose.text ?? "") : "",
          clientDisclaimer,
        ],
        limitations: composedLimitations,
      },
      {
        exit: "pdf",
        texts: pipeline.findings.map((f) => f.provenanceLine),
        limitations: composedLimitations,
      },
      {
        exit: "api",
        texts: serialized.map((f) => f.provenanceLine),
        limitations: composedLimitations,
        hearing,
      },
    ],
    {
      evidence: pipeline.evidenceState,
      requiredLimitations,
      support: {
        // Nothing below is asserted by the pipeline itself; exits must earn it.
        identification: false,
        intent: false,
        pleaAdvice: false,
        medicalInjury: pipeline.evidenceState.items.some(
          (i) => i.modality === "medical" && i.state === "served",
        ),
      },
      hearing,
    },
  );

  return {
    pipeline,
    matterState,
    charges: pipeline.charges,
    keyFacts,
    truthMap,
    disclosureChase,
    warRoom,
    exportPack,
    controlRoom: {
      signals: controlSignals,
      findings: serialized,
    },
    copyLines,
    composedProse: {
      courtLine: courtCompose.ok ? courtCompose.text : null,
      cpsChase: cpsCompose.ok ? cpsCompose.text : null,
      clientDisclaimer,
      limitations: composedLimitations,
    },
    pdf: {
      provenanceLines: pipeline.findings.map((f) => f.provenanceLine),
      limitations: composedLimitations,
    },
    api: {
      findings: serialized,
      documentRoles: pipeline.graph.nodes.map((n) => ({
        id: n.id,
        title: n.title,
        role: n.role,
      })),
      charges: pipeline.charges,
      evidenceState: pipeline.evidenceState,
      attribution: pipeline.attribution,
      hearingLifecycle: pipeline.hearingLifecycle,
    },
    requiredLimitations,
    crossExit,
  };
}

/** Shared helper: findings that production War Room / Control Room should surface. */
export function findingSummariesForProductionSurfaces(findings: CanonicalFinding[]): string[] {
  return findings
    .filter((f) => f.unresolved || f.severity === "critical" || f.kind === "draft_vs_signed")
    .map((f) => `${f.title}: ${f.summary}`);
}
