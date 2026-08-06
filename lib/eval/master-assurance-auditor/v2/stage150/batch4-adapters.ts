/**
 * Batch-4 truthful Stage-150 adapters.
 * Never invent ESA inputs. When required structured bags are absent → not_exercised.
 * Synthetic fixtures are allowed only under syn-* / fixture ids for contracts.
 */

import type { EldVersionPair } from "../eld/types";
import { isSyntheticEldId } from "../eld/dependency-graph";
import {
  syntheticPositiveUpdatePair,
  syntheticUnavailableEmptyPair,
} from "../eld/synthetic/version-pairs";

export const BATCH4_ADAPTER_SCHEMA = "stage150-batch4-adapter@1.0.0" as const;

export type AdapterPresence = {
  adapterId: string;
  present: boolean;
  whenAbsent: "not_exercised";
  opensTruth: false;
  evidencePathsFound: string[];
  note: string;
};

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function nonemptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

/** ELD / source-change drafting — reads packet eldVersionPair or returns absent. */
export function readEldSourceChangeDrafting(output: Record<string, unknown>): AdapterPresence & {
  versionPair: EldVersionPair | null;
} {
  const raw = output.eldVersionPair;
  if (!isObj(raw)) {
    return {
      adapterId: "eld_source_change_drafting",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      versionPair: null,
      note: "ESA packets lack eldVersionPair; synthetic fixtures only for contracts.",
    };
  }
  const pair = raw as unknown as EldVersionPair;
  const id = String(pair.pairId ?? "");
  if (!isSyntheticEldId(id) && !id.startsWith("fixture-eld-")) {
    // Refuse non-synthetic live case wiring in Batch-4 — fail closed
    return {
      adapterId: "eld_source_change_drafting",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      versionPair: null,
      note: "Non-synthetic eldVersionPair refused until live ELD wiring is separately accepted.",
    };
  }
  return {
    adapterId: "eld_source_change_drafting",
    present: true,
    whenAbsent: "not_exercised",
    opensTruth: false,
    evidencePathsFound: ["/eldVersionPair"],
    versionPair: pair,
    note: "Synthetic/fixture ELD version pair present.",
  };
}

export type PinnedAuthorityRecord = {
  authorityId: string;
  officialSource: string;
  jurisdiction: string;
  effectiveDate: string;
  retrievalDate: string;
  registryVersionId: string;
  authorityType: string;
  currencyStatus: "current" | "stale" | "unknown";
};

export function readPinnedLegalAuthorityRegistry(output: Record<string, unknown>): AdapterPresence & {
  registry: PinnedAuthorityRecord[];
} {
  const bag = output.pinnedAuthorityRegistry;
  if (!isObj(bag) || !nonemptyArray(bag.records)) {
    return {
      adapterId: "pinned_legal_authority_registry",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      registry: [],
      note: "No pinnedAuthorityRegistry on packet — never invent live law.",
    };
  }
  const registry: PinnedAuthorityRecord[] = [];
  for (const r of bag.records) {
    if (!isObj(r)) continue;
    if (
      typeof r.authorityId === "string" &&
      typeof r.officialSource === "string" &&
      typeof r.jurisdiction === "string" &&
      typeof r.effectiveDate === "string" &&
      typeof r.retrievalDate === "string" &&
      typeof r.registryVersionId === "string" &&
      typeof r.authorityType === "string"
    ) {
      registry.push({
        authorityId: r.authorityId,
        officialSource: r.officialSource,
        jurisdiction: r.jurisdiction,
        effectiveDate: r.effectiveDate,
        retrievalDate: r.retrievalDate,
        registryVersionId: r.registryVersionId,
        authorityType: r.authorityType,
        currencyStatus:
          r.currencyStatus === "current" || r.currencyStatus === "stale" || r.currencyStatus === "unknown"
            ? r.currencyStatus
            : "unknown",
      });
    }
  }
  if (registry.length === 0) {
    return {
      adapterId: "pinned_legal_authority_registry",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      registry: [],
      note: "pinnedAuthorityRegistry present but records incomplete.",
    };
  }
  return {
    adapterId: "pinned_legal_authority_registry",
    present: true,
    whenAbsent: "not_exercised",
    opensTruth: false,
    evidencePathsFound: ["/pinnedAuthorityRegistry/records"],
    registry,
    note: `Pinned registry with ${registry.length} record(s). Schema fields ≠ live authority browse.`,
  };
}

