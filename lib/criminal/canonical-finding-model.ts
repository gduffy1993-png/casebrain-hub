/**
 * Canonical finding model — every important finding carries document-relationship
 * state and mandatory provenance. Shared across Control Room, Charges, Key Facts,
 * truth map, Disclosure Chase, War Room, client/court/CPS wording, copy, export, API.
 * Generic rules only — no fixture-specific branches.
 */

import {
  attachFindingProvenance,
  classifyProvenanceCompleteness,
  pageProvenanceForSurface,
  type FindingProvenance,
  type FindingProvenanceInput,
  type ProvenanceCompleteness,
} from "@/lib/criminal/finding-provenance";
import {
  type ChangedFieldRecord,
  type DocumentLifecycleRole,
  type DocumentRelationshipNode,
  type ExhibitLabelCollision,
  type ReferencedAbsentAttachment,
  aliasProvesSameServedItem,
  compareOperativePrecedence,
} from "@/lib/criminal/document-relationship-model";
import {
  type SharedEvidenceState,
  shouldSuppressChaseAsAlreadyOnFile,
  type EvidenceStateRow,
} from "@/lib/criminal/evidence-state-reconcile";
import { AUTHORSHIP_NOT_ESTABLISHED_LIMITATION } from "@/lib/criminal/attribution-model";
import type { HearingLifecycle } from "@/lib/criminal/hearing-notice-lifecycle";
import {
  detectCustodyInterviewClockConflict,
  detectCustodyInterviewClockFromText,
  extractTimeTokens,
  analyseCustodyInterviewClocks,
  type ClockAnalysisResult,
} from "@/lib/criminal/timestamp-chronology";

export type CanonicalFindingKind =
  | "document_role"
  | "draft_vs_signed"
  | "recording_vs_transcript"
  | "referenced_absent_attachment"
  | "alias_already_served"
  | "exhibit_label_collision"
  | "custody_interview_clock"
  | "hearing_notice_lifecycle"
  | "evidence_state_contradiction"
  | "message_attribution"
  | "provenance_incomplete"
  | "generic";

export type CanonicalFinding = {
  kind: CanonicalFindingKind;
  severity: "critical" | "review" | "info";
  title: string;
  summary: string;
  /** Keep finding unresolved when provenance is incomplete or conflict is open. */
  unresolved: boolean;
  provenance: FindingProvenance;
  provenanceLine: string;
  documentRole?: DocumentLifecycleRole;
  earlierValuesPreserved?: ChangedFieldRecord[];
  recordingState?: SharedEvidenceState | null;
  transcriptState?: SharedEvidenceState | null;
  referencedAbsent?: ReferencedAbsentAttachment | null;
  exhibitCollision?: ExhibitLabelCollision | null;
  custodyInterviewClock?: {
    custodyTime: string | null;
    interviewTime: string | null;
    conflict: boolean;
    analysis?: ClockAnalysisResult | null;
  } | null;
  defendant?: string | null;
  countNumber?: number | null;
  /**
   * Every page that could support this finding. Populated when wording was located on
   * more than one page so no exit silently presents a single chosen anchor as certain.
   */
  supportingAnchors?: Array<{
    sourceDocumentTitle: string;
    sourceDocumentType: string | null;
    sourcePage: string | null;
    compiledPage: string | null;
    pageIdentityKnown: boolean;
  }>;
  /** Defendant/device/account/authorship scope, when the papers evidence it. */
  attribution?: FindingAttribution | null;
};

/**
 * Attribution scope carried by a finding. Each element is independently sourced:
 * possession of a device never implies authorship of its messages.
 */
export type FindingAttribution = {
  defendants: string[];
  /** True when material relates to a co-defendant and may contaminate this defendant. */
  coDefendantContamination: boolean;
  deviceOwner: string | null;
  accountHolder: string | null;
  messageAuthor: string | null;
  /** Why authorship is or is not established. */
  authorshipBasis: "attributed" | "not_established" | "not_applicable";
  limitation: string | null;
};

export type CustodyInterviewClockInput = {
  custodyTimes: string[];
  interviewTimes: string[];
};

export {
  extractTimeTokens,
  detectCustodyInterviewClockConflict,
  detectCustodyInterviewClockFromText,
  analyseCustodyInterviewClocks,
};

