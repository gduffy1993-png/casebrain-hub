import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import type { BattleboardOutput, BattleboardRouteType } from "@/lib/criminal/strategy-battleboard";
import {
  filterWorkflowItems,
  normalizeWorkflowPilotLabel,
  prioritizeWorkflowItems,
  resolveWorkflowProfile,
  formatPilotCourtLine,
  formatPilotDraftChaseWording,
  isMalformedPilotEvidenceAnchor,
  pilotCleanupVisibleText,
  sanitizePilotVisibleLine,
  workflowDisclosureCaseWideLine,
  workflowDisclosureChaseLabels,
  workflowDisclosureWhyItMatters,
} from "@/lib/criminal/pilot-workflow";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import {
  buildBundleTruthLedger,
  formatDisplayLabelCasing,
  guardSolicitorLine,
  isAdminGuidanceLine,
  ledgerAnchorForChaseFamily,
  ledgerMaterialsNeedingChase,
} from "@/lib/criminal/bundle-truth-ledger";
import type { BundleTruthLedger } from "@/lib/criminal/bundle-truth-types";
import {
  shouldSuppressChaseAsAlreadyOnFile,
  type EvidenceStateRow,
} from "@/lib/criminal/evidence-state-reconcile";
import {
  assertFindingProvenanceOrLimitation,
  type FindingProvenance,
} from "@/lib/criminal/finding-provenance";
import { shouldChaseRequestAgainstServedAliases } from "@/lib/criminal/canonical-finding-model";
import { finalizeSolicitorVisibleProse } from "@/lib/criminal/solicitor-visible-boundary";
import {
  professionalCourtStatusFragment,
  professionalMaterialStatusProse,
} from "@/lib/criminal/solicitor-visible-sanitization";
import {
  confirmNoneLine,
  familiesInText,
  familyDisplayName,
  familySupport,
  gateProseAgainstSource,
  isBwvFullExportEstablished,
  isCad999Established,
  isCctvContinuityEstablished,
  isCctvMasterEstablished,
  isIdentificationProcedureEstablished,
  isInterviewRecordingEstablished,
  isInterviewTranscriptEstablished,
  lineClaimsIdentificationProcedure,
  type ChaseGateFamily,
} from "@/lib/criminal/chase-source-gate";
import { buildCriminalBriefPlan, type CriminalBriefPlan } from "@/lib/criminal/brief-plan";
import { buildContradictionActions } from "@/lib/criminal/contradiction-actions";
import { extractAllBundleContradictions } from "@/lib/criminal/merge-bundle-contradictions";
import { guardDisclosureChaseBrief, type SourceTruthGuardianReport } from "@/lib/criminal/source-truth-guardian";
import {
  finalizeDisclosureChasePresentation,
  isDigitalModalityChaseLabel,
} from "@/lib/criminal/disclosure-chase-finalize";
import { composeStructuredSolicitorOutput } from "@/lib/criminal/structured-solicitor-output";
import {
  assertSafeEvidenceTitle,
  buildExtractionProvenanceBlock,
  stableEvidenceId,
} from "@/lib/criminal/extraction-provenance-boundary";
import { utcDayDiff } from "@/lib/criminal/solicitor-time-clock";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";

const FORBIDDEN_RE =
  /\b(this wins|case collapses|crowns?\s+will\s+lose|crown\s+case\s+collapses|guaranteed|will\s+be\s+acquitted)\b/i;

const COURT_RECORD_PREFIX = "The defence asks the court to record";

export const DISCLOSURE_CHASE_PRIMARY_CAP = 8;

export type ChaseItemStatus =
  | "Outstanding"
  | "Chased"
  | "Received"
  | "Overdue"
  | "Due soon"
  | "Not safely confirmed";

export type ChaseFamilyId =
  | "cctv_master"
  | "cctv_continuity"
  | "cad_999"
  | "bwv"
  | "custody_pace"
  | "interview"
  | "mg6_unused"
  | "medical_expert"
  | "exhibit_provenance"
  | "other";

type FamilyDef = {
  id: ChaseFamilyId;
  label: string;
  source: string;
  priority: number;
  match: (text: string) => boolean;
};

