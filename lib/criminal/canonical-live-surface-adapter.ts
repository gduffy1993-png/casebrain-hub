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
  formatChargeWithInseparableWarning,
  resolveChargeCompleteness,
  type ChargeCompletenessResult,
} from "@/lib/criminal/charge-allegation-completeness";
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
  enforceCrossExitConsistency,
  type CrossExitScanResult,
  type EnforcementAction,
} from "@/lib/criminal/cross-exit-contradiction-scanner";

export type LiveProductionSurfaces = {
  pipeline: LiveCanonicalPipelineResult;
  matterState: CanonicalMatterStateV1;
  charges: StructuredChargeView[];
  /** Structured charge completeness attached to every exit. */
  chargeCompleteness: ChargeCompletenessResult;
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
  // Update LiveProductionSurfaces type for composedProse/pdf/api extended fields
  composedProse: {
    courtLine: string | null;
    cpsChase: string | null;
    clientDisclaimer: string;
    limitations: string[];
    allegation?: string;
    chargeCompleteness?: ChargeCompletenessResult;
  };
  /** PDF exit: provenance lines + limitations that must travel into any PDF export. */
  pdf: {
    provenanceLines: string[];
    limitations: string[];
    allegation?: string;
    chargeCompleteness?: ChargeCompletenessResult;
  };
  api: {
    findings: ReturnType<typeof serializeCanonicalFindingForSurface>[];
    documentRoles: Array<{ id: string; title: string | null; role: string }>;
    charges: StructuredChargeView[];
    allegation?: string;
    chargeCompleteness?: ChargeCompletenessResult;
    evidenceState: LiveCanonicalPipelineResult["evidenceState"];
    attribution: LiveCanonicalPipelineResult["attribution"];
    hearingLifecycle: LiveCanonicalPipelineResult["hearingLifecycle"];
  };
  /** Limitations that must survive on every solicitor-facing exit. */
  requiredLimitations: string[];
  /** Result of scanning every exit against the canonical state. */
  crossExit: CrossExitScanResult;
  /** Enforcement actions that removed or rewrote unsafe legacy prose. */
  crossExitEnforcement: EnforcementAction[];
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
    /** Exact recorded charge as captured (may be truncated) — always retained in chargeCompleteness.sourceChargeText. */
    recordedChargeText?: string | null;
    canonicalOffenceLine?: string | null;
    courtNoteText?: string | null;
    caseTitle?: string;
    clientLabel?: string;
  },
): LiveProductionSurfaces {
  const pipeline = buildCanonicalPipelineFromDocumentUnits(documents);
  const caseId = opts?.caseId ?? "live-integration-case";
  const chargeCompleteness = resolveChargeCompleteness({
    recordedChargeText: opts?.recordedChargeText ?? opts?.allegation ?? null,
    canonicalOffenceLine: opts?.canonicalOffenceLine ?? null,
    courtNoteText: opts?.courtNoteText ?? null,
  });
  const allegation = chargeCompleteness.displayedChargeText;
  const allegationWithStatus = formatChargeWithInseparableWarning(chargeCompleteness);
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
    chargeCompleteness,
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
    urnCandidateTexts: [pipeline.bundleText, allegation],
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
    subject: allegationWithStatus || allegation,
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

  const paceConflict = pipeline.findings.some(
    (f) => f.kind === "custody_interview_clock" && f.custodyInterviewClock?.conflict,
  );
  const attributionEstablished = pipeline.attribution.messageAuthorship.some(
    (m) => m.basis === "explicit_statement" && m.person,
  );

  const enforcement = enforceCrossExitConsistency(
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
      requiredLimitations: composedLimitations,
      support: {
        identification: false,
        intent: false,
        pleaAdvice: false,
        medicalInjury: pipeline.evidenceState.items.some(
          (i) => i.modality === "medical" && i.state === "served",
        ),
      },
      hearing,
      paceConflict,
      attributionEstablished,
    },
  );

  const sanitizedChase = enforcement.sanitizedExits.find((e) => e.exit === "disclosure_chase");
  const sanitizedProse = enforcement.sanitizedExits.find((e) => e.exit === "composed_prose");
  const sanitizedCopy = enforcement.sanitizedExits.find((e) => e.exit === "copy");

  // Drop chase items whose labels are served under a supported alias, or whose
  // draft wording was rewritten away from an unsafe recording-missing chase.
  const enforcedChaseItems = disclosureChase.items.filter((item) => {
    const canonical = pipeline.evidenceState.items.find(
      (i) =>
        i.label.toLowerCase() === item.label.toLowerCase() ||
        i.aliases.some((a) => a.toLowerCase() === item.label.toLowerCase()),
    );
    if (canonical?.state === "served") return false;
    // Recording served → never keep a chase row for the recording itself.
    if (
      /recording/i.test(item.label) &&
      !/transcript/i.test(item.label) &&
      pipeline.evidenceState.items.some(
        (i) => /recording/i.test(i.label) && i.state === "served",
      )
    ) {
      return false;
    }
    return true;
  });

  const enforcedDisclosureChase = {
    ...disclosureChase,
    items: enforcedChaseItems,
  };

  const proseTexts = sanitizedProse?.texts ?? [];
  const enforcedComposedProse = {
    courtLine: proseTexts[0] || (courtCompose.ok ? courtCompose.text : null),
    cpsChase: proseTexts[1] || (cpsCompose.ok ? cpsCompose.text : null),
    clientDisclaimer: proseTexts[2] || clientDisclaimer,
    limitations: composedLimitations,
    allegation: allegationWithStatus || allegation,
    chargeCompleteness,
  };

  const enforcedCopyLines = [
    {
      kind: "charge_allegation",
      text: allegationWithStatus || allegation,
      canCopy: chargeCompleteness.completenessStatus !== "unresolved",
      provenanceLine:
        chargeCompleteness.provenance ??
        (chargeCompleteness.warning
          ? `${chargeCompleteness.warning} ${chargeCompleteness.requiredAction ?? ""}`.trim()
          : "Recorded charge wording"),
    },
    ...copyLines.map((line, idx) => ({
      ...line,
      text: sanitizedCopy?.texts[idx] ?? line.text,
    })),
  ];

  return {
    pipeline,
    matterState,
    charges: pipeline.charges,
    chargeCompleteness,
    keyFacts,
    truthMap,
    disclosureChase: enforcedDisclosureChase,
    warRoom,
    exportPack,
    controlRoom: {
      signals: controlSignals,
      findings: serialized,
    },
    copyLines: enforcedCopyLines,
    composedProse: enforcedComposedProse,
    pdf: {
      provenanceLines: pipeline.findings.map((f) => f.provenanceLine),
      limitations: composedLimitations,
      allegation: allegationWithStatus || allegation,
      chargeCompleteness,
    },
    api: {
      findings: serialized,
      documentRoles: pipeline.graph.nodes.map((n) => ({
        id: n.id,
        title: n.title,
        role: n.role,
      })),
      charges: pipeline.charges,
      allegation: allegationWithStatus || allegation,
      chargeCompleteness,
      evidenceState: pipeline.evidenceState,
      attribution: pipeline.attribution,
      hearingLifecycle: pipeline.hearingLifecycle,
    },
    requiredLimitations: composedLimitations,
    crossExit: enforcement.scan,
    crossExitEnforcement: enforcement.actions,
  };
}

/** Shared helper: findings that production War Room / Control Room should surface. */
export function findingSummariesForProductionSurfaces(findings: CanonicalFinding[]): string[] {
  return findings
    .filter((f) => f.unresolved || f.severity === "critical" || f.kind === "draft_vs_signed")
    .map((f) => `${f.title}: ${f.summary}`);
}
