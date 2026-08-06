/**
 * Batch-9 behavioural fixture matrix — 37 controls × positive/negative/unavailable/mutation.
 * Every fixture must be executed via evaluateBatch9Control / buildBatch9ExerciseReceipt.
 */

import { BATCH9_CONTROL_IDS, BATCH9_SPEC_BY_ID } from "./control-specs";

export type Batch9FixtureKind = "positive" | "negative" | "unavailable" | "mutation";

export type Batch9PositiveExpect = {
  exerciseStatus: "evaluated";
  findingCount: 0;
};

export type Batch9NegativeExpect = {
  exerciseStatus: "evaluated" | "unresolved";
  minFindingCount: number;
  findingCode: string;
  evidenceRefIncludes: string[];
};

export type Batch9UnavailableExpect = {
  exerciseStatus: "not_exercised";
  missingInputReasonIncludes: string;
};

export type Batch9MutationExpect = {
  /** Must differ from positive outcome (status and/or findingCount). */
  differsFromPositive: true;
  mutatedField: string;
};

export type Batch9BehaviouralFixtureEntry = {
  controlId: string;
  positive: { output: Record<string, unknown>; expect: Batch9PositiveExpect };
  negative: { output: Record<string, unknown>; expect: Batch9NegativeExpect };
  unavailable: { output: Record<string, unknown>; expect: Batch9UnavailableExpect };
  mutation: {
    /** Start from positive output, apply mutation. */
    mutate: (positiveOutput: Record<string, unknown>) => Record<string, unknown>;
    expect: Batch9MutationExpect;
  };
};

function baseShell(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    caseId: "fixture-b9-behavioural",
    courtNote: {
      text: "Court line.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
      blockedReason: null,
    },
    exportVersion: {
      exportId: "exp-1",
      generatedAt: "2026-01-01T00:00:00Z",
      sendability: "needs_solicitor_review",
      reviewFooter: "Review required",
    },
    fiveAnswersEvidenceRows: [],
    evidenceStates: [],
    warningsAndGaps: { chaseItems: [], doNotOverstate: [] },
    ...over,
  };
}

function instrument(over: Record<string, unknown> = {}) {
  return {
    instrumentId: "inst-1",
    instrumentType: "MG5",
    exactWording: "Theft contrary to Theft Act 1968 s.1",
    count: 1,
    defendantAllocation: "D1",
    sourceDocument: "mg5.pdf",
    sourcePage: "2",
    pageIdentityKnown: true,
    status: "operative",
    version: "1",
    replacesInstrumentId: null,
    supersededByInstrumentId: null,
    ...over,
  };
}

function sevenExits(extra: Record<string, unknown> = {}) {
  return Object.fromEntries(
    ["view", "copy", "export", "api", "pdf", "composed_prose", "authenticated_browser"].map((id) => [
      id,
      {
        payloadIdentity: `sha256:${id}`,
        sendability: id === "view" ? "blocked" : id === "copy" ? "sendable" : "ok",
        unavailableReason: null,
        ...extra,
      },
    ]),
  );
}

function evidenceUnit(over: Record<string, unknown> = {}) {
  return {
    label: "CCTV clip",
    existence: "served",
    reliability: "reliable",
    evidenceUnitId: "eu-1",
    subjectDefendantId: "person-d1",
    sourcePage: "12",
    pageIdentityKnown: true,
    sourceDocument: "bundle.pdf",
    ...over,
  };
}

function provenanceRow(over: Record<string, unknown> = {}) {
  return {
    label: "CCTV",
    inferredSourceState: "served",
    source: "bundle.pdf",
    evidenceAnchor: "p.12",
    sourcePage: "12",
    compiledPage: "12",
    pageIdentityKnown: true,
    ...over,
  };
}

function chronoComplete(events: Array<Record<string, unknown>>) {
  return baseShell({ chronologyEvents: events });
}

function chaseComplete(over: Record<string, unknown> = {}) {
  return baseShell({
    warningsAndGaps: {
      chaseItems: [
        {
          label: "CCTV clip",
          requestId: "req-1",
          evidenceUnitId: "eu-1",
          resolutionState: "outstanding",
          sendabilityLabel: "x",
          copySuggestion: "y",
          ...over,
        },
      ],
      doNotOverstate: [],
    },
    evidenceStates: [
      { label: "Other", inferredSourceState: "served", source: "a.pdf", evidenceAnchor: "p.1" },
    ],
  });
}

function fc(controlId: string): string {
  return BATCH9_SPEC_BY_ID.get(controlId)!.findingCode;
}

function chargePos(over: Record<string, unknown> = {}) {
  return baseShell({ chargeInstruments: [instrument(over)] });
}