function baseFinding(
  kind: CanonicalFindingKind,
  title: string,
  summary: string,
  provenanceInput: FindingProvenanceInput,
  extra?: Partial<CanonicalFinding>,
): CanonicalFinding {
  const attached = attachFindingProvenance(provenanceInput);
  return {
    kind,
    severity: extra?.severity ?? "review",
    title,
    summary,
    unresolved: attached.unresolved || Boolean(extra?.unresolved),
    provenance: attached.provenance,
    provenanceLine: attached.line,
    ...extra,
  };
}

export function findingForDocumentRole(input: {
  operative: DocumentRelationshipNode;
  earlier?: DocumentRelationshipNode | null;
  defendant?: string | null;
  countNumber?: number | null;
}): CanonicalFinding {
  const earlier = input.earlier;
  const summary = earlier
    ? `${input.operative.role} document "${input.operative.title ?? input.operative.id}" is current; earlier "${earlier.title ?? earlier.id}" (${earlier.role}) preserved alongside.`
    : `Document role ${input.operative.role} for "${input.operative.title ?? input.operative.id}".`;
  return baseFinding(
    "document_role",
    "Document lifecycle role",
    summary,
    {
      sourceDocumentTitle: input.operative.title,
      sourceDocumentType: input.operative.documentType,
      sourcePage: input.operative.sourcePage,
      compiledPage: input.operative.compiledPage,
      pageIdentityKnown: input.operative.pageIdentityKnown,
      evidenceState: input.operative.evidenceState,
      defendant: input.defendant,
      countNumber: input.countNumber,
    },
    {
      documentRole: input.operative.role,
      earlierValuesPreserved: input.operative.changedFields,
      defendant: input.defendant,
      countNumber: input.countNumber,
    },
  );
}

export function findingForDraftVersusSigned(input: {
  draftLabel: string;
  signedLabel: string;
  changedFields: ChangedFieldRecord[];
  provenance?: FindingProvenanceInput;
}): CanonicalFinding {
  const fields = input.changedFields.map((c) => `${c.field}: "${c.earlierValue}" → "${c.laterValue}"`).join("; ");
  return baseFinding(
    "draft_vs_signed",
    "Draft versus signed version change",
    input.changedFields.length
      ? `Draft (${input.draftLabel}) and signed (${input.signedLabel}) differ — ${fields}. Earlier values preserved.`
      : `Draft (${input.draftLabel}) and signed (${input.signedLabel}) compared; no field diffs extracted.`,
    {
      ...(input.provenance ?? {}),
      evidenceState: input.provenance?.evidenceState ?? "needs_review",
    },
    {
      severity: input.changedFields.length ? "critical" : "info",
      earlierValuesPreserved: input.changedFields,
      unresolved: true,
    },
  );
}

export function findingForRecordingVersusTranscript(input: {
  recordingState: SharedEvidenceState;
  transcriptState: SharedEvidenceState;
  provenance?: FindingProvenanceInput;
}): CanonicalFinding {
  const recordingServed = input.recordingState === "served";
  const transcriptIncomplete =
    input.transcriptState === "incomplete" ||
    input.transcriptState === "missing" ||
    input.transcriptState === "referred_only";
  const summary = recordingServed && transcriptIncomplete
    ? `Interview recording is ${input.recordingState}; transcript is ${input.transcriptState}. Served recording does not prove transcript completeness.`
    : `Recording state ${input.recordingState}; transcript state ${input.transcriptState}.`;
  return baseFinding(
    "recording_vs_transcript",
    "Recording service versus transcript completeness",
    summary,
    {
      ...(input.provenance ?? {}),
      evidenceState: input.transcriptState,
    },
    {
      severity: recordingServed && transcriptIncomplete ? "critical" : "review",
      recordingState: input.recordingState,
      transcriptState: input.transcriptState,
      unresolved: recordingServed && transcriptIncomplete,
    },
  );
}