/** Invent-advisory only (Trap) — not an established CCTV exhibit / outstanding master. */
function isCctvInventAdvisoryOnly(t: string): boolean {
  if (
    !/\b(?:assuming\s+missing\s+cctv|do\s+not\s+(?:invent|assume)[^.!?\n]{0,80}\bcctv|should\s+not\s+be\s+strengthened\s+by\s+assuming\s+missing\s+cctv)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  // Real stills/master/outstanding CCTV language still establishes the family.
  return !/\b(?:cctv\s+stills|partial\s+cctv|full\s+cctv\s+master|cctv\s+master|master\s+footage|full\s*(?:time\s+)?window|cctv\s+(?:footage|export|continuity)|video\s+footage)\b/i.test(
    t,
  );
}

const CHASE_FAMILIES: FamilyDef[] = [
  {
    id: "cctv_continuity",
    label: "CCTV continuity / provenance",
    source: "Police / CCTV unit",
    priority: 1,
    match: (t) =>
      !isCctvInventAdvisoryOnly(t) &&
      /\b(cctv|video)\b/.test(t) &&
      /\b(continuity|provenance|chain\s+of\s+custody|integrity)\b/.test(t),
  },
  {
    id: "cctv_master",
    label: "CCTV full window / master footage",
    source: "Police / CCTV unit",
    priority: 2,
    // Stills alone must not classify as master (Dunn). Require master/full-window language,
    // or stills paired with an explicit master/full-window outstanding signal.
    match: (t) =>
      !isCctvInventAdvisoryOnly(t) &&
      !/\b(continuity|provenance|chain\s+of\s+custody)\b/.test(t) &&
      (/\b(?:cctv\s+master|full\s+cctv(?:\s+master)?|master\s+footage|full\s*(?:time\s+)?window|cctv\s+(?:footage|export))\b/.test(
        t,
      ) ||
        (/\b(?:cctv\s+stills|partial\s+cctv\s+stills|stills)\b/.test(t) &&
          /\b(?:master|full\s*(?:time\s+)?window|full\s+cctv)\b/.test(t)) ||
        (/\bcctv\b/.test(t) &&
          /\b(?:master|full\s*(?:time\s+)?window|footage)\b/.test(t) &&
          !/\bstills?\b/.test(t))),
  },
  {
    id: "cad_999",
    label: "CAD / dispatch / 999 material",
    source: "Police control room",
    priority: 3,
    // Bare "999" (page / schedule noise) must not classify as CAD (Court C0.5).
    match: (t) =>
      /\b(cad|control\s*room|dispatch\s+log|999\s+(?:audio|call|recording)|CAD\s*\/\s*999|emergency\s+call)\b/i.test(
        t,
      ),
  },
  {
    id: "bwv",
    label: "Body-worn video (BWV)",
    source: "Police / officer body-worn video",
    priority: 4,
    // Stills-only served lines must not classify as full-export BWV chase (Dunn).
    // Require clip/export/footage/outstanding/not-served language, or BWV without stills-served-only.
    match: (t) => {
      if (!/\b(bwv|body\s*worn|body-worn)\b/.test(t)) return false;
      if (
        /\bbwv\s+stills?\b/.test(t) &&
        !/\b(?:full|export|footage|clip|incident\s+window|outstanding|not\s+served|not\s+attached|referred)\b/.test(
          t,
        )
      ) {
        return false;
      }
      return true;
    },
  },
  {
    id: "custody_pace",
    label: "Full custody record / PACE material",
    source: "Custody / police interview unit",
    priority: 5,
    match: (t) =>
      /\b(?:custody\s+(?:record|log|sheet)|detention\s+log|pace\s+(?:material|record|clock|code\s+c|interview)|safeguards?\s+checklist|risk\s+assessment)\b/.test(
        t,
      ),
  },
  {
    id: "interview",
    // Prefer modality-specific titles via reconcileInterviewModalityItems — avoid slash-blend identity.
    label: "Interview recording",
    source: "Custody / police interview unit",
    priority: 6,
    // Recording/transcript is a distinct modality from "interview summary" / "custody/interview summary".
    match: (t) =>
      /\b(interview\s+recording|interview\s+transcript|interview\s+audio|interview\s+video|recording\s*\/\s*transcript|recording\s+and\s+transcript)\b/.test(
        t,
      ) ||
      (/\binterview\b/.test(t) &&
        /\b(recording|transcript|audio|video)\b/.test(t) &&
        !/\b(interview\s+summary|custody\s*\/\s*interview\s+summary|summary\s+only)\b/.test(t)),
  },
  {
    id: "mg6_unused",
    label: "MG6 / unused / schedule clarification",
    source: "CPS / disclosure officer",
    priority: 7,
    // MG6 extract alone is not an unused-schedule chase — require unused/MG6C/schedule clarification signal.
    match: (t) =>
      /\b(mg6c|unused\s+material|unused\s+schedule|schedule\s+clarification|material\s+not\s+used|cpi(a)?)\b/.test(
        t,
      ) ||
      (/\bmg6\b/.test(t) && /\b(unused|schedule\s+clarification|disclosure\s+schedule)\b/.test(t)),
  },
  {
    id: "medical_expert",
    label: "Medical / expert source report",
    source: "CPS / expert source (confirm on file)",
    priority: 8,
    match: (t) => /\b(medical|gp|hospital|pathology|expert|autopsy|fme)\b/.test(t),
  },
  {
    id: "exhibit_provenance",
    label: "Exhibit mapping / provenance",
    source: "Crown / disclosure officer",
    priority: 9,
    match: (t) =>
      /\b(exhibit|provenance|mapping|continuity)\b/.test(t) &&
      !/\b(cctv|video|999|cad)\b/.test(t),
  },
];

export type DisclosureChaseItem = {
  id: string;
  familyId: ChaseFamilyId;
  label: string;
  whyItMatters: string;
  source: string;
  baseStatus: ChaseItemStatus;
  urgency: "high" | "medium" | "low";
  deadlineLabel: string;
  evidenceAnchor: string | null;
  linkedRoute: string | null;
  draftChaseWording: string;
  courtLine: string;
  mergedFrom: string[];
  /** Mandatory finding provenance — limitation when exact doc/page/state/scope unavailable. */
  provenance?: FindingProvenance;
};

function chaseItemProvenance(input: {
  label: string;
  source: string;
  baseStatus: ChaseItemStatus;
  evidenceAnchor: string | null;
  defendant?: string | null;
  countNumber?: number | null;
  sourceDocumentTitle?: string | null;
  sourceDocumentType?: string | null;
  sourcePage?: string | null;
  compiledPage?: string | null;
}): FindingProvenance {
  return assertFindingProvenanceOrLimitation({
    sourceDocumentTitle: input.sourceDocumentTitle ?? null,
    sourceDocumentType: input.sourceDocumentType ?? null,
    sourcePage: input.sourcePage ?? null,
    compiledPage: input.compiledPage ?? null,
    // Org chase-source labels (e.g. "Police / CCTV unit") are not document titles.
    sourceFilename: null,
    evidenceState: mapChaseStatusToEvidenceState(input.baseStatus),
    defendant: input.defendant ?? null,
    countNumber: input.countNumber ?? null,
    unresolvedConflictOrLimitation: input.evidenceAnchor
      ? "Source reference present; exact document title/type and page still need checking."
      : undefined,
  });
}

function mapChaseStatusToEvidenceState(status: ChaseItemStatus): string {
  switch (status) {
    case "Received":
      return "served";
    case "Overdue":
    case "Due soon":
    case "Outstanding":
    case "Chased":
      return "missing";
    case "Not safely confirmed":
    default:
      return "not_safely_confirmed";
  }
}

/**
 * Shared served/referred/missing/incomplete reconciliation (read-only over the ledger).
 * Served material is not chased as absent; incomplete material is shown as incomplete,
 * not missing; genuinely missing material stays visible.
 */
export function reconcileChaseItemsAgainstServedMaterial(
  items: DisclosureChaseItem[],
  ledger: { materials: Array<{ label: string; detail?: string | null; status: string }> } | null,
): DisclosureChaseItem[] {
  if (!ledger?.materials?.length) return items;

  const rows: EvidenceStateRow[] = ledger.materials.map((m) => ({
    label: `${m.label}${m.detail ? ` ${m.detail}` : ""}`,
    state: mapMaterialStatusToSharedState(m.status),
  }));

  return items
    .map((item) => {
      const aliasVerdict = shouldChaseRequestAgainstServedAliases(item.label, rows);
      if (!aliasVerdict.chase) {
        if (/incomplete/i.test(aliasVerdict.reason ?? "")) {
          return {
            ...item,
            baseStatus: "Not safely confirmed" as ChaseItemStatus,
            whyItMatters: item.whyItMatters,
            evidenceAnchor: item.evidenceAnchor,
          };
        }
        return null;
      }
      const verdict = shouldSuppressChaseAsAlreadyOnFile(item.label, rows);
      if (!verdict.suppress) return item;
      // Recording served but transcript incomplete → keep visible as incomplete, not missing.
      if (/incomplete/i.test(verdict.reason ?? "")) {
        return {
          ...item,
          baseStatus: "Not safely confirmed" as ChaseItemStatus,
          whyItMatters: item.whyItMatters,
          evidenceAnchor: item.evidenceAnchor,
        };
      }
      return null;
    })
    .filter((i): i is DisclosureChaseItem => i !== null);
}

/**
 * CAD extract Present/served must not keep the lumped "CAD / 999 audio…" card as if
 * the extract were missing. Split remaining modalities (999 audio / CAD full print).
 * Opposite: Dunn — extract served + 999 audio / full print outstanding stays chaseable.
 */
export function reconcileCad999ModalityItems(
  items: DisclosureChaseItem[],
  bundleText?: string | null,
): DisclosureChaseItem[] {
  const hay = `${bundleText ?? ""}`;
  return items
    .map((item) => {
      if (item.familyId !== "cad_999") return item;
      const itemBlob = [item.label, ...(item.mergedFrom ?? []), item.evidenceAnchor ?? ""].join("\n");
      // Item-local + hay: schedule "Present" language OR a served CAD/999 Extract section body.
      const blob = `${itemBlob}\n${hay}`;

      const completeCad999LogOutstanding =
        /\b(?:complete\s+)?cad\s*\/\s*999\s+log\b[\s\S]{0,56}\b(?:outstanding|not\s+attached|not\s+served|listed\s+but\s+not)/i.test(
          blob,
        ) ||
        /\b(?:outstanding|not\s+attached|not\s+served|listed\s+but\s+not)\b[\s\S]{0,56}\b(?:complete\s+)?cad\s*\/\s*999\s+log\b/i.test(
          blob,
        );

      const extractPresent =
        /\b\d*cad(?:\s*\/\s*999)?(?:\s+incident\s+log)?\s+extract\b[\s\S]{0,40}\b(?:present|served|included)/i.test(
          blob,
        ) ||
        /\b(?:present|served|included)\b[\s\S]{0,40}\b\d*cad(?:\s*\/\s*999)?(?:\s+incident\s+log)?\s+extract\b/i.test(
          blob,
        ) ||
        /\b\d*cad\s*\/\s*999\s+extract\s*present/i.test(blob) ||
        /\b\d*cad\s*\/\s*999\s+extractpresent\b/i.test(blob) ||
        // Served extract document body (Tobin): section title + timed entries — not a missing-extract chase.
        (/\bcad\s*\/\s*999\s+extract\b/i.test(blob) &&
          /\b(?:time\s+entry|call\s+received|unit\s*assigned|officer\s+arriv)/i.test(blob)) ||
        // Chase already anchored to a CAD/999 Extract document title (Tobin live residual).
        (/\bcad\s*\/\s*999\s+extract\b/i.test(itemBlob) &&
          !/\b(?:outstanding|not\s+attached|not\s+served|missing)\b/i.test(itemBlob));

      const audioOutstanding =
        /\b999\s+audio\b[\s\S]{0,40}\b(?:outstanding|not\s+attached|not\s+served|listed\s+but\s+not)/i.test(
          blob,
        ) || /\bno\s+recording\s+attached\b/i.test(blob);

      const fullPrintOutstanding =
        /\bcad\s+log\s+full\s+print\b[\s\S]{0,40}\b(?:outstanding|not\s+attached|not\s+served|listed\s+but\s+not)/i.test(
          blob,
        );

      const cadDispatchOutstanding =
        /\b(?:cad|dispatch)(?:\s*\/\s*(?:dispatch|cad))?\b[\s\S]{0,56}\b(?:outstanding|not\s+attached|not\s+served|listed\s+but\s+not|not\s+provided)/i.test(
          blob,
        ) ||
        /\b(?:outstanding|not\s+attached|not\s+served|listed\s+but\s+not|not\s+provided)\b[\s\S]{0,56}\b(?:cad|dispatch)(?:\s*\/\s*(?:dispatch|cad))?\b/i.test(
          blob,
        );

      if (completeCad999LogOutstanding && !audioOutstanding && !fullPrintOutstanding) {
        const label = "Complete CAD/999 log";
        return {
          ...item,
          label,
          familyId: "cad_999" as ChaseFamilyId,
          whyItMatters:
            "The papers identify a CAD/999 log gap — keep the request limited to the log the source identifies.",
          draftChaseWording:
            "Please provide the complete CAD/999 log, or confirm in writing why it is not available.",
          courtLine: toCourtLine(label),
          mergedFrom: [
            label,
            ...((item.mergedFrom ?? []).filter((m) => /cad\s*\/\s*999\s+log/i.test(m))),
          ].slice(0, 4),
        };
      }

      if (cadDispatchOutstanding && !audioOutstanding && !fullPrintOutstanding && !completeCad999LogOutstanding) {
        const label = "CAD / dispatch log material";
        return {
          ...item,
          label,
          familyId: "cad_999" as ChaseFamilyId,
          whyItMatters:
            "The papers identify a CAD/dispatch material gap — keep the request limited to the source the papers identify.",
          draftChaseWording:
            "Please provide the CAD / dispatch log material, or confirm in writing why it is not available.",
          courtLine: toCourtLine(label),
          mergedFrom: [
            label,
            ...((item.mergedFrom ?? []).filter((m) => /\b(?:cad|dispatch)\b/i.test(m))),
          ].slice(0, 4),
        };
      }

      if (!extractPresent) return item;

      if (!audioOutstanding && !fullPrintOutstanding) {
        // Grant/Tobin: extract present and no remaining CAD modality — do not chase as missing.
        return null;
      }

      const parts: string[] = [];
      if (audioOutstanding) parts.push("999 audio");
      if (fullPrintOutstanding) parts.push("CAD log full print");
      const label = `${parts.join(" / ")} outstanding`;
      return {
        ...item,
        label,
        draftChaseWording: `Please provide ${parts.join(" and ")}, or confirm in writing why it is not available.`,
        courtLine: toCourtLine(label),
        whyItMatters:
          "CAD extract is on file — chase the remaining 999 audio / full CAD print modalities only.",
        baseStatus: "Outstanding" as ChaseItemStatus,
      };
    })
    .filter((i): i is DisclosureChaseItem => i !== null);
}

/**
 * Pick a modality-true interview chase title from merged/provenance/bundle signals.
 * Never keep the slash-blend "Interview recording / transcript" identity when one
 * modality is already served or only one modality is outstanding.
 * Opposite: Tobin/Patel recording|transcript still surfaces when PDF establishes it.
 */
export function interviewChaseLabelFromSignals(blob: string): string {
  const hay = blob.toLowerCase();
  const transcriptServed =
    /transcript\s+state\s+served|transcript\s+(?:is\s+)?served|served\s+(?:full\s+)?(?:interview\s+)?transcript/.test(
      hay,
    );
  const recordingServed =
    /recording\s+state\s+served|recording\s+(?:is\s+)?served|served\s+(?:full\s+)?(?:interview\s+)?recording/.test(
      hay,
    );
  const transcriptOutstanding =
    /\b(?:full\s+)?(?:interview\s+)?transcript\b[^.\n]{0,48}\b(?:outstanding|not\s+served|not\s+attached|needed|incomplete)/.test(
      hay,
    ) ||
    /\b(?:outstanding|not\s+served|not\s+attached|needed)\b[^.\n]{0,48}\b(?:full\s+)?(?:interview\s+)?transcript\b/.test(
      hay,
    );
  const recordingOutstanding =
    /\b(?:full\s+)?(?:interview\s+)?recording\b[^.\n]{0,48}\b(?:outstanding|not\s+served|not\s+attached|needed|not\s+safely\s+confirmed)/.test(
      hay,
    ) ||
    /\b(?:outstanding|not\s+served|not\s+attached|needed|not\s+safely\s+confirmed)\b[^.\n]{0,48}\b(?:full\s+)?(?:interview\s+)?recording\b/.test(
      hay,
    ) ||
    /recording\s+state\s+not\s+safely\s+confirmed/.test(hay);

  const mentionsTranscript = /\btranscript\b/.test(hay);
  const mentionsRecording = /\brecording\b|\binterview\s+audio\b|\binterview\s+video\b/.test(hay);

  if (transcriptServed && (recordingOutstanding || mentionsRecording) && !recordingServed) {
    return "Interview recording";
  }
  if (recordingServed && (transcriptOutstanding || mentionsTranscript) && !transcriptServed) {
    return "Interview transcript";
  }
  if (transcriptOutstanding && !recordingOutstanding && !mentionsRecording) {
    return "Interview transcript";
  }
  if (recordingOutstanding && !transcriptOutstanding && !mentionsTranscript) {
    return "Interview recording";
  }
  if (
    (recordingOutstanding || mentionsRecording) &&
    (transcriptOutstanding || mentionsTranscript) &&
    !transcriptServed &&
    !recordingServed
  ) {
    return "Interview recording and transcript";
  }
  if (mentionsTranscript && !mentionsRecording) return "Interview transcript";
  if (mentionsRecording && !mentionsTranscript) return "Interview recording";
  return "Interview recording";
}

/**
 * Split interview summary≠recording≠transcript on Chase cards.
 * Drop summary-only invent; drop recording invent unless PDF establishes recording modality
 * (PACE interview / custody alone must not become "Interview recording").
 * Keep recording/transcript when PDF-established.
 */
export function reconcileInterviewModalityItems(
  items: DisclosureChaseItem[],
  bundleText?: string | null,
): DisclosureChaseItem[] {
  const hay = `${bundleText ?? ""}`;
  return items
    .map((item) => {
      if (item.familyId !== "interview") return item;
      const blob = [
        item.label,
        ...(item.mergedFrom ?? []),
        item.evidenceAnchor ?? "",
        item.whyItMatters ?? "",
        item.provenance?.unresolvedConflictOrLimitation ?? "",
        hay,
      ].join("\n");

      // Summary alone must never become a recording/transcript chase.
      const summaryOnly =
        /\b(interview\s+summary|custody\s*\/\s*interview\s+summary|summary\s+only)\b/i.test(blob) &&
        !/\b(interview\s+recording|interview\s+transcript|recording|transcript|audio|video)\b/i.test(
          blob.replace(/\binterview\s+summary\b/gi, " "),
        );
      if (summaryOnly) return null;

      // Thin-file invent (Trap): no PACE recording/transcript established on papers.
      // Evaluate source hay only — do not treat the chase card's own blend label as establishment.
      const sourceHay = `${bundleText ?? ""}`;
      const provenanceHay = item.provenance?.unresolvedConflictOrLimitation ?? "";
      const modalityHay = `${sourceHay}\n${provenanceHay}`;
      const thinFileNoPace =
        /\bno\s+pace\s+interview\b/i.test(sourceHay) ||
        /\bno\s+(?:pace\s+)?interview\s+(?:transcript|summary|recording)\b/i.test(sourceHay);
      const sourceEstablishesRecordingOrTranscript =
        isInterviewRecordingEstablished(modalityHay) || isInterviewTranscriptEstablished(modalityHay);
      if (thinFileNoPace && !sourceEstablishesRecordingOrTranscript) return null;

      const labelClaimsRecording =
        /\binterview\s+recording\b/i.test(item.label) ||
        /\brecording\s*\/\s*transcript\b/i.test(item.label) ||
        (/^Interview recording$/i.test(item.label.trim()) &&
          !/\btranscript\b/i.test(item.label));

      // Court C0.5: PACE interview / custody without recording modality → never invent recording.
      // Use source + provenance only (never the card's own "Interview recording" label).
      if (labelClaimsRecording && !isInterviewRecordingEstablished(modalityHay)) {
        if (isInterviewTranscriptEstablished(modalityHay)) {
          return {
            ...item,
            label: "Interview transcript",
            draftChaseWording:
              "Please provide the interview transcript, or confirm in writing why it is not available.",
            courtLine: toCourtLine("Interview transcript"),
            whyItMatters:
              "Interview summary or partial record on file is not a substitute for the full transcript.",
            mergedFrom: [
              "Interview transcript",
              ...((item.mergedFrom ?? []).filter((m) =>
                /\btranscript\b/i.test(m) && !/\brecording\b/i.test(m),
              )),
            ].slice(0, 4),
          };
        }
      if (
        /\b(?:pace\s+interview|custody\s+record|detention\s+log|safeguards?\s+checklist)\b/i.test(
          sourceHay,
        )
      ) {
          if (!isFullCustodyRecordOutstanding(sourceHay)) return null;
          return {
            ...item,
            label: "Full custody record / PACE material",
            draftChaseWording:
              "Please provide the full custody record, detention log, risk assessment and safeguards checklist, or confirm why any item is unavailable.",
            courtLine: toCourtLine("Full custody record / PACE material"),
            whyItMatters:
              "Custody/PACE material is referred to in limited form — chase the full record before assessing safeguards or interview fairness.",
          };
        }
        return null;
      }

      const label = interviewChaseLabelFromSignals(blob);
      if (label === item.label && !/recording\s*\/\s*transcript/i.test(item.label)) return item;

      // interviewChaseLabelFromSignals may still default to "Interview recording" —
      // re-check establishment before keeping that invent surface.
      if (/\binterview\s+recording\b/i.test(label) && !isInterviewRecordingEstablished(modalityHay)) {
        if (isInterviewTranscriptEstablished(modalityHay)) {
          return {
            ...item,
            label: "Interview transcript",
            draftChaseWording:
              "Please provide the interview transcript, or confirm in writing why it is not available.",
            courtLine: toCourtLine("Interview transcript"),
            whyItMatters:
              "Interview summary or partial record on file is not a substitute for the full transcript.",
            mergedFrom: [
              "Interview transcript",
              ...((item.mergedFrom ?? []).filter((m) =>
                /\btranscript\b/i.test(m) && !/\brecording\b/i.test(m),
              )),
            ].slice(0, 4),
          };
        }
        return null;
      }

      return {
        ...item,
        label,
        draftChaseWording: `Please provide the ${label.toLowerCase()}, or confirm in writing why it is not available.`,
        courtLine: toCourtLine(label),
        whyItMatters:
          /transcript/i.test(label) && /recording/i.test(label)
            ? "Interview summary on file is not a substitute for the recording and transcript modalities."
            : /transcript/i.test(label)
              ? "Interview summary or partial record on file is not a substitute for the full transcript."
              : "Interview summary on file is not a substitute for the interview recording.",
      };
    })
    .filter((i): i is DisclosureChaseItem => i !== null);
}

/**
 * Phone mid-state (logical/summary/referenced-only) must surface without inventing a
 * full Brookes-style download chase, and without inventing download from property-phone.
 * Opposite: Brookes full download outstanding TP; Arden property-phone TN.
 */
export function reconcilePhoneDownloadModalityItems(
  items: DisclosureChaseItem[],
  bundleText?: string | null,
): DisclosureChaseItem[] {
  const hay = `${bundleText ?? ""}`;
  const explicitlyNoDigitalExtraction =
    /\bno\s+(?:phone\s+extraction|phone\s+download|download\s+report|source\s+export|device\s+download|digital\s+extraction|subscriber\s+material)\b/i.test(
      hay,
    ) ||
    /\b(?:phone\s+extraction|phone\s+download|download\s+report|source\s+export|device\s+download|digital\s+extraction|subscriber\s+material)\b[^.\n]{0,80}\b(?:not\s+identified|not\s+referred|not\s+mentioned|not\s+on\s+(?:the\s+)?papers)\b/i.test(
      hay,
    );
  const midState =
    !explicitlyNoDigitalExtraction &&
    (/logical\s+download\s+summary/i.test(hay) ||
      /\bphone\s+download\s+reference\s+referenced\s+only\b/i.test(hay) ||
      /\breferenced\s+only\b[^.\n]{0,40}\bphone\s+download\b/i.test(hay) ||
      /extraction\s+summary\s+only/i.test(hay) ||
      // Glued PDF: "summary onlyFull report not in this section"
      /full\s+report\s+not\s+in\s+(?:the\s+|this\s+)?section/i.test(hay) ||
      /download\s+report\s*summary/i.test(hay));

  const fullOutstanding =
    !explicitlyNoDigitalExtraction &&
    (/\b(?:full\s+)?phone\s+download\b[^.\n]{0,48}\b(?:outstanding|not\s+served|not\s+attached|expressly|referred)\b/i.test(
      hay,
    ) ||
      // Glued: phone extractionOutstanding / full phone extractionOutstandingnot
      /\b(?:full\s+)?phone\s+extraction\s*(?:outstanding|not\s+served|not\s+attached|not\s+yet)/i.test(hay) ||
      /\b(?:full\s+)?phone\s+extraction\b[^.\n]{0,48}\b(?:outstanding|not\s+served|not\s+attached|not\s+yet|referred)\b/i.test(
        hay,
      ) ||
      /\bphone\s+download\s*\/\s*source\s+export\b/i.test(hay) ||
      /\bsource\s+export\b[\s\S]{0,64}\b(?:outstanding|not\s+served|not\s+attached|referred)\b/i.test(hay) ||
      /\b(?:outstanding|not\s+served|not\s+attached|referred)\b[\s\S]{0,64}\bsource\s+export\b/i.test(hay) ||
      /\bsource\s+export\s+outstanding\b/i.test(hay) ||
      /\boriginal\s+download\b[^.\n]{0,40}\b(?:outstanding|not\s+served)\b/i.test(hay));

  const propertyPhone = /\b(?:stolen|recovered|seized)\s+phone\b/i.test(hay);
  // Affirmative digital-download family (not mere negation wording like "no phone download").
  const downloadFamilyAffirmed =
    !explicitlyNoDigitalExtraction &&
    (midState ||
      fullOutstanding ||
      /\b(?:phone\s+download|source\s+export|phone\s+extraction|logical\s+download)\b[^.\n]{0,48}\b(?:outstanding|not\s+served|not\s+attached|referred|summary|referenced\s+only)\b/i.test(
        hay,
      ));

  const out = items.map((item) => {
    // Item-local only — never let full-bundle hay reclassify CAD/interview cards as phone.
    const itemBlob = [item.label, ...(item.mergedFrom ?? []), item.evidenceAnchor ?? ""].join("\n");
    const isPhoneish =
      /\b(?:phone\s+download|source\s+export|phone\s+extraction|logical\s+download|device\s+download)\b/i.test(
        itemBlob,
      ) ||
      // Brookes live: harassment playbook "Message export / source device material" stands in
      // for the PDF-true phone download gap until inject rewrites it.
      (fullOutstanding &&
        /\b(?:message\s+export|source\s+device\s+material|whatsapp\s+export|full\s+message\s+export)\b/i.test(
          itemBlob,
        ));
    if (!isPhoneish) return item;

    // Arden-like: property phone alone must not invent a download chase.
    if (propertyPhone && !downloadFamilyAffirmed) {
      return null;
    }

    // Playbook / MG6 "phone download" seed without download-family establishment
    // (SIM/IMEI/subscriber alone) must not become a Full phone download card.
    if (!downloadFamilyAffirmed && !midState && !fullOutstanding) {
      return null;
    }

    if (midState && !fullOutstanding) {
      const label = "Phone extraction summary only — full download report not in section";
      return {
        ...item,
        label,
        familyId: item.familyId === "other" ? item.familyId : item.familyId,
        draftChaseWording:
          "Please confirm whether a full phone download / source export exists beyond the logical/summary note on file, or confirm in writing why it is not available.",
        courtLine: toCourtLine(label),
        whyItMatters:
          "A logical download summary or referenced-only note is not a full phone download report.",
        baseStatus: "Not safely confirmed" as ChaseItemStatus,
      };
    }

    if (fullOutstanding || /\bfull\s+phone\s+download\b/i.test(item.label)) {
      const label = "Full phone download / source extraction";
      return {
        ...item,
        label,
        // Keep modality identity tight so finalize cannot overflow-merge into Other.
        mergedFrom: [
          label,
          ...((item.mergedFrom ?? []).filter((m) =>
            /\b(?:phone\s+download|source\s+export|phone\s+extraction|logical\s+download|original\s+download)\b/i.test(
              m,
            ),
          )),
        ].slice(0, 4),
        draftChaseWording:
          "Please provide the full phone download / source export, or confirm in writing why it is not available.",
        courtLine: toCourtLine(label),
      };
    }

    return item;
  });

  const filtered = out.filter((i): i is DisclosureChaseItem => i !== null);

  // Inject mid-state card when bundle establishes it but no phoneish chase exists yet.
  if (midState && !fullOutstanding && !(propertyPhone && !downloadFamilyAffirmed)) {
    const hasPhone = filtered.some((i) =>
      /\b(?:phone\s+download|phone\s+extraction|logical\s+download|source\s+export)\b/i.test(
        `${i.label} ${(i.mergedFrom ?? []).join(" ")}`,
      ),
    );
    if (!hasPhone) {
      const label = "Phone extraction summary only — full download report not in section";
      filtered.push({
        id: "chase-phone-midstate",
        familyId: "other",
        label,
        whyItMatters:
          "A logical download summary or referenced-only note is not a full phone download report.",
        source: "Crown / disclosure officer (confirm on file)",
        baseStatus: "Not safely confirmed",
        urgency: "medium",
        deadlineLabel: "Before next hearing",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording:
          "Please confirm whether a full phone download / source export exists beyond the logical/summary note on file, or confirm in writing why it is not available.",
        courtLine: toCourtLine(label),
        mergedFrom: ["Phone download mid-state on papers"],
      });
    }
  }

  // Brookes-style: papers expressly establish full download outstanding but no chase card yet.
  if (fullOutstanding && !(propertyPhone && !downloadFamilyAffirmed)) {
    const hasFull = filtered.some((i) => /Full phone download/i.test(i.label));
    if (!hasFull) {
      const label = "Full phone download / source extraction";
      filtered.push({
        id: "chase-phone-full-outstanding",
        familyId: "other",
        label,
        whyItMatters:
          "Original download / source export is outstanding on the disclosure papers.",
        source: "Crown / disclosure officer (confirm on file)",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "Before next hearing",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording:
          "Please provide the full phone download / source export, or confirm in writing why it is not available.",
        courtLine: toCourtLine(label),
        mergedFrom: ["Phone download / source extraction status unresolved on papers"],
      });
    }
  }

  return filtered;
}

/**
 * Subscriber both-ways: surface when PDF establishes outstanding subscriber/account data;
 * never invent from thin-file "assuming"/SIM noise alone.
 * Opposite: Brookes/Ahmed TP; Trap invent TN.
 */
export function reconcileSubscriberModalityItems(
  items: DisclosureChaseItem[],
  bundleText?: string | null,
): DisclosureChaseItem[] {
  const hay = `${bundleText ?? ""}`;
  // Allow newline-separated schedule cells (Ahmed: "phone subscriber data\noutstanding\nnot attached").
  // Reverse path requires subscriber report/return/data so "Not served … Subscriber" index noise (Grant) does not invent.
  const establishedOutstanding =
    /\b(?:phone\s+)?subscriber(?:\s+report|\s+return|\s+data)?\b[\s\S]{0,48}\b(?:outstanding|not\s+served|not\s+attached|not\s+complete|incomplete)/i.test(
      hay,
    ) ||
    /\b(?:outstanding|not\s+served|not\s+attached)\b[\s\S]{0,48}\b(?:phone\s+)?subscriber(?:\s+report|\s+return|\s+data)\b/i.test(
      hay,
    );

  const filtered = items
    .map((item) => {
      const blob = [item.label, ...(item.mergedFrom ?? []), item.evidenceAnchor ?? ""].join("\n");
      // Do not treat bare SIM noise inside unrelated prose as subscriber identity.
      const isSubscriber =
        /\bsubscriber\b|\baccount\s+data\b|\bphone\s+attribution\b|\bhandset\s+attribution\b|\bsim\s*(?:\/|&)?\s*imei\b|\bimei\b/i.test(
          blob,
        );
      if (!isSubscriber) return item;
      // Keep phone-download modality distinct — never rewrite Full phone download into Subscriber
      // when one schedule line mentions both (Brookes: download + subscriber report not served).
      if (
        /full\s+phone\s+download|phone\s+extraction\s+summary\s+only|phone\s+download\s*\/\s*source\s+extraction/i.test(
          item.label,
        )
      ) {
        return item;
      }
      // Never keep a subscriber chase unless papers affirmatively establish it.
      if (!establishedOutstanding) return null;
      const label = "Subscriber / account data";
      return {
        ...item,
        label,
        draftChaseWording:
          "Please provide the subscriber / account data, or confirm in writing why it is not available.",
        courtLine: toCourtLine(label),
        whyItMatters:
          "Screenshots or partial extraction alone do not prove subscriber attribution.",
        baseStatus: "Outstanding" as ChaseItemStatus,
      };
    })
    .filter((i): i is DisclosureChaseItem => i !== null);

  if (establishedOutstanding) {
    const hasSub = filtered.some((i) => /\bsubscriber\b|\baccount\s+data\b/i.test(i.label));
    if (!hasSub) {
      const label = "Subscriber / account data";
      filtered.push({
        id: "chase-subscriber-outstanding",
        familyId: "other",
        label,
        whyItMatters:
          "Screenshots or partial extraction alone do not prove subscriber attribution.",
        source: "Crown / disclosure officer (confirm on file)",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "Before next hearing",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording:
          "Please provide the subscriber / account data, or confirm in writing why it is not available.",
        courtLine: toCourtLine(label),
        mergedFrom: ["Subscriber / account data outstanding on papers"],
      });
    }
  }

  return filtered;
}

export function reconcileMedicalReportModalityItems(
  items: DisclosureChaseItem[],
  bundleText?: string | null,
): DisclosureChaseItem[] {
  const hay = `${bundleText ?? ""}`;
  const finalReportOutstanding =
    /\b(?:medical\s*\/\s*forensic\s+note|medical\s+note|forensic\s+note|injury\s+note)\b[\s\S]{0,120}\bfinal\s+report\s+(?:not\s+included|outstanding|not\s+attached|not\s+served)/i.test(
      hay,
    ) ||
    /\bfinal\s+(?:medical\s*\/\s*forensic\s+)?report\b[\s\S]{0,80}\b(?:not\s+included|outstanding|not\s+attached|not\s+served)/i.test(
      hay,
    );

  const filtered = items.map((item) => {
    if (item.familyId !== "medical_expert") return item;
    if (!finalReportOutstanding) return item;
    return finalMedicalForensicReportItem(item);
  });

  if (!finalReportOutstanding) return filtered;
  const hasFinal = filtered.some((item) => /final\s+medical\s*\/\s*forensic\s+report/i.test(item.label));
  if (hasFinal) return filtered;

  filtered.push({
    id: "chase-final-medical-forensic-report",
    familyId: "medical_expert",
    label: "Final medical/forensic report",
    whyItMatters:
      "A short note is not a final report — keep the requested material limited to the report the source actually identifies.",
    source: "Crown / disclosure officer (confirm on file)",
    baseStatus: "Outstanding",
    urgency: "medium",
    deadlineLabel: "Before next hearing",
    evidenceAnchor: "Medical / forensic note: final report not included",
    linkedRoute: null,
    draftChaseWording:
      "Please provide the final medical/forensic report, or confirm in writing why it is not available.",
    courtLine: toCourtLine("Final medical/forensic report"),
    mergedFrom: ["Final medical/forensic report not included"],
  });
  return filtered;
}

function dropGenericFurtherPapersWhenSpecificItemsExist(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  const hasSpecific = items.some(
    (item) =>
      !/^Further papers on the file$/i.test(item.label) &&
      !/^Outstanding source material/i.test(item.label) &&
      !/^Further papers issue/i.test(item.label),
  );
  if (!hasSpecific) return items;
  return items.filter(
    (item) =>
      !/^Further papers on the file$/i.test(item.label) &&
      !/^Further papers issue/i.test(item.label),
  );
}

function mapMaterialStatusToSharedState(status: string): EvidenceStateRow["state"] {
  switch (status) {
    case "served":
      return "served";
    case "referred_only":
      return "referred_only";
    case "partial":
    case "draft":
    case "unsigned":
      return "incomplete";
    case "outstanding":
    case "absent":
      return "missing";
    default:
      return "not_safely_confirmed";
  }
}

export type DisclosureChaseCounters = {
  total: number;
  overdue: number;
  dueSoon: number;
  chased: number;
  received: number;
  notStarted: number;
};

export type DisclosureChaseBrief = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  bundleHealth: string;
  positionStatus: string;
  disclosureSummary: string;
  safeCourtLine: string;
  /** All deduped items (for filters/counters). */
  items: DisclosureChaseItem[];
  /** Top priority items shown by default (max {@link DISCLOSURE_CHASE_PRIMARY_CAP}). */
  primaryItems: DisclosureChaseItem[];
  /** Lower-priority / misc grouped items. */
  additionalItems: DisclosureChaseItem[];
  linkedRoutes: string[];
  counters: DisclosureChaseCounters;
  hearingDeadlineNote: string | null;
  sourceTruthGuardian?: SourceTruthGuardianReport;
};