/**
 * Legal-authority lane honesty — distinguishes availability states.
 * Never browses the network; a schema with authority fields is not a registry.
 */
export type AuthorityLaneStatus =
  | "pinned_local_authority_available"
  | "authority_absent"
  | "authority_stale"
  | "proposition_unsupported"
  | "control_genuinely_unavailable";

export function assessLegalAuthorityLane(
  output: Record<string, unknown>,
  opts?: { propositionText?: string },
): {
  status: AuthorityLaneStatus;
  registryPresent: boolean;
  recordCount: number;
  staleCount: number;
  note: string;
} {
  const auth = readPinnedLegalAuthorityRegistry(output);
  if (!auth.present) {
    return {
      status: "authority_absent",
      registryPresent: false,
      recordCount: 0,
      staleCount: 0,
      note: "No pinned local authority registry on packet — control unavailable for authority exercise (not browsing).",
    };
  }
  const staleCount = auth.registry.filter((r) => r.currencyStatus === "stale").length;
  const proposition = opts?.propositionText ?? "";
  if (proposition && /\bcontrary\s+to\b/i.test(proposition)) {
    const cites = auth.registry.some((r) => proposition.includes(r.authorityId));
    if (!cites) {
      return {
        status: "proposition_unsupported",
        registryPresent: true,
        recordCount: auth.registry.length,
        staleCount,
        note: "Proposition present without citation to a pinned authorityId.",
      };
    }
  }
  if (staleCount > 0) {
    return {
      status: "authority_stale",
      registryPresent: true,
      recordCount: auth.registry.length,
      staleCount,
      note: `${staleCount} pinned record(s) marked stale — currency warning lane.`,
    };
  }
  if (auth.registry.length === 0) {
    return {
      status: "control_genuinely_unavailable",
      registryPresent: false,
      recordCount: 0,
      staleCount: 0,
      note: "Registry bag present but empty after validation.",
    };
  }
  return {
    status: "pinned_local_authority_available",
    registryPresent: true,
    recordCount: auth.registry.length,
    staleCount: 0,
    note: "Pinned local authority available (fixture or validated bag; no network browse).",
  };
}

export type DeterministicReceiptBag = {
  /** Run-level receipt identity — required; VDR is not a case-count detector. */
  runReceiptId: string;
  artefactReceipts: Array<{ artefactId: string; sha256: string; mediaType: string }>;
  sourceCaseHashes: Record<string, string>;
  frozenMembershipOrder: string[];
  casebrainCommit: string;
  casebrainBuildId: string;
  schemaRegistryVersion: string;
  detectorVersions: Record<string, string>;
  modelPromptVersion: string | null;
  exactFindingIds: string[];
  timestampsDispositions: Array<{ findingId: string; timestamp: string; disposition: string }>;
  beforeAfterMap: Array<{ beforeId: string; afterId: string }>;
  addedRemovedRetained: { added: string[]; removed: string[]; retained: string[] };
};

export function readVersionedDeterministicReceipts(output: Record<string, unknown>): AdapterPresence & {
  bag: DeterministicReceiptBag | null;
} {
  const raw = output.versionedDeterministicReceipts;
  if (!isObj(raw)) {
    return {
      adapterId: "versioned_deterministic_receipts",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      bag: null,
      note: "ESA packets lack versionedDeterministicReceipts (run/artefact receipts).",
    };
  }
  const required = [
    "runReceiptId",
    "artefactReceipts",
    "sourceCaseHashes",
    "frozenMembershipOrder",
    "casebrainCommit",
    "schemaRegistryVersion",
    "detectorVersions",
    "exactFindingIds",
  ];
  for (const k of required) {
    if (!(k in raw)) {
      return {
        adapterId: "versioned_deterministic_receipts",
        present: false,
        whenAbsent: "not_exercised",
        opensTruth: false,
        evidencePathsFound: [],
        bag: null,
        note: `versionedDeterministicReceipts missing field ${k}.`,
      };
    }
  }
  if (typeof raw.runReceiptId !== "string" || !raw.runReceiptId.trim()) {
    return {
      adapterId: "versioned_deterministic_receipts",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      bag: null,
      note: "VDR requires non-empty runReceiptId — not an ordinary case-count detector.",
    };
  }
  if (!Array.isArray(raw.artefactReceipts) || raw.artefactReceipts.length === 0) {
    return {
      adapterId: "versioned_deterministic_receipts",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      bag: null,
      note: "VDR requires artefactReceipts[] — run/artefact unit, not case count.",
    };
  }
  return {
    adapterId: "versioned_deterministic_receipts",
    present: true,
    whenAbsent: "not_exercised",
    opensTruth: false,
    evidencePathsFound: ["/versionedDeterministicReceipts"],
    bag: raw as unknown as DeterministicReceiptBag,
    note: "Versioned deterministic run/artefact receipt bag present.",
  };
}