function chargeEntry(
  controlId: string,
  args: {
    positiveOver?: Record<string, unknown>;
    negativeOver: Record<string, unknown>;
    evidenceRefIncludes: string[];
    mutate: (o: Record<string, unknown>) => Record<string, unknown>;
    mutatedField: string;
    unavailableReasonIncludes?: string;
    negativeMin?: number;
    negativeStatus?: "evaluated" | "unresolved";
  },
): Batch9BehaviouralFixtureEntry {
  return {
    controlId,
    positive: {
      output: chargePos(args.positiveOver),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: chargePos(args.negativeOver),
      expect: {
        exerciseStatus: args.negativeStatus ?? "evaluated",
        minFindingCount: args.negativeMin ?? 1,
        findingCode: fc(controlId),
        evidenceRefIncludes: args.evidenceRefIncludes,
      },
    },
    unavailable: {
      output: baseShell(),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: args.unavailableReasonIncludes ?? "charge_instruments",
      },
    },
    mutation: {
      mutate: args.mutate,
      expect: { differsFromPositive: true, mutatedField: args.mutatedField },
    },
  };
}

const MATRIX: Record<string, Batch9BehaviouralFixtureEntry> = {
  "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE": chargeEntry("MAA2-CHG-01-RECORDED-SOURCE-VISIBLE", {
    negativeOver: { sourceDocument: "unknown" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.sourceDocument = null;
      return bag;
    },
    mutatedField: "chargeInstruments[0].sourceDocument",
  }),
  "MAA2-CHG-02-DEFENDANT-COUNT-ALLOC": chargeEntry("MAA2-CHG-02-DEFENDANT-COUNT-ALLOC", {
    negativeOver: { defendantAllocation: "unallocated" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.count = null;
      return bag;
    },
    mutatedField: "chargeInstruments[0].count",
  }),
  "MAA2-CHG-04-COMPLETE-NOT-TRUNCATED": chargeEntry("MAA2-CHG-04-COMPLETE-NOT-TRUNCATED", {
    negativeOver: { exactWording: "Theft contrary to Thef-" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.exactWording = "Theft contrary to Thef-";
      return bag;
    },
    mutatedField: "chargeInstruments[0].exactWording",
  }),
  "MAA2-CHG-05-OPERATIVE-INSTRUMENT": chargeEntry("MAA2-CHG-05-OPERATIVE-INSTRUMENT", {
    positiveOver: { status: "amended operative" },
    negativeOver: { status: "draft operative" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.status = "draft operative";
      return bag;
    },
    mutatedField: "chargeInstruments[0].status",
  }),
  "MAA2-CHG-06-AMENDMENT-HISTORY": chargeEntry("MAA2-CHG-06-AMENDMENT-HISTORY", {
    positiveOver: { replacesInstrumentId: "inst-0", version: "2" },
    negativeOver: { replacesInstrumentId: "inst-1", instrumentId: "inst-1", version: "2" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.replacesInstrumentId = "inst-1";
      return bag;
    },
    mutatedField: "chargeInstruments[0].replacesInstrumentId",
  }),
  "MAA2-CHG-10-WARNING-INSEPARABLE": {
    controlId: "MAA2-CHG-10-WARNING-INSEPARABLE",
    positive: {
      output: baseShell({
        chargeInstruments: [instrument()],
        exitPayloadReceipts: sevenExits({ chargeWarningAttached: true }),
      }),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: (() => {
        const exits = sevenExits({ chargeWarningAttached: true });
        (exits.view as Record<string, unknown>).chargeWarningAttached = false;
        return baseShell({ chargeInstruments: [instrument()], exitPayloadReceipts: exits });
      })(),
      expect: {
        exerciseStatus: "evaluated",
        minFindingCount: 1,
        findingCode: fc("MAA2-CHG-10-WARNING-INSEPARABLE"),
        evidenceRefIncludes: ["/exitPayloadReceipts/view"],
      },
    },
    unavailable: {
      output: baseShell({
        chargeInstruments: [instrument()],
        exitPayloadReceipts: sevenExits(),
      }),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "chargeWarningAttached",
      },
    },
    mutation: {
      mutate: (o) => {
        const bag = structuredClone(o);
        const exits = bag.exitPayloadReceipts as Record<string, Record<string, unknown>>;
        exits.view.chargeWarningAttached = false;
        return bag;
      },
      expect: { differsFromPositive: true, mutatedField: "exitPayloadReceipts.view.chargeWarningAttached" },
    },
  },
  "MAA2-LSL-01-STATEMENT-CLASSIFICATION": chargeEntry("MAA2-LSL-01-STATEMENT-CLASSIFICATION", {
    positiveOver: { statementClassification: "allegation" },
    negativeOver: { statementClassification: "allegation_as_fact" },
    evidenceRefIncludes: ["/chargeInstruments"],
    unavailableReasonIncludes: "statementClassification",
    mutate: (o) => {
      const bag = structuredClone(o);
      delete (bag.chargeInstruments as Record<string, unknown>[])[0]!.statementClassification;
      return bag;
    },
    mutatedField: "chargeInstruments[0].statementClassification",
  }),
  "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING": chargeEntry("MAA2-LSL-03-NO-SUBMISSION-TO-FINDING", {
    positiveOver: { legalStateRole: "submission" },
    negativeOver: { legalStateRole: "submission_as_finding" },
    evidenceRefIncludes: ["/chargeInstruments"],
    unavailableReasonIncludes: "legalStateRole",
    mutate: (o) => {
      const bag = structuredClone(o);
      delete (bag.chargeInstruments as Record<string, unknown>[])[0]!.legalStateRole;
      return bag;
    },
    mutatedField: "chargeInstruments[0].legalStateRole",
  }),
  "MAA2-BND-02-INSTRUMENT-STATUS": chargeEntry("MAA2-BND-02-INSTRUMENT-STATUS", {
    negativeOver: { status: "unknown" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.status = "unknown";
      return bag;
    },
    mutatedField: "chargeInstruments[0].status",
  }),
  "MAA2-BND-03-REPLACEMENT-LINKS": chargeEntry("MAA2-BND-03-REPLACEMENT-LINKS", {
    positiveOver: { replacesInstrumentId: "inst-0", supersededByInstrumentId: "inst-2" },
    negativeOver: { replacesInstrumentId: "inst-x", supersededByInstrumentId: "inst-x" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.supersededByInstrumentId = "inst-0";
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.replacesInstrumentId = "inst-0";
      return bag;
    },
    mutatedField: "chargeInstruments[0].replacesInstrumentId/supersededByInstrumentId",
  }),
  "MAA2-BND-04-VERSION-PRECEDENCE": chargeEntry("MAA2-BND-04-VERSION-PRECEDENCE", {
    positiveOver: { replacesInstrumentId: "inst-0" },
    negativeOver: { replacesInstrumentId: "inst-1", instrumentId: "inst-1" },
    evidenceRefIncludes: ["/chargeInstruments"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chargeInstruments as Record<string, unknown>[])[0]!.replacesInstrumentId = "inst-1";
      return bag;
    },
    mutatedField: "chargeInstruments[0].replacesInstrumentId",
  }),
};