export function findingForReferencedAbsentAttachment(
  ref: ReferencedAbsentAttachment,
  provenance?: FindingProvenanceInput,
): CanonicalFinding {
  return baseFinding(
    "referenced_absent_attachment",
    "Referenced but absent attachment",
    `"${ref.referencedLabel}" is referenced in ${ref.referencedIn} but is ${ref.onFileState} on file.`,
    {
      ...(provenance ?? {}),
      evidenceState: ref.onFileState,
    },
    {
      severity: "critical",
      referencedAbsent: ref,
      unresolved: true,
    },
  );
}

export function findingForExhibitLabelCollision(
  collision: ExhibitLabelCollision,
  provenance?: FindingProvenanceInput,
): CanonicalFinding {
  return baseFinding(
    "exhibit_label_collision",
    "Exhibit label collision",
    `Exhibit label ${collision.label} is bound to ${collision.occurrences.length} distinct descriptions — do not merge.`,
    {
      ...(provenance ?? {}),
      evidenceState: "not_safely_confirmed",
    },
    {
      severity: "critical",
      exhibitCollision: collision,
      unresolved: true,
    },
  );
}

export function findingForCustodyInterviewClock(input: {
  custodyTime: string | null;
  interviewTime: string | null;
  conflict: boolean;
  analysis?: ClockAnalysisResult | null;
  provenance?: FindingProvenanceInput;
}): CanonicalFinding {
  let summary = "Custody and interview times compared; no conflict extracted.";
  if (input.conflict) {
    if (input.analysis?.impossibleChronology[0]) {
      summary = `${input.analysis.impossibleChronology[0].reason}. Affirmative PACE OK / no-breach is forbidden.`;
    } else if (input.analysis?.sameEventConflicts[0]) {
      const c = input.analysis.sameEventConflicts[0];
      const times = c.observations.map((o) => o.rawTime).join(" vs ");
      summary = `Competing timestamps for the same event (${c.eventIdentity}): ${times}. Affirmative PACE OK / no-breach is forbidden.`;
    } else {
      summary = `Scoped clock conflict involving custody (${input.custodyTime ?? "unknown"}) and interview (${input.interviewTime ?? "unknown"}). Affirmative PACE OK / no-breach is forbidden.`;
    }
  }
  return baseFinding(
    "custody_interview_clock",
    "Custody / interview clock",
    summary,
    {
      ...(input.provenance ?? {}),
      evidenceState: input.conflict ? "not_safely_confirmed" : input.provenance?.evidenceState ?? "served",
    },
    {
      severity: input.conflict ? "critical" : "info",
      custodyInterviewClock: {
        custodyTime: input.custodyTime,
        interviewTime: input.interviewTime,
        conflict: input.conflict,
        analysis: input.analysis ?? null,
      },
      unresolved: input.conflict,
    },
  );
}

/**
 * Hearing lifecycle: the later notice governs, the earlier notice stays visible, and a
 * disagreement about the hearing date stays unresolved rather than being overwritten.
 */
export function findingForHearingLifecycle(input: {
  lifecycle: HearingLifecycle;
  provenance?: FindingProvenanceInput;
}): CanonicalFinding {
  const { latest, superseded, conflict, conflictDescription, basis } = input.lifecycle;
  const latestLabel = latest
    ? `${latest.documentTitle}${latest.hearingDateRaw ? ` (${latest.hearingDateRaw})` : ""}`
    : "no notice identified";
  const earlierLabel = superseded
    .map((n) => `${n.documentTitle}${n.hearingDateRaw ? ` (${n.hearingDateRaw})` : ""}`)
    .join("; ");
  const summary = superseded.length
    ? `Latest hearing notice: ${latestLabel} (selected by ${basis.replace(/_/g, " ")}). Earlier notice preserved: ${earlierLabel}.${conflict ? ` ${conflictDescription}` : ""}`
    : `Hearing notice: ${latestLabel}.`;

  return baseFinding(
    "hearing_notice_lifecycle",
    "Hearing notice lifecycle",
    summary,
    {
      ...(input.provenance ?? {}),
      evidenceState: input.provenance?.evidenceState ?? (conflict ? "not_safely_confirmed" : "served"),
      unresolvedConflictOrLimitation:
        input.provenance?.unresolvedConflictOrLimitation ?? conflictDescription ?? null,
    },
    {
      severity: conflict ? "critical" : "info",
      unresolved: conflict,
    },
  );
}

/**
 * A served/missing disagreement about the same item is never silently resolved —
 * it is reported so no exit can present either state as settled.
 */