/** Required audience roles for a complete AUD surface set. */
export const COMPLETE_AUDIENCE_ROLES = ["client", "court", "cps", "supervisor"] as const;

/** Required perspective roles for a complete XPP surface set. */
export const COMPLETE_PERSPECTIVE_ROLES = [
  "defence_solicitor",
  "prosecution",
  "judicial",
  "client",
  "supervisor",
] as const;

export type HeavySourceEvidence = {
  originalSourceDocuments: Array<{ documentId: string; sha256: string; mediaType: string }>;
  ocrVisualMetadata: Array<{ documentId: string; pageCount: number }>;
  securityToolEvidence: Array<{ toolId: string; result: string }>;
};

export function readHeavySourceDocumentEvidence(output: Record<string, unknown>): AdapterPresence & {
  evidence: HeavySourceEvidence | null;
} {
  const raw = output.heavySourceDocumentEvidence;
  if (!isObj(raw) || !nonemptyArray(raw.originalSourceDocuments)) {
    return {
      adapterId: "heavy_source_document_evidence",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      evidence: null,
      note: "No heavy source-document evidence on ESA; Stage-300 lane.",
    };
  }
  return {
    adapterId: "heavy_source_document_evidence",
    present: true,
    whenAbsent: "not_exercised",
    opensTruth: false,
    evidencePathsFound: ["/heavySourceDocumentEvidence"],
    evidence: raw as unknown as HeavySourceEvidence,
    note: "Heavy source-document evidence bag present (fixture/Stage-300).",
  };
}

export type AudienceSurface = {
  audienceId: string;
  role: "client" | "court" | "cps" | "supervisor" | "defence_solicitor" | "prosecution" | "judicial" | string;
  text: string;
};

export type PerspectiveRecord = {
  perspectiveId: string;
  role: string;
  claims: string[];
};

export function readMultiAudiencePerspective(output: Record<string, unknown>): AdapterPresence & {
  audiences: AudienceSurface[];
  perspectives: PerspectiveRecord[];
  completeAudienceSurfaceSet: boolean;
  completePerspectiveSurfaceSet: boolean;
  missingAudienceRoles: string[];
  missingPerspectiveRoles: string[];
} {
  const audiences = nonemptyArray(output.audienceSurfaces)
    ? (output.audienceSurfaces as AudienceSurface[]).filter(
        (a) => a && typeof a.audienceId === "string" && typeof a.text === "string",
      )
    : [];
  const perspectives = nonemptyArray(output.perspectiveRecords)
    ? (output.perspectiveRecords as PerspectiveRecord[]).filter(
        (p) => p && typeof p.perspectiveId === "string" && typeof p.role === "string",
      )
    : [];
  const audienceRoles = new Set(audiences.map((a) => a.role));
  const perspectiveRoles = new Set(perspectives.map((p) => p.role));
  const missingAudienceRoles = COMPLETE_AUDIENCE_ROLES.filter((r) => !audienceRoles.has(r));
  const missingPerspectiveRoles = COMPLETE_PERSPECTIVE_ROLES.filter((r) => !perspectiveRoles.has(r));
  const completeAudienceSurfaceSet = missingAudienceRoles.length === 0;
  const completePerspectiveSurfaceSet = missingPerspectiveRoles.length === 0;
  // Present only when a complete set exists for at least one lane — partial bags ≠ exercise.
  const present = completeAudienceSurfaceSet || completePerspectiveSurfaceSet;
  return {
    adapterId: "multi_audience_perspective",
    present,
    whenAbsent: "not_exercised",
    opensTruth: false,
    evidencePathsFound: [
      ...(audiences.length ? ["/audienceSurfaces"] : []),
      ...(perspectives.length ? ["/perspectiveRecords"] : []),
    ],
    audiences,
    perspectives,
    completeAudienceSurfaceSet,
    completePerspectiveSurfaceSet,
    missingAudienceRoles: [...missingAudienceRoles],
    missingPerspectiveRoles: [...missingPerspectiveRoles],
    note: present
      ? `completeAudience=${completeAudienceSurfaceSet}; completePerspective=${completePerspectiveSurfaceSet}`
      : `Incomplete audience/perspective sets (missing audiences=[${missingAudienceRoles.join(",")}]; perspectives=[${missingPerspectiveRoles.join(",")}]). Single courtNote insufficient.`,
  };
}