function evidenceEntry(
  controlId: string,
  args: {
    positiveRows: Record<string, unknown>[];
    negativeRows: Record<string, unknown>[];
    evidenceRefIncludes: string[];
    mutate: (o: Record<string, unknown>) => Record<string, unknown>;
    mutatedField: string;
    negativeStatus?: "evaluated" | "unresolved";
  },
): Batch9BehaviouralFixtureEntry {
  return {
    controlId,
    positive: {
      output: baseShell({ fiveAnswersEvidenceRows: args.positiveRows, evidenceStates: [] }),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: baseShell({ fiveAnswersEvidenceRows: args.negativeRows, evidenceStates: [] }),
      expect: {
        exerciseStatus: args.negativeStatus ?? "evaluated",
        minFindingCount: 1,
        findingCode: fc(controlId),
        evidenceRefIncludes: args.evidenceRefIncludes,
      },
    },
    unavailable: {
      output: baseShell({
        fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "served", reliability: "x" }],
        evidenceStates: [],
      }),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "evidence_units",
      },
    },
    mutation: {
      mutate: args.mutate,
      expect: { differsFromPositive: true, mutatedField: args.mutatedField },
    },
  };
}

Object.assign(MATRIX, {
  "MAA2-ATR-01-DEFENDANT-SEPARATION": evidenceEntry("MAA2-ATR-01-DEFENDANT-SEPARATION", {
    positiveRows: [evidenceUnit()],
    negativeRows: [evidenceUnit({ subjectDefendantId: "mixed/D1+D2" })],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.subjectDefendantId = "mixed";
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[0].subjectDefendantId",
  }),
  "MAA2-ATR-08-NO-DEFENDANT-BLEED": evidenceEntry("MAA2-ATR-08-NO-DEFENDANT-BLEED", {
    positiveRows: [evidenceUnit()],
    negativeRows: [evidenceUnit({ subjectDefendantId: "D1 and D2" })],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.subjectDefendantId = "all";
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[0].subjectDefendantId",
  }),
  "MAA2-BND-07-ALIAS-SAFE-COLLAPSE": evidenceEntry("MAA2-BND-07-ALIAS-SAFE-COLLAPSE", {
    positiveRows: [
      evidenceUnit({ evidenceUnitId: "eu-1", aliases: ["cam-a"] }),
      evidenceUnit({
        evidenceUnitId: "eu-2",
        label: "Other clip",
        aliases: ["cam-b"],
        subjectDefendantId: "person-d1",
      }),
    ],
    negativeRows: [
      evidenceUnit({ evidenceUnitId: "eu-1", aliases: ["shared-cam"] }),
      evidenceUnit({
        evidenceUnitId: "eu-2",
        label: "Other clip",
        aliases: ["shared-cam"],
        subjectDefendantId: "person-d1",
      }),
    ],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[1]!.aliases = ["cam-a"];
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[1].aliases",
  }),
  "MAA2-BND-08-EXTRACT-VS-FULL": evidenceEntry("MAA2-BND-08-EXTRACT-VS-FULL", {
    positiveRows: [evidenceUnit({ label: "Witness statement", modality: "statement" })],
    negativeRows: [
      evidenceUnit({
        label: "extract full bundle",
        evidenceTypeOrModality: "extract full",
        modality: "extract full",
      }),
    ],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    mutate: (o) => {
      const bag = structuredClone(o);
      const row = (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!;
      row.label = "extract full bundle";
      row.modality = "extract full";
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[0].modality/label",
  }),
  "MAA2-BND-09-STILL-CLIP-VS-MASTER": evidenceEntry("MAA2-BND-09-STILL-CLIP-VS-MASTER", {
    positiveRows: [evidenceUnit({ label: "Still image", modality: "still" })],
    negativeRows: [evidenceUnit({ label: "still master reel", modality: "still master" })],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.label = "still master reel";
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.modality = "still master";
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[0].label",
  }),
  "MAA2-BND-10-RECORDING-VS-TRANSCRIPT": evidenceEntry("MAA2-BND-10-RECORDING-VS-TRANSCRIPT", {
    positiveRows: [evidenceUnit({ label: "Interview recording", modality: "recording" })],
    negativeRows: [
      evidenceUnit({ label: "recording transcript pack", modality: "recording transcript" }),
    ],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.label = "recording transcript pack";
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.modality = "recording transcript";
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[0].label",
  }),
  "MAA2-BND-11-DRAFT-VS-SIGNED": evidenceEntry("MAA2-BND-11-DRAFT-VS-SIGNED", {
    positiveRows: [evidenceUnit({ label: "Signed statement", modality: "signed" })],
    negativeRows: [evidenceUnit({ label: "draft signed statement", modality: "draft signed" })],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.label = "draft signed statement";
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.modality = "draft signed";
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[0].label",
  }),
  "MAA2-EVS-04-REASON-TAXONOMY": evidenceEntry("MAA2-EVS-04-REASON-TAXONOMY", {
    positiveRows: [evidenceUnit({ existence: "served pending CPS because taxonomy" })],
    negativeRows: [evidenceUnit({ existence: "unknown" })],
    evidenceRefIncludes: ["/fiveAnswersEvidenceRows"],
    negativeStatus: "unresolved",
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.fiveAnswersEvidenceRows as Record<string, unknown>[])[0]!.existence = "unknown";
      return bag;
    },
    mutatedField: "fiveAnswersEvidenceRows[0].existence",
  }),
});