export type BuildDisclosureChaseBriefInput = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  hearingDateIso: string | null;
  bundleHealth: string;
  positionStatus: string;
  battleboard: BattleboardOutput | null;
  snapshotMissing?: { label: string; status: string }[];
  proceduralOutstanding?: string[];
  bundleText?: string | null;
  profileHint?: import("@/lib/criminal/pilot-workflow").WorkflowProfile | null;
  briefPlan?: CriminalBriefPlan | null;
  /** Live canonical findings (referenced-absent etc.) feed chase / provenance. */
  canonicalFindings?: Array<{
    kind: string;
    title: string;
    summary: string;
    unresolved: boolean;
    provenanceLine: string;
    referencedAbsent?: { referencedLabel: string } | null;
  }>;
  /** Evidence rows derived from document/page units — used for served-alias suppression. */
  canonicalEvidenceRows?: EvidenceStateRow[];
};

function normalizeRawLabel(raw: string): string {
  const materialLabel = materialLabelFromCourtLine(raw);
  return formatDisplayLabelCasing(
    materialLabel
      .replace(/^chase[:\s]*/i, "")
      .replace(/^outstanding[:\s]*/i, "")
      .trim(),
  );
}

function materialLabelFromCourtLine(raw: string): string {
  const t = raw.trim();
  const courtMatch = t.match(
    /^\s*(?:the\s+defence\s+asks\s+the\s+court\s+to\s+record|ask\s+the\s+court\s+to\s+record)\s+that\s+(.+?)(?:\s+(?:remains?|remain|appears?|appear|should|must|is|are)\b|[.;]|$)/i,
  );
  if (!courtMatch?.[1]) return t;
  return courtMatch[1].replace(/^the\s+/i, "").trim();
}