export function findingForEvidenceStateContradiction(input: {
  label: string;
  states: string[];
  description: string;
  provenance?: FindingProvenanceInput;
}): CanonicalFinding {
  return baseFinding(
    "evidence_state_contradiction",
    "Contradictory evidence state",
    input.description,
    {
      ...(input.provenance ?? {}),
      evidenceState: "not_safely_confirmed",
      unresolvedConflictOrLimitation:
        input.provenance?.unresolvedConflictOrLimitation ?? input.description,
    },
    { severity: "critical", unresolved: true },
  );
}

/**
 * Authorship of individual messages. Device possession and account association are
 * carried as separate facts and must never be read as authorship.
 */
export function findingForMessageAttribution(input: {
  person: string;
  ownsDevice: boolean;
  holdsAccount: boolean;
  authorshipEstablished: boolean;
  provenance?: FindingProvenanceInput;
  attribution?: FindingAttribution | null;
}): CanonicalFinding {
  const facts: string[] = [];
  if (input.ownsDevice) facts.push("device attributed to this person");
  if (input.holdsAccount) facts.push("account/subscriber associated with this person");
  const summary = input.authorshipEstablished
    ? `Message authorship is expressly attributed to ${input.person}${facts.length ? ` (${facts.join("; ")})` : ""}.`
    : `${facts.length ? `${facts.join("; ")} for ${input.person}. ` : ""}Authorship of individual messages is not established — possession of a device or association with an account does not show who wrote a message.`;

  return baseFinding(
    "message_attribution",
    "Device, account and message authorship",
    summary,
    {
      ...(input.provenance ?? {}),
      defendant: input.provenance?.defendant ?? input.person,
      evidenceState: input.provenance?.evidenceState ?? "not_safely_confirmed",
      unresolvedConflictOrLimitation: input.authorshipEstablished
        ? (input.provenance?.unresolvedConflictOrLimitation ?? null)
        : AUTHORSHIP_NOT_ESTABLISHED_LIMITATION,
    },
    {
      severity: input.authorshipEstablished ? "review" : "critical",
      unresolved: !input.authorshipEstablished,
      attribution: input.attribution ?? null,
    },
  );
}

/**
 * Safety: never chase an alias already proved to be the same served item.
 */
export function shouldChaseRequestAgainstServedAliases(
  requestLabel: string,
  servedRows: EvidenceStateRow[],
): { chase: boolean; reason: string | null } {
  for (const row of servedRows) {
    if (row.state !== "served") continue;
    if (aliasProvesSameServedItem({ label: requestLabel }, { label: row.label, state: "served" })) {
      return { chase: false, reason: `${row.label} is a served alias of this request — do not chase` };
    }
  }
  const suppressed = shouldSuppressChaseAsAlreadyOnFile(requestLabel, servedRows);
  if (suppressed.suppress) {
    return { chase: false, reason: suppressed.reason };
  }
  return { chase: true, reason: null };
}

/**
 * Build the set of important findings from relationship + clock + evidence inputs.
 */