function chronoEntry(
  controlId: string,
  args: {
    positiveEvents: Array<Record<string, unknown>>;
    negativeEvents: Array<Record<string, unknown>>;
    evidenceRefIncludes: string[];
    mutate: (o: Record<string, unknown>) => Record<string, unknown>;
    mutatedField: string;
    negativeStatus?: "evaluated" | "unresolved";
  },
): Batch9BehaviouralFixtureEntry {
  return {
    controlId,
    positive: {
      output: chronoComplete(args.positiveEvents),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: chronoComplete(args.negativeEvents),
      expect: {
        exerciseStatus: args.negativeStatus ?? "evaluated",
        minFindingCount: 1,
        findingCode: fc(controlId),
        evidenceRefIncludes: args.evidenceRefIncludes,
      },
    },
    unavailable: {
      output: baseShell(),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "chronology_events",
      },
    },
    mutation: {
      mutate: args.mutate,
      expect: { differsFromPositive: true, mutatedField: args.mutatedField },
    },
  };
}

const chronoBase = (over: Record<string, unknown> = {}) => ({
  eventId: "ev-1",
  eventType: "hearing",
  timestamp: "2026-01-01T12:00:00Z",
  timezone: "Europe/London",
  source: "list",
  confidence: "high",
  ...over,
});