function isUnsafeOrNonMaterialChaseLine(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  if (FORBIDDEN_RE.test(t)) return true;
  return /\b(win conditions?|case collapses|prosecution case collapses|crown case collapses|will be acquitted)\b/i.test(t) ||
    /\brecord what (?:pwits|robbery|fraud|violence) source material remains outstanding\b/i.test(t) ||
    /\bprepare hearing line\b/i.test(t) ||
    /^\s*(?:primary strategy|fight charge|charge reduction|defence strategy|skeleton argument)\b/i.test(t) ||
    /^\s*(?:#{1,6}\s|={2,}\s*section:|\*\*?(?:statement|particulars|bail|witness|status|relevance|timetable)\b|\|?\s*\d+\s*\|)/i.test(t) ||
    /\b(?:statement|particulars) of offence\b/i.test(t);
}

function isWrongFamilyChaseLineForPlan(raw: string, profile: CriminalBriefPlan["profile"]): boolean {
  const t = raw.toLowerCase();
  if (profile !== "drugs_pwits" && /\b(pwits|intent to supply|drug continuity|drug\/cash|search bwv)\b/i.test(t)) {
    return true;
  }
  if (
    profile !== "fraud_account" &&
    /\b(fraud\/account[-\s]?control|account[-\s]?control route|banking schedules, device extraction|account[-\s]?ownership material|bank\/device\/source material)\b/i.test(t)
  ) {
    return true;
  }
  if (profile !== "robbery_id" && /\b(record what robbery|robbery identification route|robbery id)\b/i.test(t)) {
    return true;
  }
  return false;
}

function filterSafeChaseLabels(labels: string[], profile: CriminalBriefPlan["profile"]): string[] {
  return labels.filter((label) => {
    const normalized = normalizeRawLabel(label);
    return !isUnsafeOrNonMaterialChaseLine(normalized) && !isWrongFamilyChaseLineForPlan(normalized, profile);
  });
}

function classifyFamily(text: string): ChaseFamilyId {
  const t = text.toLowerCase();
  // Prefer explicit interview recording/transcript modality over custody/PACE lump when both
  // appear in the same ledger/plan line (Court C1 opposite: recording outstanding must surface).
  if (
    /\b(interview\s+recording|interview\s+transcript|interview\s+audio|interview\s+video|recording\s*\/\s*transcript)\b/.test(
      t,
    )
  ) {
    return "interview";
  }
  for (const fam of CHASE_FAMILIES) {
    if (fam.match(t)) return fam.id;
  }
  return "other";
}

const CHASE_FAMILY_TO_GATE_FAMILIES: Partial<Record<ChaseFamilyId, ChaseGateFamily[]>> = {
  cctv_master: ["cctv"],
  cctv_continuity: ["cctv"],
  cad_999: ["cad_999"],
  bwv: ["bwv"],
  custody_pace: ["custody_pace"],
  interview: ["interview"],
  mg6_unused: ["mg6_unused"],
  medical_expert: ["medical"],
};

export function disclosureChaseAnchorMatchesFamily(
  familyId: ChaseFamilyId,
  anchor: string | null | undefined,
): boolean {
  const text = anchor?.trim();
  if (!text || isAdminGuidanceLine(text)) return false;
  if (familyId === "other") return true;

  const expected = CHASE_FAMILY_TO_GATE_FAMILIES[familyId];
  const mentioned = familiesInText(text);

  if (expected?.length) {
    return mentioned.some((family) => expected.includes(family));
  }

  if (familyId === "exhibit_provenance") {
    return (
      /\b(exhibit|provenance|mapping|continuity)\b/i.test(text) &&
      !mentioned.some((family) => ["phone", "bank_financial", "medical", "interview"].includes(family))
    );
  }

  return mentioned.length === 0;
}

function familySafeEvidenceAnchor(
  familyId: ChaseFamilyId,
  anchor: string | null | undefined,
): string | null {
  if (!anchor?.trim()) return null;
  return disclosureChaseAnchorMatchesFamily(familyId, anchor) ? anchor : null;
}

function getFamilyDef(id: ChaseFamilyId): FamilyDef {
  if (id === "other") {
    return {
      id: "other",
      label: "Additional source-material issue",
      source: "Crown / disclosure officer (confirm on file)",
      priority: 99,
      match: () => true,
    };
  }
  return CHASE_FAMILIES.find((f) => f.id === id)!;
}

function daysUntilHearing(iso: string | null, asOf: Date = new Date()): number | null {
  if (!iso?.trim()) return null;
  const calendar = iso.trim().slice(0, 10);
  return utcDayDiff(asOf, calendar);
}

type DeadlineContext = {
  days: number | null;
  sharedLabel: string;
  hearingDeadlineNote: string | null;
  urgency: "high" | "medium" | "low";
  baseStatus: ChaseItemStatus;
};

/**
 * Chase operational deadline labels — listing status stays on the header via
 * resolveSolicitorHearingStatus. Do not reuse "Hearing date passed · …" as if
 * the listing date were a CPIA/disclosure ops deadline.
 */
function resolveDeadlineContext(days: number | null, hearingIso?: string | null, asOf: Date = new Date()): DeadlineContext {
  if (days === null) {
    return {
      days: null,
      sharedLabel: "Before next listing — confirm disclosure timetable",
      hearingDeadlineNote: "Hearing date not safely extracted — chase deadlines are provisional.",
      urgency: "medium",
      baseStatus: "Not safely confirmed",
    };
  }
  if (hearingIso?.trim()) {
    const status = resolveSolicitorHearingStatus({
      bundleNextHearingIso: hearingIso.trim().slice(0, 10),
      asOf,
    });
    if (status.kind === "same_day") {
      return {
        days,
        sharedLabel: "Same-day listing — chase before hearing",
        hearingDeadlineNote: null,
        urgency: "high",
        baseStatus: "Due soon",
      };
    }
    if (status.kind === "passed") {
      return {
        days,
        sharedLabel: "Listing on papers elapsed — confirm next listing / chase outstanding disclosure",
        hearingDeadlineNote: null,
        urgency: "high",
        baseStatus: "Overdue",
      };
    }
    if (status.kind === "upcoming" || status.kind === "listed") {
      return {
        days,
        sharedLabel: days <= 14 ? "Chase before listed hearing" : "Before next listing",
        hearingDeadlineNote: null,
        urgency: days <= 3 ? "high" : days <= 14 ? "medium" : "low",
        baseStatus: days <= 14 ? "Due soon" : "Outstanding",
      };
    }
  }
  if (days < 0) {
    return {
      days,
      sharedLabel: "Listing on papers elapsed — confirm next listing / chase outstanding disclosure",
      hearingDeadlineNote: null,
      urgency: "high",
      baseStatus: "Overdue",
    };
  }
  if (days === 0) {
    return {
      days,
      sharedLabel: "Same-day listing — chase before hearing",
      hearingDeadlineNote: null,
      urgency: "high",
      baseStatus: "Due soon",
    };
  }
  if (days <= 3) {
    return {
      days,
      sharedLabel: `Chase within ${days} day(s) of listing`,
      hearingDeadlineNote: null,
      urgency: "high",
      baseStatus: "Due soon",
    };
  }
  if (days <= 7) {
    return {
      days,
      sharedLabel: `Chase within ${days} days of listing`,
      hearingDeadlineNote: null,
      urgency: "medium",
      baseStatus: "Due soon",
    };
  }
  return {
    days,
    sharedLabel: "Before next listing",
    hearingDeadlineNote: null,
    urgency: "low",
    baseStatus: "Outstanding",
  };
}

function routeType(bb: BattleboardOutput | null): BattleboardRouteType | null {
  return bb?.primary_route?.route_type ?? null;
}

function inferWhyItMatters(
  familyId: ChaseFamilyId,
  battleboard: BattleboardOutput | null,
  mergedFrom: string[],
): string {
  const rt = routeType(battleboard);
  const primaryTitle = battleboard?.primary_route?.title;
  const routeHint = primaryTitle ? ` (linked to route: ${primaryTitle})` : "";

  switch (familyId) {
    case "cctv_master":
      if (rt === "timeline")
        return `On this file, timing/sequence may turn on served CCTV — full window/master footage is not safely confirmed on the current papers${routeHint}.`;
      if (rt === "identity")
        return `Identification issues on this file may depend on served CCTV — master footage not safely confirmed${routeHint}.`;
      return `CCTV full window/master footage is not safely confirmed on the current papers — may bear on timing or identification once served${routeHint}.`;
    case "cctv_continuity":
      return `Continuity/provenance for CCTV may need to be established before any account is safely fixed${routeHint}.`;
    case "cad_999":
      if (rt === "timeline")
        return `CAD/999 material may bear on deployment and timing on this file — not safely confirmed until served${routeHint}.`;
      return `CAD/999 material may assist sequence analysis if timing is in issue; keep the request to the modality identified by the source${routeHint}.`;
    case "bwv":
      return `Officer BWV may bear on interaction at scene — not safely confirmed on the current papers until served footage is on file${routeHint}.`;
    case "custody_pace":
      return `Custody/PACE material is referred to in limited form — chase the full record before assessing safeguards or interview fairness${routeHint}.`;
    case "interview":
      if (rt === "interview")
        return `Interview recording/transcript needed to check account against MG5/MG6 before fixing hearing line${routeHint}.`;
      return `Interview material is not safely confirmed on the current papers — needed to test account against served prosecution material${routeHint}.`;
    case "mg6_unused":
      return `MG6/unused clarification may affect disclosure fairness and route viability — solicitor review required${routeHint}.`;
    case "medical_expert":
      if (rt === "causation")
        return `Medical/expert source may bear on causation on this file — not safely confirmed until served${routeHint}.`;
      return `Medical/expert material is not safely confirmed on the current papers — relevance depends on charge and served reports${routeHint}.`;
    case "exhibit_provenance":
      return `Exhibit mapping/provenance may need to be confirmed before exhibits are relied upon in court${routeHint}.`;
    case "other": {
      const preview = mergedFrom.slice(0, 2).join("; ");
      return preview
        ? `Additional source-material points appear on file (${preview}) — not safely confirmed until reviewed.`
        : "Additional source-material appears on the current file — solicitor to confirm relevance.";
    }
  }
}

function toCourtLine(canonicalLabel: string): string {
  const titleGate = assertSafeEvidenceTitle(canonicalLabel);
  const core = titleGate.safeTitle?.trim() ?? "";
  if (!core || FORBIDDEN_RE.test(core)) {
    const fallback = composeStructuredSolicitorOutput({
      subject: "outstanding source material on the disclosure schedule",
      evidenceState: "not_safely_confirmed",
      sourceEvidenceId: stableEvidenceId("outstanding source material on the disclosure schedule", "not_safely_confirmed"),
      kind: "court_line",
      safetyQualification: "Solicitor review required before addressing the court.",
    });
    return (
      fallback.text ??
      `${COURT_RECORD_PREFIX} that outstanding source material remains on the disclosure schedule and should be timetabled.`
    );
  }
  const boundary = buildExtractionProvenanceBlock({
    evidenceTitle: core,
    evidenceStatus: "missing",
    sourceEvidenceId: stableEvidenceId(core, "missing"),
  });
  const composed = composeStructuredSolicitorOutput({
    subject: boundary.block.evidenceTitle,
    evidenceState: "missing",
    sourceEvidenceId: boundary.block.sourceEvidenceId,
    kind: "court_line",
    safetyQualification: "Solicitor review required before addressing the court.",
  });
  if (composed.ok && composed.text) return composed.text;
  return `${COURT_RECORD_PREFIX} that ${core.charAt(0).toLowerCase()}${core.slice(1)} needs confirmation on the current file and should be disclosed on a timetable if it has not already been served.`;
}

function draftChaseWording(canonicalLabel: string, mergedFrom: string[]): string {
  const titleGate = assertSafeEvidenceTitle(canonicalLabel);
  const provision =
    titleGate.safeTitle?.trim() || materialLabelFromCourtLine(canonicalLabel);
  const boundary = buildExtractionProvenanceBlock({
    evidenceTitle: provision,
    evidenceStatus: "missing",
    generatedExplanation:
      mergedFrom.length > 1
        ? "Multiple related source notes appear on file — confirm each item before reliance."
        : "Material requires confirmation on the current file and may be relevant to preparation.",
    requestedAction: `Please provide ${provision.toLowerCase()}, or confirm whether it is already served or unavailable. This material requires confirmation on the current file and may be relevant to preparation — conditional on what is ultimately served.`,
    sourceEvidenceId: stableEvidenceId(provision, "missing"),
    displayLabels: mergedFrom,
  });
  // Never pipe-join or punctuation-join arbitrary merged bullets into the prose.
  // Alias-deduped labels stay in displayLabels; explanation/action remain separate fields until render.
  const composed = composeStructuredSolicitorOutput({
    subject: boundary.block.evidenceTitle ?? provision,
    evidenceState: "missing",
    sourceEvidenceId: boundary.block.sourceEvidenceId,
    kind: "cps_chase",
    whyItMatters: boundary.block.generatedExplanation,
    requestedAction: boundary.block.requestedAction,
    safetyQualification: "Solicitor review required before sending.",
  });
  if (composed.ok && composed.text) return composed.text;
  return `Please provide ${provision.toLowerCase()}, or confirm whether it is already served or unavailable. This material requires confirmation on the current file and may be relevant to preparation — conditional on what is ultimately served.`;
}

function findLinkedRoute(
  familyId: ChaseFamilyId,
  battleboard: BattleboardOutput | null,
): string | null {
  if (!battleboard) return null;
  const typeMap: Partial<Record<ChaseFamilyId, BattleboardRouteType[]>> = {
    cctv_master: ["timeline", "identity"],
    cctv_continuity: ["continuity", "timeline"],
    cad_999: ["timeline"],
    custody_pace: ["interview"],
    interview: ["interview"],
    mg6_unused: ["disclosure"],
    medical_expert: ["causation"],
  };
  const want = typeMap[familyId];
  if (want?.length) {
    for (const route of battleboard.routes) {
      if (want.includes(route.route_type)) return route.title;
    }
  }
  return battleboard.primary_route?.title ?? null;
}

const LEDGER_ANCHOR_FAMILIES = new Set<ChaseFamilyId>([
  "cctv_master",
  "cctv_continuity",
  "cad_999",
  "bwv",
  "custody_pace",
  "interview",
  "mg6_unused",
  "medical_expert",
  "exhibit_provenance",
]);

function findEvidenceAnchor(
  familyId: ChaseFamilyId,
  mergedFrom: string[],
  battleboard: BattleboardOutput | null,
  ledger: BundleTruthLedger | null,
): string | null {
  if (ledger) {
    const fromLedger = ledgerAnchorForChaseFamily(familyId, ledger);
    const safeLedgerAnchor = familySafeEvidenceAnchor(familyId, fromLedger);
    if (safeLedgerAnchor) return safeLedgerAnchor;
    if (LEDGER_ANCHOR_FAMILIES.has(familyId)) return null;
  }

  if (!battleboard) return null;
  const needles = mergedFrom.map((m) => m.toLowerCase());
  for (const route of battleboard.routes) {
    for (const a of route.evidence_anchors ?? []) {
      if (isAdminGuidanceLine(a)) continue;
      const al = a.toLowerCase();
      if (
        familySafeEvidenceAnchor(familyId, a) &&
        needles.some((n) => n.length > 4 && (al.includes(n.slice(0, 12)) || n.includes(al.slice(0, 12))))
      ) {
        return formatDisplayLabelCasing(a);
      }
    }
  }
  if (LEDGER_ANCHOR_FAMILIES.has(familyId)) return null;
  const primary = battleboard.primary_route?.evidence_anchors?.[0];
  if (primary && !isAdminGuidanceLine(primary)) return formatDisplayLabelCasing(primary);
  return null;
}

function mergeOtherFamily(rawLabels: string[]): { label: string; mergedFrom: string[] } {
  if (rawLabels.length === 1) {
    const one = normalizeRawLabel(rawLabels[0]!);
    return {
      label: one.length > 60 ? "Additional source-material issue (see detail)" : one,
      mergedFrom: rawLabels,
    };
  }
  return {
    label: `Additional source-material issues (${rawLabels.length} on file)`,
    mergedFrom: rawLabels,
  };
}

function groupAndMergeLabels(
  rawLabels: string[],
  battleboard: BattleboardOutput | null,
  deadline: DeadlineContext,
  ledger: BundleTruthLedger | null,
): DisclosureChaseItem[] {
  const groups = new Map<ChaseFamilyId, string[]>();

  for (const raw of rawLabels) {
    const norm = normalizeRawLabel(raw);
    if (!norm || norm.length < 4 || isUnsafeOrNonMaterialChaseLine(norm)) continue;
    const familyId = classifyFamily(norm);
    const list = groups.get(familyId) ?? [];
    if (!list.some((x) => x.toLowerCase() === norm.toLowerCase())) {
      list.push(norm);
    }
    groups.set(familyId, list);
  }

  const items: DisclosureChaseItem[] = [];

  for (const fam of CHASE_FAMILIES) {
    const mergedFrom = groups.get(fam.id);
    if (!mergedFrom?.length) continue;
    groups.delete(fam.id);

    const def = fam;
    const mergedText = mergedFrom.join("; ");
    const canonical = canonicalLedgerMaterial(mergedText, fam.id);
    const echoLabel = canonical.label === formatDisplayLabelCasing(mergedText);
    const label = echoLabel ? def.label : canonical.label;
    const baseStatus: ChaseItemStatus =
      fam.id === "other" || mergedFrom.some((m) => /not safely|unknown|verify/i.test(m))
        ? "Not safely confirmed"
        : deadline.baseStatus;

    items.push({
      id: `chase-family-${fam.id}`,
      familyId: fam.id,
      label,
      whyItMatters: canonical.whyItMatters ?? inferWhyItMatters(fam.id, battleboard, mergedFrom),
      source: def.source,
      baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: findEvidenceAnchor(fam.id, mergedFrom, battleboard, ledger),
      linkedRoute: findLinkedRoute(fam.id, battleboard),
      draftChaseWording: canonical.draftChaseWording ?? draftChaseWording(label, mergedFrom),
      courtLine: toCourtLine(label),
      mergedFrom,
      provenance: chaseItemProvenance({
        label,
        source: def.source,
        baseStatus,
        evidenceAnchor: findEvidenceAnchor(fam.id, mergedFrom, battleboard, ledger),
      }),
    });
  }

  const otherLabels = groups.get("other") ?? [];
  groups.delete("other");
  if (otherLabels.length) {
    const { label, mergedFrom } = mergeOtherFamily(otherLabels);
    const evidenceAnchor = findEvidenceAnchor("other", mergedFrom, battleboard, ledger);
    items.push({
      id: "chase-family-other",
      familyId: "other",
      label,
      whyItMatters: inferWhyItMatters("other", battleboard, mergedFrom),
      source: getFamilyDef("other").source,
      baseStatus: "Not safely confirmed",
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor,
      linkedRoute: battleboard?.primary_route?.title ?? null,
      draftChaseWording: draftChaseWording(label, mergedFrom),
      courtLine: toCourtLine(label),
      mergedFrom,
      provenance: chaseItemProvenance({
        label,
        source: getFamilyDef("other").source,
        baseStatus: "Not safely confirmed",
        evidenceAnchor,
      }),
    });
  }

  for (const [, leftover] of groups) {
    if (!leftover.length) continue;
    const { label, mergedFrom } = mergeOtherFamily(leftover);
    const evidenceAnchor = findEvidenceAnchor("other", mergedFrom, battleboard, ledger);
    items.push({
      id: `chase-family-misc-${slugFromLabels(mergedFrom)}`,
      familyId: "other",
      label,
      whyItMatters: inferWhyItMatters("other", battleboard, mergedFrom),
      source: getFamilyDef("other").source,
      baseStatus: deadline.baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor,
      linkedRoute: null,
      draftChaseWording: draftChaseWording(label, mergedFrom),
      courtLine: toCourtLine(label),
      mergedFrom,
      provenance: chaseItemProvenance({
        label,
        source: getFamilyDef("other").source,
        baseStatus: deadline.baseStatus,
        evidenceAnchor,
      }),
    });
  }

  items.sort((a, b) => {
    const pa = CHASE_FAMILIES.find((f) => f.id === a.familyId)?.priority ?? 99;
    const pb = CHASE_FAMILIES.find((f) => f.id === b.familyId)?.priority ?? 99;
    return pa - pb;
  });

  return items;
}

/** Disclosure family → chase-source-gate family. "other"/exhibits can't be gated. */
const GATE_FAMILY_MAP: Partial<Record<ChaseFamilyId, ChaseGateFamily>> = {
  cctv_master: "cctv",
  cctv_continuity: "cctv",
  cad_999: "cad_999",
  bwv: "bwv",
  custody_pace: "custody_pace",
  interview: "interview",
  mg6_unused: "mg6_unused",
  medical_expert: "medical",
};

function confirmNoneDisclosureItem(
  item: DisclosureChaseItem,
  gateFamily: ChaseGateFamily,
): DisclosureChaseItem {
  if (/file indicates none exists/i.test(item.label)) {
    return {
      ...item,
      baseStatus: "Not safely confirmed",
      whyItMatters: confirmNoneLine(gateFamily),
      draftChaseWording: /confirm in writing that none exists/i.test(item.draftChaseWording ?? "")
        ? item.draftChaseWording
        : `The file indicates no ${familyDisplayName(gateFamily)} is available. Please confirm in writing that none exists and that no related logs or exports are held.`,
    };
  }
  const name = familyDisplayName(gateFamily);
  return {
    ...item,
    label: `${item.label} — file indicates none exists`,
    baseStatus: "Not safely confirmed",
    whyItMatters: confirmNoneLine(gateFamily),
    draftChaseWording: `The file indicates no ${name} is available. Please confirm in writing that none exists and that no related logs or exports are held.`,
    courtLine: `${COURT_RECORD_PREFIX} that the file indicates no ${name} exists; the defence position is reserved accordingly.`,
  };
}

function gateFamiliesForItem(item: DisclosureChaseItem): ChaseGateFamily[] {
  const mapped = GATE_FAMILY_MAP[item.familyId];
  if (mapped) return [mapped];
  const probe = `${item.label} ${item.draftChaseWording} ${item.whyItMatters}`;
  return familiesInText(probe);
}

function isCctvContinuityConfirmationOnly(bundleText: string): boolean {
  const hay = `${bundleText ?? ""}`;
  if (!/\bcctv\b/i.test(hay) || !/\bcontinuity\b/i.test(hay)) return false;
  const confirmationOnly =
    /\bcontinuity\s+of\s+cctv\s+sources\s*:\s*to\s+be\s+checked\b/i.test(hay) ||
    /\bcctv\b[^.\n]{0,120}\.[^.\n]{0,80}\bcontinuity\s+label\s+(?:unclear|unknown|to\s+be\s+checked|needs?\s+checking|needs?\s+confirm(?:ation|ing))/i.test(
      hay,
    ) ||
    /\bcontinuity\s+label\s+(?:unclear|unknown|to\s+be\s+checked|needs?\s+checking|needs?\s+confirm(?:ation|ing))\b[^.\n]{0,120}\bcctv\b/i.test(
      hay,
    ) ||
    /\bcctv\s+continuity\b[^.\n]{0,80}\b(?:to\s+be\s+checked|needs?\s+checking|needs?\s+confirm(?:ation|ing)|not\s+safely\s+confirmed|unclear|unknown)\b/i.test(
      hay,
    ) ||
    /\b(?:to\s+be\s+checked|needs?\s+checking|needs?\s+confirm(?:ation|ing)|not\s+safely\s+confirmed|unclear|unknown)\b[^.\n]{0,80}\bcctv\s+continuity\b/i.test(
      hay,
    );
  const assertedMissing =
    /\bcctv\s+continuity\b[^.\n]{0,80}\b(?:outstanding|missing|not\s+served|not\s+provided|not\s+attached|awaited|awaiting)\b/i.test(
      hay,
    ) ||
    /\b(?:outstanding|missing|not\s+served|not\s+provided|not\s+attached|awaited|awaiting)\b[^.\n]{0,80}\bcctv\s+continuity\b/i.test(
      hay,
    );
  return confirmationOnly && !assertedMissing;
}

function isFullCustodyRecordOutstanding(bundleText: string): boolean {
  const hay = `${bundleText ?? ""}`;
  return (
    /\bfull\s+custody\s+record\b[\s\S]{0,80}\b(?:outstanding|missing|not\s+served|not\s+attached|not\s+provided|not\s+included)\b/i.test(
      hay,
    ) ||
    /\b(?:outstanding|missing|not\s+served|not\s+attached|not\s+provided|not\s+included)\b[\s\S]{0,80}\bfull\s+custody\s+record\b/i.test(
      hay,
    ) ||
    /\bcustody\s+record\b[\s\S]{0,80}\b(?:extract\s+only|extract)\b[\s\S]{0,80}\bfull\s+record\s+outstanding\b/i.test(
      hay,
    )
  );
}

function isCustodyExtractReviewOnly(bundleText: string): boolean {
  const hay = `${bundleText ?? ""}`;
  return (
    /\bcustody\s+record\s+extract\b/i.test(hay) &&
    !isFullCustodyRecordOutstanding(hay)
  );
}

function custodyPaceReviewOnlyItem(item: DisclosureChaseItem): DisclosureChaseItem {
  const label = "Custody/PACE completeness review";
  return {
    ...item,
    label,
    baseStatus: "Not safely confirmed",
    urgency: "medium",
    deadlineLabel: "Confirm custody/PACE completeness before relying on safeguards",
    whyItMatters:
      "A custody record extract is on file; confirm whether the custody/PACE record is complete before assessing safeguards or interview fairness.",
    draftChaseWording:
      "Please confirm whether the custody/PACE record is complete, including any detention log, risk assessment, legal-advice, appropriate-adult or interpreter entries relied on.",
    courtLine:
      `${COURT_RECORD_PREFIX} that custody/PACE completeness needs confirmation before the defence relies on safeguards or interview fairness.`,
    mergedFrom: [
      "Custody record extract on file — completeness requires review",
      ...((item.mergedFrom ?? []).filter((line) =>
        /\bcustody\s+record\s+extract\b/i.test(line) &&
        !/\bfull\s+custody\s+record\b/i.test(line),
      )),
    ].slice(0, 4),
  };
}

function finalMedicalForensicReportItem(item: DisclosureChaseItem): DisclosureChaseItem {
  const label = "Final medical/forensic report";
  return {
    ...item,
    label,
    whyItMatters:
      "A short note is not a final report — keep the requested material limited to the report the source actually identifies.",
    draftChaseWording:
      "Please provide the final medical/forensic report, or confirm in writing why it is not available.",
    courtLine: toCourtLine(label),
    mergedFrom: [
      "Final medical/forensic report not included",
      ...((item.mergedFrom ?? []).filter((line) => /final\s+report\s+not\s+included|medical\s*\/\s*forensic\s+note/i.test(line))),
    ].slice(0, 4),
  };
}

function cctvContinuityConfirmationItem(item: DisclosureChaseItem): DisclosureChaseItem {
  return {
    ...item,
    baseStatus: "Not safely confirmed",
    urgency: "medium",
    deadlineLabel: "Confirm status before relying on CCTV continuity",
    whyItMatters: "Continuity source needs checking before any CCTV point is relied on.",
    draftChaseWording:
      "Please confirm the CCTV continuity record, provenance material, or confirm in writing why it is not available.",
    courtLine:
      `${COURT_RECORD_PREFIX} that CCTV continuity/provenance needs confirmation before the defence can rely on any CCTV point.`,
  };
}

/**
 * Chase source gate: drop family items the bundle never mentions; convert
 * explicitly-negated families into confirm-none items instead of chases.
 * Applies to generic merged items AND workflow profile-pack labels.
 * No bundle text available → cannot gate, keep items as-is.
 */
function gateItemsAgainstSource(
  items: DisclosureChaseItem[],
  bundleText: string | null | undefined,
): DisclosureChaseItem[] {
  if (!bundleText?.trim()) return items;
  const out: DisclosureChaseItem[] = [];
  for (const item of items) {
    // Affirmative modality gate — listed CCTV/BWV alone must not keep master/full-window/continuity.
    if (item.familyId === "cctv_master" && !isCctvMasterEstablished(bundleText)) {
      continue;
    }
    if (item.familyId === "cctv_continuity" && !isCctvContinuityEstablished(bundleText)) {
      continue;
    }
    if (item.familyId === "cctv_continuity" && isCctvContinuityConfirmationOnly(bundleText)) {
      out.push(finalizeGatedDisclosureItem(cctvContinuityConfirmationItem(item), bundleText));
      continue;
    }
    // Robbery / ID pack must not invent VIPER/parade without papers (Dunn invent mute).
    if (
      (lineClaimsIdentificationProcedure(item.label) ||
        lineClaimsIdentificationProcedure(item.whyItMatters ?? "") ||
        lineClaimsIdentificationProcedure(item.courtLine ?? "")) &&
      !isIdentificationProcedureEstablished(bundleText)
    ) {
      continue;
    }
    // BWV stills served alone must not keep a full-export invent chase (Dunn opposite Tobin/CASE-02).
    if (item.familyId === "bwv" && !isBwvFullExportEstablished(bundleText)) {
      continue;
    }
    // Bare page-999 / schedule noise must not keep CAD lump invent (Court C0.5).
    if (item.familyId === "cad_999" && !isCad999Established(bundleText)) {
      continue;
    }
    if (item.familyId === "custody_pace" && isCustodyExtractReviewOnly(bundleText)) {
      out.push(finalizeGatedDisclosureItem(custodyPaceReviewOnlyItem(item), bundleText));
      continue;
    }
    if (
      item.familyId === "medical_expert" &&
      /\bfinal\s+report\s+not\s+included\b|\bshort\s+note\b[\s\S]{0,80}\bfinal\s+report\b/i.test(bundleText)
    ) {
      out.push(finalizeGatedDisclosureItem(finalMedicalForensicReportItem(item), bundleText));
      continue;
    }

    const families = gateFamiliesForItem(item);
    if (!families.length) {
      out.push(item);
      continue;
    }
    let drop = false;
    let replaced: DisclosureChaseItem | null = null;
    for (const gateFamily of families) {
      const support = familySupport(gateFamily, bundleText);
      if (support === "absent") {
        drop = true;
        break;
      }
      if (support === "negated") {
        replaced = confirmNoneDisclosureItem(item, gateFamily);
        break;
      }
    }
    if (drop) continue;
    const kept = replaced ?? item;
    out.push(finalizeGatedDisclosureItem(kept, bundleText));
  }
  return out;
}

function familySafeMergedFrom(
  item: DisclosureChaseItem,
  bundleText: string | null | undefined,
): string[] {
  if (!item.mergedFrom?.length || !bundleText?.trim()) return item.mergedFrom ?? [];
  const allowedFamilies = new Set(gateFamiliesForItem(item));
  return item.mergedFrom.filter((line) => {
    const families = familiesInText(line);
    if (!families.length) return true;
    return families.every(
      (family) => allowedFamilies.has(family) && familySupport(family, bundleText) !== "absent",
    );
  });
}

function finalizeGatedDisclosureItem(
  item: DisclosureChaseItem,
  bundleText: string,
): DisclosureChaseItem {
  const courtLine = gateProseAgainstSource(item.courtLine, bundleText);
  return {
    ...item,
    whyItMatters: gateProseAgainstSource(item.whyItMatters, bundleText),
    draftChaseWording: gateProseAgainstSource(item.draftChaseWording, bundleText),
    courtLine:
      item.baseStatus === "Not safely confirmed" &&
      /\b(?:appears|remains)\s+outstanding\b/i.test(courtLine)
        ? `${COURT_RECORD_PREFIX} that ${item.label.charAt(0).toLowerCase()}${item.label.slice(1)} needs confirmation before the defence relies on it.`
        : courtLine,
  };
}

function slugFromLabels(labels: string[]): string {
  return labels[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24) ?? "misc";
}

function resolveSafeCourtLine(battleboard: BattleboardOutput | null): string {
  const fromRoute = battleboard?.primary_route?.hearing_line?.trim();
  if (fromRoute && !FORBIDDEN_RE.test(fromRoute)) return fromRoute;
  const summary = battleboard?.solicitor_safe_summary?.trim();
  if (summary && !FORBIDDEN_RE.test(summary)) {
    const finalized = finalizeSolicitorVisibleProse(summary);
    if (finalized.ok) return finalized.text;
  }
  return "Position remains provisional — ask the court to record outstanding source material and set a timetable.";
}

function splitPrimaryAdditional(items: DisclosureChaseItem[]): {
  primaryItems: DisclosureChaseItem[];
  additionalItems: DisclosureChaseItem[];
} {
  const deduped = dedupeDisclosureItems(items);
  // Phone/subscriber modality injects use familyId "other" but must stay on the default
  // Chase board — burying them under collapsed "Other source-material items" soft-mutes
  // Brookes/Ahmed/Grant live while Overview still shows the PDF-true gaps.
  const isPrimaryEligible = (i: DisclosureChaseItem) =>
    i.familyId !== "other" || isDigitalModalityChaseLabel(i.label);
  const core = deduped.filter(isPrimaryEligible);
  const misc = deduped.filter((i) => !isPrimaryEligible(i));
  const digital = core.filter((i) => isDigitalModalityChaseLabel(i.label));
  const nonDigitalCore = core.filter((i) => !isDigitalModalityChaseLabel(i.label));
  const primaryItems: DisclosureChaseItem[] = [];
  for (const item of digital) {
    if (primaryItems.length >= DISCLOSURE_CHASE_PRIMARY_CAP) break;
    primaryItems.push(item);
  }
  for (const item of nonDigitalCore) {
    if (primaryItems.length >= DISCLOSURE_CHASE_PRIMARY_CAP) break;
    primaryItems.push(item);
  }
  const primaryIds = new Set(primaryItems.map((i) => i.id));
  return {
    primaryItems,
    additionalItems: [...core.filter((i) => !primaryIds.has(i.id)), ...misc],
  };
}

function dedupeDisclosureItems(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  const byKey = new Map<string, DisclosureChaseItem>();
  for (const item of items) {
    const normalized = normalizeDisclosureItem(item);
    const key = disclosureItemDedupeKey(normalized);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalized);
      continue;
    }
    byKey.set(key, mergeDisclosureItems(existing, normalized));
  }
  return [...byKey.values()];
}