export function readDobAgeCalcLedger(output: Record<string, unknown>): AdapterPresence & {
  ledger: Record<string, unknown> | null;
} {
  const ledger = output.dobAgeCalcLedger;
  if (!isObj(ledger)) {
    return {
      adapterId: "dob_age_calc_ledger",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      ledger: null,
      note: "No dobAgeCalcLedger — age/calc controls not_exercised.",
    };
  }
  const hasDob = typeof ledger.dateOfBirth === "string" && ledger.dateOfBirth.trim().length > 0;
  const hasInputs = nonemptyArray(ledger.calcInputs);
  if (!hasDob && !hasInputs) {
    return {
      adapterId: "dob_age_calc_ledger",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      ledger: null,
      note: "dobAgeCalcLedger empty of DOB/calcInputs.",
    };
  }
  return {
    adapterId: "dob_age_calc_ledger",
    present: true,
    whenAbsent: "not_exercised",
    opensTruth: false,
    evidencePathsFound: ["/dobAgeCalcLedger"],
    ledger,
    note: "DOB/age calc ledger present.",
  };
}

export function readStructuredProceduralPartyState(output: Record<string, unknown>): AdapterPresence & {
  state: Record<string, unknown> | null;
} {
  const state = output.proceduralPartyState;
  if (!isObj(state)) {
    return {
      adapterId: "structured_procedural_party_state",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      state: null,
      note: "No proceduralPartyState (youth/fitness/PII) on ESA.",
    };
  }
  const useful =
    state.youthState != null ||
    state.fitnessParticipation != null ||
    state.disclosurePiiState != null;
  if (!useful) {
    return {
      adapterId: "structured_procedural_party_state",
      present: false,
      whenAbsent: "not_exercised",
      opensTruth: false,
      evidencePathsFound: [],
      state: null,
      note: "proceduralPartyState lacks youth/fitness/PII fields.",
    };
  }
  return {
    adapterId: "structured_procedural_party_state",
    present: true,
    whenAbsent: "not_exercised",
    opensTruth: false,
    evidencePathsFound: ["/proceduralPartyState"],
    state,
    note: "Structured procedural party state present.",
  };
}

/** Fixture helpers for contracts — never used as ESA invention. */
export function fixturePinnedAuthorityRegistry(): Record<string, unknown> {
  return {
    pinnedAuthorityRegistry: {
      records: [
        {
          authorityId: "fixture-auth-theft-act-1968-s1",
          officialSource: "legislation.gov.uk",
          jurisdiction: "E&W",
          effectiveDate: "1969-01-01",
          retrievalDate: "2026-01-15",
          registryVersionId: "fixture-reg-v1",
          authorityType: "primary_legislation",
          currencyStatus: "current",
        },
      ],
    },
  };
}

export function fixtureEldVersionPairPresent(): Record<string, unknown> {
  return { eldVersionPair: syntheticPositiveUpdatePair() };
}

export function fixtureEldUnavailable(): Record<string, unknown> {
  return { eldVersionPair: syntheticUnavailableEmptyPair() };
}

export function fixtureMultiAudience(): Record<string, unknown> {
  return {
    audienceSurfaces: [
      { audienceId: "a-client", role: "client", text: "In plain words, the allegation is disputed." },
      { audienceId: "a-court", role: "court", text: "The defendant disputes the charge particulars." },
      { audienceId: "a-cps", role: "cps", text: "CPS review notes the disputed particulars." },
      { audienceId: "a-sup", role: "supervisor", text: "Supervisor risk: identification gap." },
    ],
    perspectiveRecords: [
      { perspectiveId: "p-def", role: "defence_solicitor", claims: ["identity continuity gap"] },
      { perspectiveId: "p-pros", role: "prosecution", claims: ["identification sufficient"] },
      { perspectiveId: "p-jud", role: "judicial", claims: ["neutrality required"] },
      { perspectiveId: "p-cli", role: "client", claims: ["I do not understand the charge"] },
      { perspectiveId: "p-sup", role: "supervisor", claims: ["supervision risk flagged"] },
    ],
  };
}