Object.assign(MATRIX, {
  "MAA2-CHR-01-EXACT-DATES-TZ": chronoEntry("MAA2-CHR-01-EXACT-DATES-TZ", {
    positiveEvents: [chronoBase()],
    negativeEvents: [chronoBase({ timezone: "local" })],
    evidenceRefIncludes: ["/chronologyEvents"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chronologyEvents as Record<string, unknown>[])[0]!.timezone = "unknown";
      return bag;
    },
    mutatedField: "chronologyEvents[0].timezone",
  }),
  "MAA2-CHR-02-COMPETING-TIMESTAMPS": chronoEntry("MAA2-CHR-02-COMPETING-TIMESTAMPS", {
    positiveEvents: [chronoBase({ competingEventGroupId: "g1", confidence: "high" })],
    negativeEvents: [chronoBase({ competingEventGroupId: "g1", confidence: null })],
    evidenceRefIncludes: ["/chronologyEvents"],
    negativeStatus: "unresolved",
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chronologyEvents as Record<string, unknown>[])[0]!.confidence = null;
      return bag;
    },
    mutatedField: "chronologyEvents[0].confidence",
  }),
  "MAA2-CHR-03-IMPOSSIBLE-CHRONOLOGY": chronoEntry("MAA2-CHR-03-IMPOSSIBLE-CHRONOLOGY", {
    positiveEvents: [
      chronoBase({ eventId: "a", eventType: "arrest", timestamp: "2026-01-01T10:00:00Z" }),
      chronoBase({ eventId: "h", eventType: "hearing", timestamp: "2026-02-01T10:00:00Z" }),
    ],
    negativeEvents: [
      chronoBase({ eventId: "a", eventType: "arrest", timestamp: "2026-02-01T10:00:00Z" }),
      chronoBase({ eventId: "h", eventType: "hearing", timestamp: "2026-01-01T10:00:00Z" }),
    ],
    evidenceRefIncludes: ["/chronologyEvents"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chronologyEvents as Record<string, unknown>[])[0]!.timestamp = "2026-03-01T10:00:00Z";
      return bag;
    },
    mutatedField: "chronologyEvents[0].timestamp",
  }),
  "MAA2-CHR-04-CUSTODY-INTERVIEW-TIMING": chronoEntry("MAA2-CHR-04-CUSTODY-INTERVIEW-TIMING", {
    positiveEvents: [
      chronoBase({ eventId: "c", eventType: "custody", timestamp: "2026-01-01T10:00:00Z" }),
      chronoBase({ eventId: "i", eventType: "interview", timestamp: "2026-01-01T12:00:00Z" }),
    ],
    negativeEvents: [
      chronoBase({ eventId: "c", eventType: "custody", timestamp: "2026-01-01T14:00:00Z" }),
      chronoBase({ eventId: "i", eventType: "interview", timestamp: "2026-01-01T12:00:00Z" }),
    ],
    evidenceRefIncludes: ["/chronologyEvents"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chronologyEvents as Record<string, unknown>[])[0]!.timestamp = "2026-01-01T16:00:00Z";
      return bag;
    },
    mutatedField: "chronologyEvents[0].timestamp",
  }),
  "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE": chronoEntry("MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE", {
    positiveEvents: [
      chronoBase({ eventId: "n", eventType: "notice", timestamp: "2026-01-01T10:00:00Z" }),
      chronoBase({ eventId: "h", eventType: "hearing", timestamp: "2026-01-02T10:00:00Z" }),
    ],
    negativeEvents: [
      chronoBase({ eventId: "n", eventType: "notice", timestamp: "2026-01-03T10:00:00Z" }),
      chronoBase({ eventId: "h", eventType: "hearing", timestamp: "2026-01-02T10:00:00Z" }),
    ],
    evidenceRefIncludes: ["/chronologyEvents"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.chronologyEvents as Record<string, unknown>[])[0]!.timestamp = "2026-01-05T10:00:00Z";
      return bag;
    },
    mutatedField: "chronologyEvents[0].timestamp",
  }),
});

function provenanceEntry(
  controlId: string,
  args: {
    positive: Record<string, unknown>;
    negative: Record<string, unknown>;
    evidenceRefIncludes: string[];
    mutate: (o: Record<string, unknown>) => Record<string, unknown>;
    mutatedField: string;
    unavailableReasonIncludes?: string;
    unavailableOutput?: Record<string, unknown>;
  },
): Batch9BehaviouralFixtureEntry {
  return {
    controlId,
    positive: {
      output: args.positive,
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: args.negative,
      expect: {
        exerciseStatus: "evaluated",
        minFindingCount: 1,
        findingCode: fc(controlId),
        evidenceRefIncludes: args.evidenceRefIncludes,
      },
    },
    unavailable: {
      output: args.unavailableOutput ?? baseShell(),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: args.unavailableReasonIncludes ?? "provenance",
      },
    },
    mutation: {
      mutate: args.mutate,
      expect: { differsFromPositive: true, mutatedField: args.mutatedField },
    },
  };
}