function buildWorkflowProfileDisclosureItems(
  labels: string[],
  battleboard: BattleboardOutput | null,
  deadline: DeadlineContext,
  profile: Exclude<ReturnType<typeof resolveWorkflowProfile>, "generic">,
  ledger: BundleTruthLedger | null,
): DisclosureChaseItem[] {
  return labels.map((label, idx) => {
    const normalized = normalizeWorkflowPilotLabel(normalizeRawLabel(label));
    const familyId = classifyFamily(normalized);
    return {
      id: `workflow-chase-${profile}-${idx}`,
      familyId,
      label: normalized,
      whyItMatters: workflowDisclosureWhyItMatters(normalized, profile),
      source: "Crown / disclosure officer (confirm on file)",
      baseStatus: deadline.baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: (() => {
        const fromLedger = ledger
          ? findEvidenceAnchor(familyId, [normalized], battleboard, ledger)
          : null;
        if (fromLedger) return fromLedger;
        const raw = battleboard?.primary_route?.evidence_anchors?.[0] ?? null;
        if (
          !raw ||
          isMalformedPilotEvidenceAnchor(raw) ||
          isAdminGuidanceLine(raw) ||
          !familySafeEvidenceAnchor(familyId, raw)
        ) {
          return null;
        }
        return formatDisplayLabelCasing(raw);
      })(),
      linkedRoute: battleboard?.primary_route?.title ?? null,
      draftChaseWording: formatPilotDraftChaseWording(normalized),
      courtLine: formatPilotCourtLine(normalized),
      mergedFrom: [normalized],
    };
  });
}