export function buildCanonicalFindings(input: {
  documentNodes?: DocumentRelationshipNode[];
  draftVersusSigned?: {
    draftLabel: string;
    signedLabel: string;
    changedFields: ChangedFieldRecord[];
    provenance?: FindingProvenanceInput;
  } | null;
  recordingVersusTranscript?: {
    recordingState: SharedEvidenceState;
    transcriptState: SharedEvidenceState;
    provenance?: FindingProvenanceInput;
  } | null;
  referencedAbsent?: ReferencedAbsentAttachment[];
  exhibitCollisions?: ExhibitLabelCollision[];
  custodyInterviewClock?: {
    custodyTime: string | null;
    interviewTime: string | null;
    conflict: boolean;
    analysis?: ClockAnalysisResult | null;
    provenance?: FindingProvenanceInput;
  } | null;
  hearingLifecycle?: {
    lifecycle: HearingLifecycle;
    provenance?: FindingProvenanceInput;
  } | null;
  evidenceStateContradictions?: Array<{
    label: string;
    states: string[];
    description: string;
    provenance?: FindingProvenanceInput;
  }>;
  messageAttribution?: Array<{
    person: string;
    ownsDevice: boolean;
    holdsAccount: boolean;
    authorshipEstablished: boolean;
    provenance?: FindingProvenanceInput;
    attribution?: FindingAttribution | null;
  }>;
  defendant?: string | null;
  countNumber?: number | null;
}): CanonicalFinding[] {
  const findings: CanonicalFinding[] = [];

  const nodes = input.documentNodes ?? [];
  // Deterministic selection — never the first amended/operative node in array order.
  const amendedOrOperative = nodes
    .filter((n) => n.role === "amended" || n.role === "operative")
    .reduce<DocumentRelationshipNode | null>(
      (best, n) => (best == null || compareOperativePrecedence(n, best) > 0 ? n : best),
      null,
    );
  const earlier = nodes.find((n) => n.role === "superseded" || n.id === amendedOrOperative?.earlierDocumentId);
  if (amendedOrOperative) {
    findings.push(
      findingForDocumentRole({
        operative: amendedOrOperative,
        earlier: earlier ?? null,
        defendant: input.defendant,
        countNumber: input.countNumber,
      }),
    );
  }

  if (input.draftVersusSigned) {
    findings.push(findingForDraftVersusSigned(input.draftVersusSigned));
  }
  if (input.recordingVersusTranscript) {
    findings.push(findingForRecordingVersusTranscript(input.recordingVersusTranscript));
  }
  for (const ref of input.referencedAbsent ?? []) {
    findings.push(findingForReferencedAbsentAttachment(ref));
  }
  for (const coll of input.exhibitCollisions ?? []) {
    findings.push(findingForExhibitLabelCollision(coll));
  }
  if (input.custodyInterviewClock) {
    findings.push(findingForCustodyInterviewClock(input.custodyInterviewClock));
  }
  if (input.hearingLifecycle?.lifecycle.latest) {
    findings.push(findingForHearingLifecycle(input.hearingLifecycle));
  }
  for (const contradiction of input.evidenceStateContradictions ?? []) {
    findings.push(findingForEvidenceStateContradiction(contradiction));
  }
  for (const attribution of input.messageAttribution ?? []) {
    findings.push(findingForMessageAttribution(attribution));
  }

  // Any finding without sufficient provenance stays unresolved and visible.
  return findings.map((f) =>
    f.unresolved || f.provenance.unresolvedConflictOrLimitation
      ? { ...f, unresolved: true }
      : f,
  );
}

/** Copy/export/API-safe serialisation of a finding. */
export function serializeCanonicalFindingForSurface(f: CanonicalFinding): {
  kind: CanonicalFindingKind;
  title: string;
  summary: string;
  unresolved: boolean;
  provenanceLine: string;
  defendant: string | null;
  countNumber: number | null;
  /** Page provenance travels with the finding on every exit. */
  sourcePage: string | null;
  compiledPage: string | null;
  pageLabel: string | null;
  pageIdentityKnown: boolean;
  pageIdentityNote: string | null;
  provenanceCompleteness: ProvenanceCompleteness;
  candidateAnchors: Array<{
    sourceDocumentTitle: string;
    sourcePage: string | null;
    compiledPage: string | null;
    pageIdentityKnown: boolean;
  }>;
  attribution: FindingAttribution | null;
} {
  const page = pageProvenanceForSurface(f.provenance);
  return {
    kind: f.kind,
    title: f.title,
    summary: f.summary,
    unresolved: f.unresolved,
    provenanceLine: f.provenanceLine,
    defendant: f.defendant ?? f.provenance.defendant,
    countNumber: f.countNumber ?? f.provenance.countNumber,
    sourcePage: page.sourcePage,
    compiledPage: page.compiledPage,
    pageLabel: page.pageLabel,
    pageIdentityKnown: page.pageIdentityKnown,
    pageIdentityNote: page.pageIdentityNote,
    provenanceCompleteness: classifyProvenanceCompleteness(f.provenance),
    candidateAnchors: (f.supportingAnchors ?? []).map((a) => ({
      sourceDocumentTitle: a.sourceDocumentTitle,
      sourcePage: a.sourcePage,
      compiledPage: a.compiledPage,
      pageIdentityKnown: a.pageIdentityKnown,
    })),
    attribution: f.attribution ?? null,
  };
}