Object.assign(MATRIX, {
  "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE": provenanceEntry("MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE", {
    positive: baseShell({ evidenceStates: [provenanceRow()], fiveAnswersEvidenceRows: [] }),
    negative: baseShell({
      evidenceStates: [provenanceRow({ sourcePage: "see above", compiledPage: "12" })],
      fiveAnswersEvidenceRows: [],
    }),
    evidenceRefIncludes: ["/evidenceStates"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.evidenceStates as Record<string, unknown>[])[0]!.sourcePage = "approx";
      return bag;
    },
    mutatedField: "evidenceStates[0].sourcePage",
  }),
  "MAA2-ATR-09-SOURCE-LINKED-LIMITATIONS": provenanceEntry("MAA2-ATR-09-SOURCE-LINKED-LIMITATIONS", {
    positive: baseShell({
      evidenceStates: [provenanceRow({ limitationReason: "redacted faces" })],
      fiveAnswersEvidenceRows: [],
    }),
    negative: baseShell({
      evidenceStates: [provenanceRow({ limitationReason: "unlinked orphan limitation" })],
      fiveAnswersEvidenceRows: [],
    }),
    evidenceRefIncludes: ["/evidenceStates"],
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.evidenceStates as Record<string, unknown>[])[0]!.limitationReason = "not linked to source";
      return bag;
    },
    mutatedField: "evidenceStates[0].limitationReason",
  }),
  "MAA2-FID-10-QUOTATION-FIDELITY": provenanceEntry("MAA2-FID-10-QUOTATION-FIDELITY", {
    positive: baseShell({
      evidenceStates: [
        provenanceRow({ quotationExactText: "exact quote", pageIdentityKnown: true, sourcePage: "12" }),
      ],
      fiveAnswersEvidenceRows: [],
    }),
    negative: baseShell({
      evidenceStates: [
        provenanceRow({
          quotationExactText: "exact quote […]",
          pageIdentityKnown: true,
          sourcePage: "12",
        }),
      ],
      fiveAnswersEvidenceRows: [],
    }),
    evidenceRefIncludes: ["/evidenceStates"],
    unavailableReasonIncludes: "quotationExactText",
    unavailableOutput: baseShell({
      evidenceStates: [provenanceRow()],
      fiveAnswersEvidenceRows: [],
    }),
    mutate: (o) => {
      const bag = structuredClone(o);
      delete (bag.evidenceStates as Record<string, unknown>[])[0]!.quotationExactText;
      return bag;
    },
    mutatedField: "evidenceStates[0].quotationExactText",
  }),
  "MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS": provenanceEntry("MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS", {
    positive: baseShell({
      evidenceStates: [provenanceRow()],
      fiveAnswersEvidenceRows: [],
      pageDocEvidenceTotals: { inconsistent: false, totalCount: 1 },
    }),
    negative: baseShell({
      evidenceStates: [provenanceRow()],
      fiveAnswersEvidenceRows: [],
      pageDocEvidenceTotals: { inconsistent: true, totalCount: 1 },
    }),
    evidenceRefIncludes: ["/pageDocEvidenceTotals"],
    unavailableReasonIncludes: "pageDocEvidenceTotals",
    unavailableOutput: baseShell({
      evidenceStates: [provenanceRow()],
      fiveAnswersEvidenceRows: [],
    }),
    mutate: (o) => {
      const bag = structuredClone(o);
      (bag.pageDocEvidenceTotals as Record<string, unknown>).inconsistent = true;
      return bag;
    },
    mutatedField: "pageDocEvidenceTotals.inconsistent",
  }),
});

function chaseEntry(
  controlId: string,
  args: {
    positive: Record<string, unknown>;
    negative: Record<string, unknown>;
    evidenceRefIncludes: string[];
    mutate: (o: Record<string, unknown>) => Record<string, unknown>;
    mutatedField: string;
    negativeStatus?: "evaluated" | "unresolved";
  },
): Batch9BehaviouralFixtureEntry {
  return {
    controlId,
    positive: { output: args.positive, expect: { exerciseStatus: "evaluated", findingCount: 0 } },
    negative: {
      output: args.negative,
      expect: {
        exerciseStatus: args.negativeStatus ?? "evaluated",
        minFindingCount: 1,
        findingCode: fc(controlId),
        evidenceRefIncludes: args.evidenceRefIncludes,
      },
    },
    unavailable: {
      output: baseShell({
        warningsAndGaps: {
          chaseItems: [{ label: "CCTV", sendabilityLabel: "x", copySuggestion: "y" }],
          doNotOverstate: [],
        },
      }),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "chase_relationships",
      },
    },
    mutation: {
      mutate: args.mutate,
      expect: { differsFromPositive: true, mutatedField: args.mutatedField },
    },
  };
}