function normalizeDisclosureItem(item: DisclosureChaseItem): DisclosureChaseItem {
  // Preserve confirm-none items from chase-source-gate — do not re-canonicalise back to a chase label.
  if (
    /file indicates none exists/i.test(item.label) ||
    /confirm in writing that none exists/i.test(item.draftChaseWording ?? "")
  ) {
    return item;
  }
  const label = normalizeRawLabel(item.label);
  // Keep phone/subscriber modality cards stable — joining mergedFrom into the canonical
  // label lets finalize overflow-rewrite them and soft-mute Brookes under Other.
  if (isDigitalModalityChaseLabel(label)) {
    return {
      ...item,
      familyId: "other",
      label,
      courtLine: toCourtLine(label),
      mergedFrom: [
        ...new Set(
          [label, ...item.mergedFrom.map((m) => normalizeRawLabel(m))]
            .map((m) => m.trim())
            .filter((m) => m && (isDigitalModalityChaseLabel(m) || /phone|subscriber|source export|download/i.test(m))),
        ),
      ],
      provenance:
        item.provenance ??
        chaseItemProvenance({
          label,
          source: item.source,
          baseStatus: item.baseStatus,
          evidenceAnchor: item.evidenceAnchor,
        }),
    };
  }
  const familyId = item.familyId === "other" ? classifyFamily(label) : item.familyId;
  const canonical = canonicalDisclosureMaterial(label, familyId, item.mergedFrom);
  const draft =
    canonical.draftChaseWording ??
    (isUnsafeOrNonMaterialChaseLine(item.draftChaseWording)
      ? draftChaseWording(canonical.label, item.mergedFrom)
      : item.draftChaseWording);

  return {
    ...item,
    familyId: canonical.familyId,
    label: canonical.label,
    whyItMatters: canonical.whyItMatters ?? item.whyItMatters,
    draftChaseWording: draft,
    courtLine: toCourtLine(canonical.label),
    mergedFrom: [
      ...new Set(
        [label, ...item.mergedFrom.map((m) => normalizeRawLabel(m))]
          .map((m) => m.trim())
          .filter(Boolean),
      ),
    ],
    provenance:
      item.provenance ??
      chaseItemProvenance({
        label: canonical.label,
        source: item.source,
        baseStatus: item.baseStatus,
        evidenceAnchor: item.evidenceAnchor,
      }),
  };
}

function safeCanonicalDisclosureLabel(
  mergedText: string,
  familyId: ChaseFamilyId,
  canonicalLabel: string,
): string {
  if (familyId === "other") return canonicalLabel;
  const def = getFamilyDef(familyId);
  if (/\bMG6C?:?\s*(?:Unused Material Schedule|Disclosure Schedule)\b/i.test(canonicalLabel)) {
    return def.label;
  }
  if (canonicalLabel === formatDisplayLabelCasing(mergedText.trim())) {
    return def.label;
  }
  return canonicalLabel;
}

function canonicalDisclosureMaterial(
  label: string,
  familyId: ChaseFamilyId,
  mergedFrom: string[],
): {
  familyId: ChaseFamilyId;
  label: string;
  whyItMatters?: string;
  draftChaseWording?: string;
} {
  const text = [label, ...mergedFrom].join("; ");
  const resolvedFamily = familyId === "other" ? classifyFamily(text) : familyId;
  const canonical = canonicalLedgerMaterial(text, resolvedFamily);
  return {
    familyId: resolvedFamily,
    label: safeCanonicalDisclosureLabel(text, resolvedFamily, canonical.label),
    whyItMatters: canonical.whyItMatters,
    draftChaseWording: canonical.draftChaseWording,
  };
}