export function fixtureVersionedReceipts(): Record<string, unknown> {
  return {
    versionedDeterministicReceipts: {
      runReceiptId: "fixture-run-receipt-001",
      artefactReceipts: [
        { artefactId: "art-output", sha256: "deadbeef", mediaType: "application/json" },
      ],
      sourceCaseHashes: { "fixture-case": "abc123" },
      frozenMembershipOrder: ["fixture-case"],
      casebrainCommit: "da98277c3038b40b2408a7af6a41475e88b21e17",
      casebrainBuildId: "fixture-build",
      schemaRegistryVersion: "maa-v2@1",
      detectorVersions: { batch4: "1.0.0" },
      modelPromptVersion: null,
      exactFindingIds: ["F-1"],
      timestampsDispositions: [{ findingId: "F-1", timestamp: "2026-07-30T00:00:00Z", disposition: "open" }],
      beforeAfterMap: [{ beforeId: "F-0", afterId: "F-1" }],
      addedRemovedRetained: { added: ["F-1"], removed: [], retained: [] },
    },
  };
}

export const BATCH4_INPUT_ADAPTER_DEFS = [
  {
    adapterId: "eld_source_change_drafting",
    schemaVersion: BATCH4_ADAPTER_SCHEMA,
    purpose: "ELD version pairs / source→sentence graph / approval / revision / exit matrix",
    requiredFields: ["/eldVersionPair"],
    source: "casebrain-output.json" as const,
    whenAbsent: "not_exercised" as const,
    opensTruth: false as const,
  },
  {
    adapterId: "pinned_legal_authority_registry",
    schemaVersion: BATCH4_ADAPTER_SCHEMA,
    purpose: "Pinned local legal authority/currency registry (no live network fetch)",
    requiredFields: ["/pinnedAuthorityRegistry/records"],
    source: "casebrain-output.json" as const,
    whenAbsent: "not_exercised" as const,
    opensTruth: false as const,
  },
  {
    adapterId: "versioned_deterministic_receipts",
    schemaVersion: BATCH4_ADAPTER_SCHEMA,
    purpose: "Frozen-run reproducibility / VDR receipt bag",
    requiredFields: ["/versionedDeterministicReceipts"],
    source: "casebrain-output.json" as const,
    whenAbsent: "not_exercised" as const,
    opensTruth: false as const,
  },
  {
    adapterId: "heavy_source_document_evidence",
    schemaVersion: BATCH4_ADAPTER_SCHEMA,
    purpose: "Original binaries + OCR visual metadata + security tool evidence (Stage-300)",
    requiredFields: ["/heavySourceDocumentEvidence/originalSourceDocuments"],
    source: "casebrain-output.json" as const,
    whenAbsent: "not_exercised" as const,
    opensTruth: false as const,
  },
  {
    adapterId: "multi_audience_perspective",
    schemaVersion: BATCH4_ADAPTER_SCHEMA,
    purpose: "Multi-audience surfaces + perspective comparison records",
    requiredFields: ["/audienceSurfaces", "/perspectiveRecords"],
    source: "casebrain-output.json" as const,
    whenAbsent: "not_exercised" as const,
    opensTruth: false as const,
  },
  {
    adapterId: "dob_age_calc_ledger",
    schemaVersion: BATCH4_ADAPTER_SCHEMA,
    purpose: "DOB and transparent calculation input ledger",
    requiredFields: ["/dobAgeCalcLedger"],
    source: "casebrain-output.json" as const,
    whenAbsent: "not_exercised" as const,
    opensTruth: false as const,
  },
  {
    adapterId: "structured_procedural_party_state",
    schemaVersion: BATCH4_ADAPTER_SCHEMA,
    purpose: "Youth / fitness / disclosure-PII structured party state",
    requiredFields: ["/proceduralPartyState"],
    source: "casebrain-output.json" as const,
    whenAbsent: "not_exercised" as const,
    opensTruth: false as const,
  },
] as const;