Object.assign(MATRIX, {
  "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST": chaseEntry("MAA2-CHS-02-SPECIFIC-ITEM-REQUEST", {
    positive: chaseComplete({ label: "CCTV clip eu-1", resolutionState: "outstanding" }),
    negative: chaseComplete({ label: "various outstanding items", resolutionState: "outstanding" }),
    evidenceRefIncludes: ["/warningsAndGaps/chaseItems"],
    mutate: (o) => {
      const bag = structuredClone(o);
      const gaps = bag.warningsAndGaps as Record<string, unknown>;
      (gaps.chaseItems as Record<string, unknown>[])[0]!.label = "general outstanding";
      return bag;
    },
    mutatedField: "warningsAndGaps.chaseItems[0].label",
  }),
  "MAA2-CHS-06-NO-ALIAS-OR-SERVED-DUP": chaseEntry("MAA2-CHS-06-NO-ALIAS-OR-SERVED-DUP", {
    positive: chaseComplete({ label: "Unique chase label" }),
    negative: baseShell({
      warningsAndGaps: {
        chaseItems: [
          {
            label: "CCTV",
            requestId: "req-1",
            evidenceUnitId: "eu-1",
            resolutionState: "outstanding",
          },
        ],
        doNotOverstate: [],
      },
      evidenceStates: [
        { label: "CCTV", inferredSourceState: "served", source: "a.pdf", evidenceAnchor: "p.1" },
        { label: "CCTV", inferredSourceState: "served", source: "b.pdf", evidenceAnchor: "p.2" },
      ],
    }),
    evidenceRefIncludes: ["/warningsAndGaps/chaseItems"],
    negativeStatus: "unresolved",
    mutate: (o) => {
      const bag = structuredClone(o);
      bag.evidenceStates = [
        { label: "Unique chase label", inferredSourceState: "served", source: "a.pdf", evidenceAnchor: "p.1" },
        { label: "Unique chase label", inferredSourceState: "missing", source: "b.pdf", evidenceAnchor: "p.2" },
      ];
      const gaps = bag.warningsAndGaps as Record<string, unknown>;
      (gaps.chaseItems as Record<string, unknown>[])[0]!.label = "Unique chase label";
      return bag;
    },
    mutatedField: "evidenceStates exact-label peers",
  }),
  "MAA2-BND-05-MISSING-ATTACHMENTS": chaseEntry("MAA2-BND-05-MISSING-ATTACHMENTS", {
    positive: chaseComplete({ resolutionState: "attached", evidenceUnitId: "eu-1" }),
    negative: chaseComplete({ resolutionState: "missing attachment", evidenceUnitId: "MISSING" }),
    evidenceRefIncludes: ["/warningsAndGaps/chaseItems"],
    mutate: (o) => {
      const bag = structuredClone(o);
      const gaps = bag.warningsAndGaps as Record<string, unknown>;
      (gaps.chaseItems as Record<string, unknown>[])[0]!.resolutionState = "missing attachment";
      (gaps.chaseItems as Record<string, unknown>[])[0]!.evidenceUnitId = "absent";
      return bag;
    },
    mutatedField: "warningsAndGaps.chaseItems[0].resolutionState",
  }),
  "MAA2-BND-12-COMPLETE-VS-PARTIAL-DISCLOSURE": chaseEntry(
    "MAA2-BND-12-COMPLETE-VS-PARTIAL-DISCLOSURE",
    {
      positive: chaseComplete({ resolutionState: "complete disclosure" }),
      negative: chaseComplete({ resolutionState: "complete partial disclosure" }),
      evidenceRefIncludes: ["/warningsAndGaps/chaseItems"],
      mutate: (o) => {
        const bag = structuredClone(o);
        const gaps = bag.warningsAndGaps as Record<string, unknown>;
        (gaps.chaseItems as Record<string, unknown>[])[0]!.resolutionState = "complete and partial";
        return bag;
      },
      mutatedField: "warningsAndGaps.chaseItems[0].resolutionState",
    },
  ),
});