function disclosureItemDedupeKey(item: DisclosureChaseItem): string {
  const canonical = canonicalDisclosureMaterial(item.label, item.familyId, item.mergedFrom);
  return `${canonical.familyId}:${canonical.label.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function mergeDisclosureItems(
  existing: DisclosureChaseItem,
  incoming: DisclosureChaseItem,
): DisclosureChaseItem {
  const mergedFrom = [...new Set([...existing.mergedFrom, ...incoming.mergedFrom])];
  const canonical = canonicalDisclosureMaterial(existing.label, existing.familyId, mergedFrom);
  const baseStatus = mergeStatus(existing.baseStatus, incoming.baseStatus);
  const courtLine =
    baseStatus === "Not safely confirmed"
      ? `${COURT_RECORD_PREFIX} that ${canonical.label.charAt(0).toLowerCase()}${canonical.label.slice(1)} needs confirmation before the defence relies on it.`
      : toCourtLine(canonical.label);

  return {
    ...existing,
    familyId: canonical.familyId,
    label: canonical.label,
    whyItMatters: canonical.whyItMatters ?? existing.whyItMatters ?? incoming.whyItMatters,
    source: existing.source || incoming.source,
    baseStatus,
    urgency: mergeUrgency(existing.urgency, incoming.urgency),
    deadlineLabel: existing.deadlineLabel || incoming.deadlineLabel,
    evidenceAnchor: existing.evidenceAnchor ?? incoming.evidenceAnchor,
    linkedRoute: existing.linkedRoute ?? incoming.linkedRoute,
    draftChaseWording:
      canonical.draftChaseWording ??
      preferDraftChaseWording(
        isUnsafeOrNonMaterialChaseLine(existing.draftChaseWording)
          ? draftChaseWording(canonical.label, mergedFrom)
          : existing.draftChaseWording,
        isUnsafeOrNonMaterialChaseLine(incoming.draftChaseWording)
          ? draftChaseWording(canonical.label, mergedFrom)
          : incoming.draftChaseWording,
      ),
    courtLine,
    mergedFrom,
    provenance: chaseItemProvenance({
      label: canonical.label,
      source: existing.source || incoming.source,
      baseStatus,
      evidenceAnchor: existing.evidenceAnchor ?? incoming.evidenceAnchor,
    }),
  };
}

function mergeStatus(a: ChaseItemStatus, b: ChaseItemStatus): ChaseItemStatus {
  // Review-only must not be promoted into deadline urgency (Overdue / Due soon).
  if (a === "Not safely confirmed" || b === "Not safely confirmed") {
    if (a === "Received" || b === "Received") return "Received";
    if (a === "Chased" || b === "Chased") return "Chased";
    return "Not safely confirmed";
  }
  const order: ChaseItemStatus[] = [
    "Overdue",
    "Due soon",
    "Outstanding",
    "Chased",
    "Received",
  ];
  return order[Math.min(order.indexOf(a), order.indexOf(b))] ?? a;
}

/** Review-only / uncertain source rows must not wear prosecution-deadline chips. */
export function isReviewOnlyChaseMaterial(item: Pick<
  DisclosureChaseItem,
  "label" | "source" | "baseStatus" | "evidenceAnchor" | "provenance" | "whyItMatters"
>): boolean {
  if (item.baseStatus === "Not safely confirmed") return true;
  const provRaw =
    item.provenance && typeof item.provenance === "object" && "evidenceState" in item.provenance
      ? String((item.provenance as { evidenceState?: unknown }).evidenceState ?? "")
      : "";
  const prov = provRaw.toLowerCase().replace(/[\s-]+/g, "_");
  if (
    prov === "not_safely_confirmed" ||
    prov === "referred_only" ||
    prov === "unclear" ||
    prov === "unassessed" ||
    prov === "needs_review"
  ) {
    return true;
  }
  // Soft review cues — do not treat listing-elapsed as a missed CPS deadline for these.
  if (/\(confirm on file\)/i.test(item.source ?? "")) return true;
  if (/Review the cited source before relying on this item/i.test(item.whyItMatters ?? "")) return true;

  // Deadline chips (Overdue / Due soon) poison source-state inference into NSC —
  // probe as Outstanding so genuine missing stays missing.
  const probeStatus: ChaseItemStatus =
    item.baseStatus === "Overdue" || item.baseStatus === "Due soon"
      ? "Outstanding"
      : item.baseStatus;
  const sourceState = inferChaseItemSourceState({
    label: item.label,
    source: item.source,
    baseStatus: probeStatus,
    evidenceAnchor: item.evidenceAnchor,
    whyItMatters: item.whyItMatters,
  });
  return (
    sourceState === "not_safely_confirmed" ||
    sourceState === "referred_only" ||
    sourceState === "needs_review"
  );
}

/**
 * Listing/hearing elapsed may mark genuine missing rows Overdue/Due soon.
 * Review-only rows stay "Not safely confirmed" (Needs confirmation in UI).
 */
export function clampChaseOperationalStatus(
  item: Pick<
    DisclosureChaseItem,
    "label" | "source" | "baseStatus" | "evidenceAnchor" | "provenance" | "whyItMatters"
  >,
  status: ChaseItemStatus = item.baseStatus,
): ChaseItemStatus {
  if (status === "Received" || status === "Chased") return status;
  if (status !== "Overdue" && status !== "Due soon") return status;
  if (isReviewOnlyChaseMaterial({ ...item, baseStatus: status })) {
    return "Not safely confirmed";
  }
  return status;
}

export function normalizeChaseOperationalStatuses(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  return items.map((item) => {
    const baseStatus = clampChaseOperationalStatus(item);
    if (baseStatus === item.baseStatus) return item;
    return { ...item, baseStatus };
  });
}

/** Solicitor-facing status chip label (presentation only). */
export function displayChaseOperationalStatus(status: ChaseItemStatus): string {
  if (status === "Not safely confirmed") return "Needs confirmation";
  return status;
}

function mergeUrgency(
  a: DisclosureChaseItem["urgency"],
  b: DisclosureChaseItem["urgency"],
): DisclosureChaseItem["urgency"] {
  const order: DisclosureChaseItem["urgency"][] = ["high", "medium", "low"];
  return order[Math.min(order.indexOf(a), order.indexOf(b))] ?? a;
}

function canonicalSnapshotStatus(status: string | null | undefined): "missing" | "review" | "served" | null {
  const raw = `${status ?? ""}`.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!raw) return null;
  if (/\b(?:served|received|on file)\b/.test(raw) && !/\b(?:not|incomplete|partial|unclear)\b/.test(raw)) {
    return "served";
  }
  if (/\b(?:missing|outstanding|absent|not served|not on papers)\b/.test(raw)) return "missing";
  if (/\b(?:unassessed|unclear|unknown|not safely confirmed|incomplete|partial|referred only|check|confirm)\b/.test(raw)) {
    return "review";
  }
  return null;
}

function normalizedLooseLabel(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(?:the|full|source|material|record|records|please|provide|confirm|before|current|papers)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function snapshotRowsForDisclosureItem(
  item: DisclosureChaseItem,
  rows: { label: string; status: string }[],
): { label: string; status: string }[] {
  const itemLabel = normalizedLooseLabel(item.label);
  return rows.filter((row) => {
    const rowLabel = normalizedLooseLabel(row.label);
    if (!rowLabel || !itemLabel) return false;
    if (rowLabel === itemLabel || rowLabel.includes(itemLabel) || itemLabel.includes(rowLabel)) {
      return true;
    }
    return classifyFamily(row.label) === item.familyId;
  });
}

function applySnapshotStatusBoundaries(
  items: DisclosureChaseItem[],
  input: Pick<BuildDisclosureChaseBriefInput, "snapshotMissing">,
): DisclosureChaseItem[] {
  const rows = input.snapshotMissing ?? [];
  if (!rows.length) return items;

  return items
    .map((item) => {
      const related = snapshotRowsForDisclosureItem(item, rows);
      if (!related.length) return item;
      const statuses = related.map((row) => canonicalSnapshotStatus(row.status));
      if (statuses.includes("missing")) return item;
      if (!statuses.includes("review")) return item;

      const noun = item.label.charAt(0).toLowerCase() + item.label.slice(1);
      return {
        ...item,
        baseStatus: "Not safely confirmed" as ChaseItemStatus,
        urgency: item.urgency === "high" ? "medium" : item.urgency,
        deadlineLabel: "Confirm status before relying on this item",
        whyItMatters:
          item.whyItMatters && !/\b(?:appears|remains)\s+outstanding\b/i.test(item.whyItMatters)
            ? item.whyItMatters
            : `${item.label} needs source-status confirmation before it is relied on.`,
        draftChaseWording:
          item.draftChaseWording && !/\b(?:appears|remains)\s+outstanding\b/i.test(item.draftChaseWording)
            ? item.draftChaseWording
            : `Please confirm whether ${noun} is served, incomplete, unavailable, or still awaited.`,
        courtLine: `${COURT_RECORD_PREFIX} that ${noun} needs confirmation before the defence relies on it.`,
      };
    })
    .filter((item) => {
      const related = snapshotRowsForDisclosureItem(item, rows);
      return !related.some((row) => canonicalSnapshotStatus(row.status) === "served");
    });
}

function preferDraftChaseWording(a: string, b: string): string {
  const unsafe = /^please provide\s+the defence asks the court/i;
  if (unsafe.test(a) && !unsafe.test(b)) return b;
  if (unsafe.test(b) && !unsafe.test(a)) return a;
  return a.length >= b.length ? a : b;
}

function collapseDisclosureItemsByFamily(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  const byKey = new Map<string, DisclosureChaseItem>();

  for (const rawItem of items) {
    const item = normalizeDisclosureItem(rawItem);
    const key = disclosureItemDedupeKey(item);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeDisclosureItems(existing, item) : item);
  }

  return [...byKey.values()].sort((a, b) => {
    const pa = CHASE_FAMILIES.find((f) => f.id === a.familyId)?.priority ?? 99;
    const pb = CHASE_FAMILIES.find((f) => f.id === b.familyId)?.priority ?? 99;
    return pa - pb;
  });
}

function mergeLedgerDisclosureItems(
  items: DisclosureChaseItem[],
  ledger: BundleTruthLedger,
  deadline: ReturnType<typeof resolveDeadlineContext>,
): DisclosureChaseItem[] {
  const labelSeen = new Set(items.map((i) => i.label.toLowerCase()));
  const merged = [...items];

  for (const m of ledgerMaterialsNeedingChase(ledger)) {
    const familyId = classifyFamily(m.displayLine);
    const canonical = canonicalLedgerMaterial(m.displayLine, familyId);
    const key = canonical.label.toLowerCase();
    if (labelSeen.has(key)) continue;
    labelSeen.add(key);

    const baseStatus: ChaseItemStatus =
      m.status === "outstanding" || m.status === "absent" ? "Outstanding" : "Not safely confirmed";

    merged.push({
      id: `ledger-material-${m.id}`,
      familyId,
      label: canonical.label,
      whyItMatters: (() => {
        if (canonical.whyItMatters) return canonical.whyItMatters;
        const statusProse = professionalMaterialStatusProse(m.status).replace(/\.$/, "");
        if (/chase or confirm/i.test(statusProse)) return `${statusProse}.`;
        return `${statusProse}. Chase or confirm status before fixing hearing position.`;
      })(),
      source: "MG6/MG6C disclosure schedule",
      baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: (() => {
        const display = canonical.anchor ?? formatDisplayLabelCasing(m.displayLine);
        if (!isAdminGuidanceLine(display)) return display;
        const excerpt = m.sourceAnchor.excerpt;
        if (!excerpt || isAdminGuidanceLine(excerpt)) return null;
        return formatDisplayLabelCasing(excerpt);
      })(),
      linkedRoute: null,
      draftChaseWording: canonical.draftChaseWording ?? `Please provide ${canonical.label.toLowerCase()} or confirm in writing why it is not available.`,
      courtLine: `${COURT_RECORD_PREFIX} that ${canonical.label.charAt(0).toLowerCase()}${canonical.label.slice(1)} remains ${professionalCourtStatusFragment(m.status)} on the current papers.`,
      mergedFrom: [m.displayLine],
    });
  }

  merged.sort((a, b) => {
    const pa = CHASE_FAMILIES.find((f) => f.id === a.familyId)?.priority ?? 99;
    const pb = CHASE_FAMILIES.find((f) => f.id === b.familyId)?.priority ?? 99;
    return pa - pb;
  });

  return merged;
}

function canonicalLedgerMaterial(
  displayLine: string,
  familyId: ChaseFamilyId,
): {
  label: string;
  anchor?: string;
  whyItMatters?: string;
  draftChaseWording?: string;
} {
  if (familyId === "bwv") {
    return {
      label: "Body-worn video (BWV)",
      anchor: "MG6/MG6C schedule — BWV referred to but not fully attached",
      whyItMatters: "BWV is referred to but not safely served in full — chase the full export and continuity before fixing the hearing position.",
      draftChaseWording:
        "Please provide the full BWV export, audit trail, redaction log and continuity/provenance material, or confirm in writing why it is not available.",
    };
  }
  if (familyId === "cad_999") {
    if (/\b(?:complete\s+)?cad\s*\/\s*999\s+log\b/i.test(displayLine)) {
      return {
        label: "Complete CAD/999 log",
        whyItMatters:
          "The papers identify a CAD/999 log gap — keep the request limited to the log the source identifies.",
        draftChaseWording:
          "Please provide the complete CAD/999 log, or confirm in writing why it is not available.",
      };
    }
  }
  if (familyId === "custody_pace" || (familyId === "interview" && /\bcustody|pace|detention|safeguard/i.test(displayLine))) {
    // Only treat recording/transcript as established from this line when it is not merely a
    // custody lump that also names interview recording as a template invent.
    const recordingModalityLine =
      /\binterview\s+recording\b/i.test(displayLine) &&
      !/\bfull\s+custody\s+record\b/i.test(displayLine);
    const transcriptModalityLine =
      /\binterview\s+transcript\b/i.test(displayLine) &&
      !/\bfull\s+custody\s+record\b/i.test(displayLine);
    if (familyId === "interview" && (recordingModalityLine || (isInterviewRecordingEstablished(displayLine) && !/\bfull\s+custody\s+record\b/i.test(displayLine)))) {
      return {
        label: "Interview recording",
        whyItMatters: "Interview summary on file is not a substitute for the interview recording.",
        draftChaseWording:
          "Please provide the interview recording, or confirm in writing why it is not available.",
      };
    }
    if (familyId === "interview" && (transcriptModalityLine || (isInterviewTranscriptEstablished(displayLine) && !/\bfull\s+custody\s+record\b/i.test(displayLine)))) {
      return {
        label: "Interview transcript",
        whyItMatters:
          "Interview summary or partial record on file is not a substitute for the full transcript.",
        draftChaseWording:
          "Please provide the interview transcript, or confirm in writing why it is not available.",
      };
    }
    return {
      label: "Full custody record / PACE material",
      anchor: "MG6/MG6C schedule — custody record extract only",
      whyItMatters: "Custody/PACE material is referred to in limited form — chase the full record before assessing safeguards or interview fairness.",
      draftChaseWording:
        "Please provide the full custody record, detention log, risk assessment and safeguards checklist, or confirm why any item is unavailable.",
    };
  }
  if (familyId === "medical_expert" && /\bfinal\s+(?:medical\s*\/\s*forensic\s+)?report\b|\bfinal\s+report\s+not\s+included\b/i.test(displayLine)) {
    return {
      label: "Final medical/forensic report",
      whyItMatters:
        "A short note is not a final report — keep the requested material limited to the report the source actually identifies.",
      draftChaseWording:
        "Please provide the final medical/forensic report, or confirm in writing why it is not available.",
    };
  }
  // Papers/Chase shared root: prefer clean phone-download identity over multi-clause schedule prose
  // that also mentions subscriber (Brookes) — subscriber stays a distinct inject card.
  if (
    /\b(?:(?:full\s+)?phone\s+download|phone\s+extraction|source\s+export|handset\s+download|device\s+download|digital\s+extraction)\b/i.test(
      displayLine,
    ) &&
    !/\bno\s+(?:full\s+)?phone\s+download\b|\bno\s+source\s+export\b/i.test(displayLine)
  ) {
    if (/\blogical\s+download\s+summary|extraction\s+summary\s+only|full\s+report\s+not\s+in\s+(?:the\s+)?section/i.test(displayLine)) {
      return {
        label: "Phone extraction summary only — full download report not in section",
        whyItMatters:
          "A logical download summary or referenced-only note is not a full phone download report.",
        draftChaseWording:
          "Please confirm whether a full phone download / source export exists beyond the logical/summary note on file, or confirm in writing why it is not available.",
      };
    }
    return {
      label: "Full phone download / source extraction",
      whyItMatters:
        "Original download / source export is outstanding on the disclosure papers.",
      draftChaseWording:
        "Please provide the full phone download / source export, or confirm in writing why it is not available.",
    };
  }
  return { label: formatDisplayLabelCasing(displayLine) };
}

function sourceBoundCaseWideLine(raw: string, bundleText: string | null | undefined): string {
  if (!bundleText?.trim()) return raw;
  if (
    /\bfull\s+custody\s+and\s+interview\s+records\s+remain\s+outstanding\b/i.test(raw) &&
    !isFullCustodyRecordOutstanding(bundleText)
  ) {
    if (isInterviewTranscriptEstablished(bundleText) && !isInterviewRecordingEstablished(bundleText)) {
      return `${COURT_RECORD_PREFIX} that the interview transcript remains outstanding and custody/PACE completeness needs confirmation before the defence relies on safeguards or interview fairness.`;
    }
    return `${COURT_RECORD_PREFIX} that custody/PACE and interview material need source-status confirmation before the hearing position is fixed.`;
  }
  return raw;
}

function mergeContradictionActionItems(
  items: DisclosureChaseItem[],
  input: BuildDisclosureChaseBriefInput,
  deadline: ReturnType<typeof resolveDeadlineContext>,
): DisclosureChaseItem[] {
  const contradictions = extractAllBundleContradictions(input.bundleText);
  const actions = buildContradictionActions(contradictions);
  if (actions.length === 0) return items;

  const seen = new Set(items.map((i) => i.label.toLowerCase()));
  const merged = [...items];

  for (const action of actions) {
    const label = formatDisplayLabelCasing(action.label);
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    const familyId = classifyFamily(action.chaseAsk);

    merged.push({
      id: `contradiction-action-${action.type}`,
      familyId,
      label,
      whyItMatters: action.summaryRisk,
      source: "Crown / disclosure officer (contradiction reconciliation)",
      baseStatus: deadline.baseStatus,
      urgency: deadline.urgency === "low" ? "medium" : deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: action.label,
      linkedRoute: input.battleboard?.primary_route?.title ?? null,
      draftChaseWording: action.draftChaseWording,
      courtLine: `${COURT_RECORD_PREFIX} that ${action.chaseAsk.charAt(0).toLowerCase()}${action.chaseAsk.slice(1)} are needed to reconcile ${action.label.toLowerCase()}.`,
      mergedFrom: [action.label],
    });
  }

  merged.sort((a, b) => {
    const pa = CHASE_FAMILIES.find((f) => f.id === a.familyId)?.priority ?? 98;
    const pb = CHASE_FAMILIES.find((f) => f.id === b.familyId)?.priority ?? 98;
    return pa - pb;
  });

  return merged;
}

function modalityEstablishmentHay(input: BuildDisclosureChaseBriefInput): string {
  // Live Brookes residual: Overview/evidence gaps establish phone download while
  // frontMatterScan alone can omit the schedule cell phrasing — still inject/promote.
  const bb = input.battleboard as {
    chase_now?: string[];
    urgent_next_moves?: string[];
    solicitor_safe_summary?: string;
    routes?: Array<{ next_moves?: string[]; title?: string }>;
  } | null;
  return [
    input.bundleText ?? "",
    input.allegation ?? "",
    bb?.solicitor_safe_summary ?? "",
    ...(input.snapshotMissing ?? []).map((m) => m.label),
    ...(input.canonicalEvidenceRows ?? []).map((r) => `${r.label} ${r.state}`),
    ...(input.canonicalFindings ?? []).map((f) => `${f.title} ${f.summary ?? ""}`),
    ...(bb?.chase_now ?? []),
    ...(bb?.urgent_next_moves ?? []),
    ...((bb?.routes ?? []).flatMap((r) => [r.title ?? "", ...(r.next_moves ?? [])])),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDisclosureChaseBrief(input: BuildDisclosureChaseBriefInput): DisclosureChaseBrief {
  const ledger = input.bundleText?.trim()
    ? buildBundleTruthLedger({ bundleText: input.bundleText })
    : null;
  const modalityHay = modalityEstablishmentHay(input);
  const briefPlan =
    input.briefPlan ??
    buildCriminalBriefPlan({
      bundleText: input.bundleText,
      ledger,
      missingMaterial: [
        ...(input.snapshotMissing?.map((m) => m.label) ?? []),
        ...(input.proceduralOutstanding ?? []),
      ],
      allegation: input.allegation,
    });

  const workflowContext = {
    caseTitle: input.caseTitle,
    allegation: input.allegation,
    routeTitle: input.battleboard?.primary_route?.title,
    bundleText: input.bundleText,
    clientLabel: input.clientLabel,
    profileHint: input.profileHint,
  };
  const profile = resolveWorkflowProfile(workflowContext);
  const profileLabels = workflowDisclosureChaseLabels(workflowContext);

  const chaseLabelsRaw = collectChaseItems({
    snapshotMissing: input.snapshotMissing,
    proceduralOutstanding: input.proceduralOutstanding,
    battleboard: input.battleboard,
    bundleText: input.bundleText,
  });
  const chaseLabels = prioritizeWorkflowItems(
    filterWorkflowItems(
      filterSafeChaseLabels(
        [
          ...briefPlan.requiredOutputItems.chase,
          ...briefPlan.missingEvidence.map((item) => item.label),
          ...chaseLabelsRaw,
        ],
        briefPlan.profile,
      ),
      workflowContext,
    ),
    workflowContext,
  );

  const days = daysUntilHearing(input.hearingDateIso);
  const deadline = resolveDeadlineContext(days, input.hearingDateIso);

  let items: DisclosureChaseItem[];
  let primaryItems: DisclosureChaseItem[];
  let additionalItems: DisclosureChaseItem[];

  if (profileLabels && profile !== "generic") {
    items = gateItemsAgainstSource(
      buildWorkflowProfileDisclosureItems(
        filterSafeChaseLabels(
          [
            ...briefPlan.requiredOutputItems.chase,
            ...briefPlan.missingEvidence.map((item) => item.label),
            ...profileLabels,
          ],
          briefPlan.profile,
        ),
        input.battleboard,
        deadline,
        profile,
        ledger,
      ),
      input.bundleText,
    );
    ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));
  } else {
    items = gateItemsAgainstSource(
      groupAndMergeLabels(chaseLabels, input.battleboard, deadline, ledger),
      input.bundleText,
    );
    ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));
  }

  if (ledger && ledgerMaterialsNeedingChase(ledger).length > 0) {
    items = mergeLedgerDisclosureItems(items, ledger, deadline);
    // Ledger merge can re-introduce family items — re-apply source gate (incl. confirm-none).
    items = gateItemsAgainstSource(items, input.bundleText);
    ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));
  }

  items = mergeContradictionActionItems(items, input, deadline);
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  items = collapseDisclosureItemsByFamily(items);
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  items = reconcileCad999ModalityItems(items, input.bundleText);
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  items = reconcileInterviewModalityItems(items, input.bundleText);
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  items = reconcilePhoneDownloadModalityItems(items, modalityHay);
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  items = reconcileSubscriberModalityItems(items, modalityHay);
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  items = reconcileMedicalReportModalityItems(items, input.bundleText);
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  const guardCtx = { ledger, bundleText: input.bundleText ?? null };
  items = items
    .filter(
      (item) =>
        !isAdminGuidanceLine(item.label) &&
        !isAdminGuidanceLine(item.evidenceAnchor ?? "") &&
        !isUnsafeOrNonMaterialChaseLine(item.label) &&
        !isWrongFamilyChaseLineForPlan(item.label, briefPlan.profile),
    )
    .map((item) => ({
      ...item,
      label: formatDisplayLabelCasing(normalizeRawLabel(item.label)),
      mergedFrom: familySafeMergedFrom(item, input.bundleText),
      evidenceAnchor: item.evidenceAnchor
        ? familySafeEvidenceAnchor(
            item.familyId,
            guardSolicitorLine(item.evidenceAnchor, guardCtx) ??
              (isAdminGuidanceLine(item.evidenceAnchor) ? null : formatDisplayLabelCasing(item.evidenceAnchor)),
          )
        : item.evidenceAnchor,
    }));
  items = collapseDisclosureItemsByFamily(items);
  // Final source gate after presentation merges — preserves confirm-none / drops absent families.
  items = gateItemsAgainstSource(items, input.bundleText);
  items = finalizeDisclosureChasePresentation(items);
  // Re-assert PDF-true phone/subscriber after finalize overflow — Brookes soft-mute residual:
  // collapse/finalize was rewriting digital cards into "Outstanding source material…".
  items = reconcilePhoneDownloadModalityItems(items, modalityHay);
  items = reconcileSubscriberModalityItems(items, modalityHay);
  // Re-assert interview recording≠PACE/custody after collapse/finalize (Court C1).
  items = reconcileInterviewModalityItems(items, input.bundleText);
  items = reconcileCad999ModalityItems(items, input.bundleText);
  items = reconcileMedicalReportModalityItems(items, input.bundleText);
  items = finalizeDisclosureChasePresentation(items);
  items = reconcileMedicalReportModalityItems(items, input.bundleText);
  items = dropGenericFurtherPapersWhenSpecificItemsExist(items);
  items = items.map((item) => ({
    ...item,
    evidenceAnchor: familySafeEvidenceAnchor(item.familyId, item.evidenceAnchor),
  }));
  items = reconcileChaseItemsAgainstServedMaterial(items, ledger);

  // Alias-suppress using live document-derived evidence rows (not hardcoded assumptions).
  if (input.canonicalEvidenceRows?.length) {
    items = items.filter((item) => {
      const verdict = shouldChaseRequestAgainstServedAliases(
        item.label,
        input.canonicalEvidenceRows!,
      );
      return verdict.chase;
    });
  }

  // Attach provenance limitations from canonical findings onto matching chase labels.
  if (input.canonicalFindings?.length) {
    items = items.map((item) => {
      const related = input.canonicalFindings!.find(
        (f) =>
          (f.referencedAbsent &&
            item.label
              .toLowerCase()
              .includes(f.referencedAbsent.referencedLabel.toLowerCase().slice(0, 12))) ||
          item.label.toLowerCase().includes(f.title.toLowerCase().slice(0, 10)),
      );
      if (!related) return item;
      const provenance = assertFindingProvenanceOrLimitation({
        sourceDocumentTitle: related.provenanceLine.split(" · ")[0] ?? null,
        evidenceState: "missing",
        unresolvedConflictOrLimitation: related.unresolved ? related.summary : null,
      });
      return {
        ...item,
        whyItMatters: item.whyItMatters
          ? `${item.whyItMatters} [${related.provenanceLine}]`
          : related.summary,
        evidenceAnchor: item.evidenceAnchor ?? related.provenanceLine,
        provenance,
      };
    });
  }

  // Canonical/source status is the boss: review-only rows must not become
  // due-soon/outstanding simply because there is a hearing date.
  items = applySnapshotStatusBoundaries(items, input);

  items = normalizeChaseOperationalStatuses(items);

  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  const linkedRoutes = [
    ...new Set(items.map((i) => i.linkedRoute).filter((r): r is string => Boolean(r?.trim()))),
  ];
  if (input.battleboard?.primary_route?.title && !linkedRoutes.includes(input.battleboard.primary_route.title)) {
    linkedRoutes.unshift(input.battleboard.primary_route.title);
  }

  const counters = computeCounters(items, {});

  const disclosureSummary =
    primaryItems.length > 0
      ? `${primaryItems.length} priority chase item${primaryItems.length === 1 ? "" : "s"} — source-material review`
      : items.length === 0
        ? "No source-material chase items safely detected"
        : items.length === 1
          ? "1 grouped chase item — provisional"
          : `${items.length} grouped chase items — provisional`;

  const brief: DisclosureChaseBrief = {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    clientLabel: input.clientLabel,
    allegation: input.allegation,
    stage: input.stage,
    hearingStatus: input.hearingStatus,
    bundleHealth: input.bundleHealth,
    positionStatus: input.positionStatus,
    disclosureSummary,
    safeCourtLine: (() => {
      const profileLine =
        isCriminalPilotMode() ? workflowDisclosureCaseWideLine(workflowContext) : null;
      let raw = profileLine ?? briefPlan.chaseAngle ?? resolveSafeCourtLine(input.battleboard);
      if (!isCriminalPilotMode()) {
        return input.bundleText?.trim()
          ? gateProseAgainstSource(sourceBoundCaseWideLine(raw, input.bundleText), input.bundleText)
          : raw;
      }
      raw = pilotCleanupVisibleText(
        sanitizePilotVisibleLine(raw, workflowContext) ?? raw,
      );
      return input.bundleText?.trim()
        ? gateProseAgainstSource(sourceBoundCaseWideLine(raw, input.bundleText), input.bundleText)
        : raw;
    })(),
    items,
    primaryItems,
    additionalItems,
    linkedRoutes,
    counters,
    hearingDeadlineNote: deadline.hearingDeadlineNote,
  };

  return guardDisclosureChaseBrief(brief, { ledger, bundleText: input.bundleText });
}

export function computeCounters(
  items: DisclosureChaseItem[],
  localStatus: Record<string, "Chased" | "Received">,
): DisclosureChaseCounters {
  let overdue = 0;
  let dueSoon = 0;
  let chased = 0;
  let received = 0;
  let notStarted = 0;

  for (const item of items) {
    const effective = effectiveStatus(item, localStatus);
    if (effective === "Received") received++;
    else if (effective === "Chased") chased++;
    else if (effective === "Overdue") overdue++;
    else if (effective === "Due soon") dueSoon++;
    else notStarted++;
  }

  return {
    total: items.length,
    overdue,
    dueSoon,
    chased,
    received,
    notStarted,
  };
}

export type ChaseFilterBucket = "all" | "overdue" | "due-soon" | "chased" | "received";

export function effectiveStatus(
  item: DisclosureChaseItem,
  localStatus: Record<string, "Chased" | "Received">,
): ChaseItemStatus {
  const local = localStatus[item.id];
  if (local === "Received") return "Received";
  if (local === "Chased") return "Chased";
  return clampChaseOperationalStatus(item);
}

export function matchesFilter(
  item: DisclosureChaseItem,
  filter: ChaseFilterBucket,
  localStatus: Record<string, "Chased" | "Received">,
): boolean {
  if (filter === "all") return true;
  const s = effectiveStatus(item, localStatus);
  if (filter === "overdue") return s === "Overdue";
  if (filter === "due-soon") return s === "Due soon";
  if (filter === "chased") return s === "Chased";
  if (filter === "received") return s === "Received";
  return true;
}