Object.assign(MATRIX, {
  "MAA2-XEX-01-CHARGE-WARNING-ATTACHED": {
    controlId: "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
    positive: {
      output: baseShell({
        chargeInstruments: [instrument()],
        exitPayloadReceipts: sevenExits({ chargeWarningAttached: true }),
      }),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: (() => {
        const exits = sevenExits({ chargeWarningAttached: true });
        (exits.copy as Record<string, unknown>).chargeWarningAttached = false;
        return baseShell({ chargeInstruments: [instrument()], exitPayloadReceipts: exits });
      })(),
      expect: {
        exerciseStatus: "evaluated",
        minFindingCount: 1,
        findingCode: fc("MAA2-XEX-01-CHARGE-WARNING-ATTACHED"),
        evidenceRefIncludes: ["/exitPayloadReceipts/copy"],
      },
    },
    unavailable: {
      output: baseShell({ exitPayloadReceipts: sevenExits() }),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "chargeWarningAttached",
      },
    },
    mutation: {
      mutate: (o: Record<string, unknown>) => {
        const bag = structuredClone(o);
        delete bag.chargeInstruments;
        return bag;
      },
      expect: { differsFromPositive: true, mutatedField: "chargeInstruments" },
    },
  },
  "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY": {
    controlId: "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY",
    positive: {
      output: baseShell({
        exitPayloadReceipts: sevenExits({
          /* override per-exit below */
        }),
      }),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: baseShell({ exitPayloadReceipts: sevenExits() }),
      expect: {
        exerciseStatus: "evaluated",
        minFindingCount: 1,
        findingCode: fc("MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY"),
        evidenceRefIncludes: ["/exitPayloadReceipts"],
      },
    },
    unavailable: {
      output: baseShell(),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "exit_snapshots",
      },
    },
    mutation: {
      mutate: (o: Record<string, unknown>) => {
        const bag = structuredClone(o);
        const exits = bag.exitPayloadReceipts as Record<string, Record<string, unknown>>;
        exits.view.sendability = "blocked";
        exits.copy.sendability = "sendable";
        return bag;
      },
      expect: { differsFromPositive: true, mutatedField: "exitPayloadReceipts.view/copy.sendability" },
    },
  },
  "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED": {
    controlId: "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED",
    positive: {
      output: baseShell({
        exportVersion: {
          exportId: "exp-1",
          generatedAt: "2026-01-01T00:00:00Z",
          sendability: "needs_solicitor_review",
          reviewFooter: "Review required",
        },
      }),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: baseShell({
        exportVersion: {
          exportId: "exp-1",
          generatedAt: "2026-01-01T00:00:00Z",
          sendability: "sendable",
          reviewFooter: "Review required",
        },
      }),
      expect: {
        exerciseStatus: "evaluated",
        minFindingCount: 1,
        findingCode: fc("MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED"),
        evidenceRefIncludes: ["/exportVersion"],
      },
    },
    unavailable: {
      output: { caseId: "empty" },
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "exit_snapshots",
      },
    },
    mutation: {
      mutate: () => ({ caseId: "empty" }),
      expect: { differsFromPositive: true, mutatedField: "exit snapshot materialisation" },
    },
  },
  "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING": {
    controlId: "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
    positive: {
      output: baseShell({
        exitPayloadReceipts: sevenExits({ evidencePartialWarning: true }),
      }),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: (() => {
        const exits = sevenExits({ evidencePartialWarning: true });
        delete (exits.view as Record<string, unknown>).evidencePartialWarning;
        // Still need hasEvidencePartialWarning true (some exit has it) so gate opens,
        // then missing boolean on an exit fires.
        return baseShell({ exitPayloadReceipts: exits });
      })(),
      expect: {
        exerciseStatus: "evaluated",
        minFindingCount: 1,
        findingCode: fc("MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING"),
        evidenceRefIncludes: ["/exitPayloadReceipts/view"],
      },
    },
    unavailable: {
      output: baseShell({ exitPayloadReceipts: sevenExits() }),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "evidencePartialWarning",
      },
    },
    mutation: {
      mutate: (o: Record<string, unknown>) => {
        const bag = structuredClone(o);
        const exits = bag.exitPayloadReceipts as Record<string, Record<string, unknown>>;
        for (const e of Object.values(exits)) delete e.evidencePartialWarning;
        return bag;
      },
      expect: { differsFromPositive: true, mutatedField: "exitPayloadReceipts.*.evidencePartialWarning" },
    },
  },
  "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL": {
    controlId: "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL",
    positive: {
      output: baseShell({
        exitPayloadReceipts: sevenExits({ quarantineScope: "partial" }),
      }),
      expect: { exerciseStatus: "evaluated", findingCount: 0 },
    },
    negative: {
      output: (() => {
        const exits = sevenExits({ quarantineScope: "partial" });
        (exits.api as Record<string, unknown>).quarantineScope = "partial total";
        return baseShell({ exitPayloadReceipts: exits });
      })(),
      expect: {
        exerciseStatus: "evaluated",
        minFindingCount: 1,
        findingCode: fc("MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL"),
        evidenceRefIncludes: ["/exitPayloadReceipts/api"],
      },
    },
    unavailable: {
      output: baseShell({ exitPayloadReceipts: sevenExits() }),
      expect: {
        exerciseStatus: "not_exercised",
        missingInputReasonIncludes: "quarantineScope",
      },
    },
    mutation: {
      mutate: (o: Record<string, unknown>) => {
        const bag = structuredClone(o);
        const exits = bag.exitPayloadReceipts as Record<string, Record<string, unknown>>;
        for (const e of Object.values(exits)) delete e.quarantineScope;
        return bag;
      },
      expect: { differsFromPositive: true, mutatedField: "exitPayloadReceipts.*.quarantineScope" },
    },
  },
});

// XEX-07 positive: safe view + safe copy (no inversion)
{
  const exits = sevenExits();
  (exits.view as Record<string, unknown>).sendability = "sendable";
  (exits.copy as Record<string, unknown>).sendability = "sendable";
  MATRIX["MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY"]!.positive.output = baseShell({
    exitPayloadReceipts: exits,
  });
}

// XEX-08: enhance evaluator to flag metadata-only exits that claim sendability cleared/sendable
// For now set negative to use output where we inject via sevenExits empty and rely on enhancement.
// Patch evaluateExits for: metadataOnly && /\bsendable|cleared|safe\b/i.test(sendability)

export const BATCH9_BEHAVIOURAL_FIXTURE_MATRIX: ReadonlyMap<string, Batch9BehaviouralFixtureEntry> =
  new Map(Object.entries(MATRIX));

export function assertBehaviouralFixtureCoverage(): void {
  for (const id of BATCH9_CONTROL_IDS) {
    if (!BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.has(id)) {
      throw new Error(`Missing behavioural fixtures for ${id}`);
    }
  }
  if (BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.size !== 37) {
    throw new Error(`Expected 37 fixture entries, got ${BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.size}`);
  }
}
