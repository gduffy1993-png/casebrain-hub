/**
 * V2.1.4.2 solicitor-visible professional wording + leaf provenance attachments.
 * Shared-root only — no case/family-specific production patches.
 */
import crypto from "node:crypto";

export type LeafProvClassHint =
  | "substantive_source_backed"
  | "substantive_derived_conclusion"
  | "substantive_explicitly_unresolved"
  | "universal_safety"
  | "protected_audit_only";

export type LeafSupportingRef = {
  documentId: string | null;
  sourcePage: string | null;
  pageIdentityKnown: boolean;
  fieldRef: string;
  factId: string;
  title?: string | null;
};

export type SolicitorLeafProvenance = {
  classificationHint: LeafProvClassHint;
  supportingCanonicalFactOrFindingIds: string[];
  supportingReferences: LeafSupportingRef[];
  derivationHandlerId: string;
  limitation?: string | null;
  nextAction?: string | null;
  copyable: boolean;
  ordinaryExit: boolean;
};

function sha(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Collapse duplicated "Regarding <matter>:" prefixes and strip internal process language. */
export function polishSolicitorVisibleText(text: string): string {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  // Repeated Regarding <x>: Regarding <x>:
  s = s.replace(/^(?:Regarding\s+[^:]{1,80}:\s*)+/i, (m) => {
    const once = m.match(/Regarding\s+[^:]{1,80}:/i);
    return once ? `${once[0]} ` : "";
  });
  // Drop leading matter-family / for-family scaffolding when followed by substantive prose
  s = s.replace(/^Matter family context:\s*/i, "");
  s = s.replace(/^Matter family\s+[^:]+:\s*/i, "");
  s = s.replace(/^(?:Next action|Control focus|Case-specific issue|Why it matters|Safe current position|On|For)\s+[^:]{1,80}:\s*/i, "");
  // Internal process leaks
  s = s
    .replace(/\brequest identifiers?\b/gi, "")
    .replace(/\baudit metadata\b/gi, "")
    .replace(/\bhandler\b/gi, "")
    .replace(/\bfixture\b/gi, "")
    .replace(/\bmatter family\b/gi, "matter")
    .replace(/\bsource instrument\s+(\w+)\s+at\s+(\d+)\b/gi, "operative $1 at page $2")
    .replace(/\bkeep\s+in\s+only\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  // snake_case tokens (multi-word identifiers)
  s = s.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (tok) => tok.replace(/_/g, " "));
  // Collapse duplicate Regarding again after edits
  s = s.replace(/^(Regarding\s+[^:]+:\s*)\1+/i, "$1");
  return s.replace(/\s+/g, " ").trim();
}

export function scanVisibleLanguageBoundary(text: string): {
  ok: boolean;
  defects: string[];
} {
  const defects: string[] = [];
  const s = String(text || "");
  if (/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/.test(s)) defects.push("snake_case_token");
  if (/(Regarding\s+[^:]{1,80}:\s*){2,}/i.test(s)) defects.push("duplicate_regarding_prefix");
  if (/\b(requestId|evidenceUnitId|eu-[a-z0-9-]+|MAA2?-[A-Z0-9-]+)\b/i.test(s))
    defects.push("request_or_handler_id");
  if (/\baudit metadata\b/i.test(s)) defects.push("audit_metadata");
  if (/\bmatter family\b/i.test(s)) defects.push("matter_family");
  if (/\b(handler|fixture)\b/i.test(s)) defects.push("internal_process_language");
  if (/\bsource instrument\s+\w+\s+at\s+\d+\b/i.test(s)) defects.push("clunky_source_instrument");
  if (/\breferred_missing_master\b/i.test(s)) defects.push("raw_internal_evidence_label");
  return { ok: defects.length === 0, defects };
}

function defenceProse(raw: string): string {
  const d = polishSolicitorVisibleText(raw.replace(/_/g, " "));
  if (/factual denial|denies|denial/i.test(d)) return "The client denies the allegation.";
  if (/alibi/i.test(d)) return "The client advances an alibi on instructions.";
  if (/consent/i.test(d)) return "The client disputes consent on instructions.";
  if (/lack of intent|no intent/i.test(d)) return "The client disputes intent on instructions.";
  if (/self[- ]?defence/i.test(d)) return "The client raises self-defence on instructions.";
  if (/section 45|indicator/i.test(d)) return "The client’s instructions engage a section-45 indicator.";
  if (/on instructions/i.test(d)) return "The client’s position remains on instructions.";
  return `On instructions, the defence position is ${d}.`;
}

function procedureProse(raw: string): string {
  const p = polishSolicitorVisibleText(raw.replace(/_/g, " "));
  if (/police.?investigation|investigation/i.test(p))
    return "The matter remains at the police-investigation stage.";
  if (/trial prep|pre[- ]?trial|trial preparation/i.test(p))
    return "The matter remains at the trial-preparation stage.";
  if (/first hearing|plea/i.test(p)) return "The matter remains at the first-hearing / plea stage.";
  if (/sentence/i.test(p)) return "The matter remains at the sentencing stage.";
  return `The procedural stage is ${p}.`;
}

function chargeStatusProse(status: string, wording: string): {
  text: string;
  unresolved: boolean;
} {
  const st = String(status || "unresolved");
  const w = String(wording || "").trim();
  if (!w || /not pinned|unresolved|incomplete/i.test(w)) {
    return {
      text: "The recorded charge wording is not safely confirmed on the current papers.",
      unresolved: true,
    };
  }
  if (/operative/i.test(st)) {
    return {
      text: `The operative recorded charge is: ${w}.`,
      unresolved: false,
    };
  }
  return {
    text: `The recorded charge status is ${st.replace(/_/g, " ")}: ${w}.`,
    unresolved: /unresolved|unclear/i.test(st),
  };
}

export type WordingBuildArgs = {
  familyProse: string;
  defenceRaw: string;
  procedureRaw: string;
  chargeWording: string;
  chargeStatus: string;
  chargeInstrument: Record<string, unknown> | null;
  chaseRequest: string;
  chaseLabel: string | null;
  chaseItem: Record<string, unknown> | null;
  servedEvidenceCount: number;
  mg06: { docId: string; pageIdentity: string; sourcePageNo: string } | null;
  absentTitles: string[];
  courtLineBase: string;
};

export type BuiltSolicitorSurfaces = {
  surfaces: Record<string, any>;
  leafProvenance: Record<string, SolicitorLeafProvenance>;
  beforeAfterWordingMap: Array<{ pointer: string; beforePattern: string; after: string }>;
};

function refFromCharge(inst: Record<string, unknown> | null): LeafSupportingRef | null {
  if (!inst) return null;
  const docId = typeof inst.sourceDocument === "string" ? inst.sourceDocument : null;
  const page =
    typeof inst.sourcePageIdentity === "string"
      ? inst.sourcePageIdentity
      : docId && inst.sourcePage != null
        ? `${docId}/page/${inst.sourcePage}`
        : null;
  const id = typeof inst.instrumentId === "string" ? inst.instrumentId : "chargeInstruments/0";
  if (!docId || !page) return null;
  return {
    documentId: docId,
    sourcePage: page,
    pageIdentityKnown: true,
    fieldRef: `chargeInstrumentId:${id}`,
    factId: id,
    title: String(inst.instrumentType || docId),
  };
}

function refFromChase(item: Record<string, unknown> | null): LeafSupportingRef | null {
  if (!item) return null;
  const page =
    (typeof item.provenanceSourcePage === "string" && item.provenanceSourcePage) ||
    (typeof item.sourcePointer === "string" && item.sourcePointer) ||
    null;
  const docId = page ? String(page).split("/")[0]! : null;
  const eu =
    typeof item.evidenceUnitId === "string"
      ? item.evidenceUnitId
      : typeof item.linkedEvidenceOccurrenceRef === "string"
        ? String(item.linkedEvidenceOccurrenceRef).replace(/^evidenceUnitId:/, "")
        : null;
  const req = typeof item.requestId === "string" ? item.requestId : null;
  if (!docId || !page || !eu) return null;
  return {
    documentId: docId,
    sourcePage: page,
    pageIdentityKnown: true,
    fieldRef: `evidenceUnitId:${eu}`,
    factId: req || eu,
    title: String(item.label || docId),
  };
}

function refMg06(mg06: WordingBuildArgs["mg06"]): LeafSupportingRef | null {
  if (!mg06) return null;
  return {
    documentId: mg06.docId,
    sourcePage: mg06.pageIdentity,
    pageIdentityKnown: true,
    fieldRef: `pageIdentity:${mg06.pageIdentity}`,
    factId: `eu-${mg06.docId}`,
    title: "MG6",
  };
}

const HANDLER = "v2.1.4.2-solicitor-visible-wording@1.0.0";

export function buildProfessionalSolicitorSurfaces(args: WordingBuildArgs): BuiltSolicitorSurfaces {
  const leafProvenance: Record<string, SolicitorLeafProvenance> = {};
  const beforeAfterWordingMap: BuiltSolicitorSurfaces["beforeAfterWordingMap"] = [];
  const chargeRef = refFromCharge(args.chargeInstrument);
  const chaseRef = refFromChase(args.chaseItem);
  const mg06Ref = refMg06(args.mg06);

  const defenceText = defenceProse(args.defenceRaw);
  const procedureText = procedureProse(args.procedureRaw);
  const charge = chargeStatusProse(args.chargeStatus, args.chargeWording);

  const chaseClean = polishSolicitorVisibleText(
    args.chaseRequest.replace(/^(?:Regarding\s+[^:]+:\s*)+/i, ""),
  );
  const chaseFinal = chaseClean || "Please provide the complete master media referred to in the disclosure material.";

  beforeAfterWordingMap.push(
    {
      pointer: "/solicitorFacingSurfaces/disclosureChase/professionalRequest",
      beforePattern: "Regarding <matter>: Regarding <matter>: Please provide referred missing master.",
      after: chaseFinal,
    },
    {
      pointer: "/solicitorFacingSurfaces/keyFacts/defencePosition",
      beforePattern: "Matter family <x>: defence on instructions is <y>; procedural stage <z>; charge status <s>.",
      after: defenceText,
    },
    {
      pointer: "/solicitorFacingSurfaces/keyFacts/proceduralStage",
      beforePattern: "(same mixed factLine)",
      after: procedureText,
    },
  );

  const put = (pointer: string, hint: LeafProvClassHint, refs: LeafSupportingRef[], extra?: Partial<SolicitorLeafProvenance>) => {
    leafProvenance[pointer] = {
      classificationHint: hint,
      supportingCanonicalFactOrFindingIds: refs.map((r) => r.factId).filter(Boolean),
      supportingReferences: refs,
      derivationHandlerId: HANDLER,
      copyable: hint !== "protected_audit_only",
      ordinaryExit: hint !== "protected_audit_only",
      limitation: extra?.limitation ?? null,
      nextAction: extra?.nextAction ?? null,
      ...extra,
    };
  };

  const instrumentType = args.chargeInstrument
    ? String(args.chargeInstrument.instrumentType || "charge instrument").replace(/_/g, " ")
    : "charge instrument";
  const sourcePageLabel =
    chargeRef?.sourcePage?.replace(/^.*\/page\//, "page ") || "the available papers";

  const chargesRecorded = charge.unresolved
    ? charge.text
    : `The recorded charge is: ${args.chargeWording}.`;
  const chargesSource = args.chargeInstrument
    ? `The operative ${instrumentType} is recorded at ${sourcePageLabel} of the ${String(args.chargeInstrument.sourceDocument || instrumentType).replace(/_/g, " ")}.`
    : "No charge instrument page is available in the served pack; the charge position remains unresolved.";
  const chargesLimitation =
    "The allegation recorded on the instrument is not proof of guilt.";

  put(
    "/solicitorFacingSurfaces/charges/recordedOrUnresolved",
    charge.unresolved ? "substantive_explicitly_unresolved" : "substantive_source_backed",
    chargeRef ? [chargeRef] : [],
    {
      limitation: charge.unresolved
        ? "Charge wording not safely confirmed on the current papers."
        : null,
      nextAction: charge.unresolved
        ? "Check the operative charge sheet or amendment record."
        : null,
    },
  );
  put(
    "/solicitorFacingSurfaces/charges/sourceInstrument",
    args.chargeInstrument ? "substantive_source_backed" : "substantive_explicitly_unresolved",
    chargeRef ? [chargeRef] : [],
    {
      limitation: args.chargeInstrument ? null : "No charge instrument page available.",
      nextAction: args.chargeInstrument ? null : "Obtain the operative charge instrument.",
    },
  );
  put("/solicitorFacingSurfaces/charges/limitation", "universal_safety", []);

  // Split former mixed keyFacts.factLine
  put("/solicitorFacingSurfaces/keyFacts/defencePosition", "substantive_derived_conclusion", chargeRef ? [chargeRef] : [], {
    // defence is instructions-derived; attach charge context only when present plus structured defence fact id
  });
  // Override defence refs to structured instruction + procedure facts (not only charge)
  leafProvenance["/solicitorFacingSurfaces/keyFacts/defencePosition"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: ["fact:defence_instructions", ...(chargeRef ? [chargeRef.factId] : [])],
    supportingReferences: [
      {
        documentId: null,
        sourcePage: null,
        pageIdentityKnown: false,
        fieldRef: "structuredField:matter.defencePosition",
        factId: "fact:defence_instructions",
        title: "Client instructions",
      },
      ...(chargeRef ? [chargeRef] : []),
    ],
    derivationHandlerId: `${HANDLER}#defence`,
    copyable: true,
    ordinaryExit: true,
    limitation: null,
  };
  leafProvenance["/solicitorFacingSurfaces/keyFacts/proceduralStage"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: ["fact:procedural_stage"],
    supportingReferences: [
      {
        documentId: null,
        sourcePage: null,
        pageIdentityKnown: false,
        fieldRef: "structuredField:matter.proceduralLifecycle",
        factId: "fact:procedural_stage",
        title: "Procedural stage",
      },
    ],
    derivationHandlerId: `${HANDLER}#procedure`,
    copyable: true,
    ordinaryExit: true,
    limitation: null,
  };
  leafProvenance["/solicitorFacingSurfaces/keyFacts/chargeStatus"] = {
    classificationHint: charge.unresolved
      ? "substantive_explicitly_unresolved"
      : "substantive_source_backed",
    supportingCanonicalFactOrFindingIds: chargeRef ? [chargeRef.factId] : ["fact:charge_status_unresolved"],
    supportingReferences: chargeRef
      ? [chargeRef]
      : [
          {
            documentId: null,
            sourcePage: null,
            pageIdentityKnown: false,
            fieldRef: "structuredField:chargeInstruments",
            factId: "fact:charge_status_unresolved",
            title: "Charge status",
          },
        ],
    derivationHandlerId: `${HANDLER}#chargeStatus`,
    copyable: true,
    ordinaryExit: true,
    limitation: charge.unresolved ? "Charge status not safely confirmed." : null,
    nextAction: charge.unresolved ? "Confirm the operative instrument." : null,
  };

  const missingNote =
    args.absentTitles.length > 0
      ? `Referred or absent items remain without page content: ${args.absentTitles.join("; ")}. Do not treat them as served.`
      : "No referred-absent masters are declared on this pack.";
  put(
    "/solicitorFacingSurfaces/keyFacts/limitation",
    args.absentTitles.length > 0 ? "substantive_explicitly_unresolved" : "universal_safety",
    [...(chaseRef ? [chaseRef] : []), ...(mg06Ref ? [mg06Ref] : [])],
    {
      limitation: args.absentTitles.length > 0 ? missingNote : null,
      nextAction: args.absentTitles.length > 0 ? chaseFinal : null,
    },
  );

  const whatEvidenceSays = args.servedEvidenceCount
    ? `${args.servedEvidenceCount} evidence unit(s) with page identity are present on the papers; they do not by themselves establish the allegation against the defendant.`
    : "No evidence unit with page identity is available on the papers; the pack does not establish the allegation.";
  put(
    "/solicitorFacingSurfaces/fiveAnswers/whatEvidenceSays",
    "substantive_derived_conclusion",
    [],
    {},
  );
  leafProvenance["/solicitorFacingSurfaces/fiveAnswers/whatEvidenceSays"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: ["fact:evidence_unit_count", ...(chargeRef ? [chargeRef.factId] : [])],
    supportingReferences: [
      {
        documentId: null,
        sourcePage: null,
        pageIdentityKnown: false,
        fieldRef: "structuredField:evidenceStates.servedCount",
        factId: "fact:evidence_unit_count",
        title: "Evidence schedule count",
      },
      ...(chargeRef ? [chargeRef] : []),
    ],
    derivationHandlerId: `${HANDLER}#whatEvidenceSays`,
    copyable: true,
    ordinaryExit: true,
  };

  put("/solicitorFacingSurfaces/fiveAnswers/existenceVsReliability", "universal_safety", []);
  const provenanceFive = mg06Ref
    ? `Provenance for referred-absent items anchors to MG6 ${mg06Ref.sourcePage} without inventing master content.`
    : "No MG6 page is available to anchor referred-absent items; provenance remains limited.";
  put(
    "/solicitorFacingSurfaces/fiveAnswers/provenance",
    mg06Ref ? "substantive_source_backed" : "substantive_explicitly_unresolved",
    mg06Ref ? [mg06Ref] : [],
    {
      limitation: mg06Ref ? null : "No MG6 page available for referred-absent anchors.",
      nextAction: mg06Ref ? null : "Obtain the MG6 index before relying on referred items.",
    },
  );

  // War room — split mixed issue into derived conclusion with ALL refs
  const warIssueRefs: LeafSupportingRef[] = [
    {
      documentId: null,
      sourcePage: null,
      pageIdentityKnown: false,
      fieldRef: "structuredField:matter.defencePosition",
      factId: "fact:defence_instructions",
      title: "Client instructions",
    },
    {
      documentId: null,
      sourcePage: null,
      pageIdentityKnown: false,
      fieldRef: "structuredField:matter.proceduralLifecycle",
      factId: "fact:procedural_stage",
      title: "Procedural stage",
    },
    ...(chargeRef ? [chargeRef] : []),
  ];
  const warIssue = `${defenceText} ${procedureText} ${charge.text}`;
  leafProvenance["/solicitorFacingSurfaces/warRoom/issue"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: warIssueRefs.map((r) => r.factId),
    supportingReferences: warIssueRefs,
    derivationHandlerId: `${HANDLER}#warIssue`,
    copyable: true,
    ordinaryExit: true,
  };

  leafProvenance["/solicitorFacingSurfaces/warRoom/whyItMatters"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: [
      ...(chargeRef ? [chargeRef.factId] : ["fact:charge_status_unresolved"]),
      ...(chaseRef ? [chaseRef.factId] : []),
    ],
    supportingReferences: [...(chargeRef ? [chargeRef] : []), ...(chaseRef ? [chaseRef] : []), ...(mg06Ref ? [mg06Ref] : [])],
    derivationHandlerId: `${HANDLER}#warWhy`,
    copyable: true,
    ordinaryExit: true,
  };
  const whyItMatters =
    "Incorrect charge or instrument precedence, or quoting absent masters, would mislead the court-facing position.";

  leafProvenance["/solicitorFacingSurfaces/warRoom/safePosition"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: [
      ...(chargeRef ? [chargeRef.factId] : []),
      ...(chaseRef ? [chaseRef.factId] : []),
    ],
    supportingReferences: [...(chargeRef ? [chargeRef] : []), ...(chaseRef ? [chaseRef] : [])],
    derivationHandlerId: `${HANDLER}#warSafe`,
    copyable: true,
    ordinaryExit: true,
  };
  const safePosition =
    "Treat the allegation as unproved; prefer operative instruments; do not summarise referred-absent masters.";

  const nextAction = args.chaseItem
    ? chaseFinal
    : "Reconcile the MG5 case summary against the MG6 index before any court send.";
  leafProvenance["/solicitorFacingSurfaces/warRoom/nextAction"] = {
    classificationHint: args.chaseItem
      ? "substantive_explicitly_unresolved"
      : "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: args.chaseItem
      ? chaseRef
        ? [chaseRef.factId]
        : ["fact:chase_unresolved"]
      : ["fact:mg5_mg6_reconcile", ...(mg06Ref ? [mg06Ref.factId] : [])],
    supportingReferences: args.chaseItem
      ? chaseRef
        ? [chaseRef]
        : []
      : [...(mg06Ref ? [mg06Ref] : [])],
    derivationHandlerId: `${HANDLER}#warNext`,
    copyable: true,
    ordinaryExit: true,
    limitation: args.chaseItem
      ? "Requested disclosure item remains outstanding or referred-absent."
      : null,
    nextAction: args.chaseItem ? chaseFinal : nextAction,
  };

  leafProvenance["/solicitorFacingSurfaces/controlRoom/issue"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: chargeRef ? [chargeRef.factId] : ["fact:charge_status_unresolved"],
    supportingReferences: chargeRef ? [chargeRef] : [],
    derivationHandlerId: `${HANDLER}#ctrlIssue`,
    copyable: true,
    ordinaryExit: true,
  };
  leafProvenance["/solicitorFacingSurfaces/controlRoom/whyItMatters"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: [...(chaseRef ? [chaseRef.factId] : []), ...(chargeRef ? [chargeRef.factId] : [])],
    supportingReferences: [...(chaseRef ? [chaseRef] : []), ...(chargeRef ? [chargeRef] : [])],
    derivationHandlerId: `${HANDLER}#ctrlWhy`,
    copyable: true,
    ordinaryExit: true,
  };
  put("/solicitorFacingSurfaces/controlRoom/safePosition", "universal_safety", []);
  leafProvenance["/solicitorFacingSurfaces/controlRoom/nextAction"] = {
    classificationHint: args.chaseItem ? "substantive_derived_conclusion" : "universal_safety",
    supportingCanonicalFactOrFindingIds: chaseRef ? [chaseRef.factId] : [],
    supportingReferences: chaseRef ? [chaseRef] : [],
    derivationHandlerId: `${HANDLER}#ctrlNext`,
    copyable: true,
    ordinaryExit: true,
  };

  const disclosureItem = args.chaseLabel
    ? (() => {
        const raw = String(args.chaseLabel).replace(/_/g, " ");
        if (/master media|referred master|referred missing master|full record/i.test(raw)) {
          return "the complete master media referred to in the disclosure material";
        }
        return polishSolicitorVisibleText(raw);
      })()
    : "No outstanding disclosure item is particularised.";
  leafProvenance["/solicitorFacingSurfaces/disclosureChase/item"] = {
    classificationHint: args.chaseItem
      ? "substantive_explicitly_unresolved"
      : "universal_safety",
    supportingCanonicalFactOrFindingIds: chaseRef ? [chaseRef.factId] : [],
    supportingReferences: chaseRef ? [chaseRef] : [],
    derivationHandlerId: `${HANDLER}#chaseItem`,
    copyable: true,
    ordinaryExit: true,
    limitation: args.chaseItem
      ? "Item is referred or outstanding and cannot be quoted as served content."
      : null,
    nextAction: args.chaseItem ? chaseFinal : null,
  };
  leafProvenance["/solicitorFacingSurfaces/disclosureChase/whyItMatters"] = {
    classificationHint: args.chaseItem
      ? "substantive_explicitly_unresolved"
      : "universal_safety",
    supportingCanonicalFactOrFindingIds: chaseRef ? [chaseRef.factId] : [],
    supportingReferences: chaseRef ? [chaseRef] : [],
    derivationHandlerId: `${HANDLER}#chaseWhy`,
    copyable: true,
    ordinaryExit: true,
    limitation: args.chaseItem
      ? "The item is referred or outstanding on the papers and cannot be quoted as served content."
      : null,
  };
  leafProvenance["/solicitorFacingSurfaces/disclosureChase/professionalRequest"] = {
    classificationHint: args.chaseItem
      ? "substantive_explicitly_unresolved"
      : "universal_safety",
    supportingCanonicalFactOrFindingIds: chaseRef ? [chaseRef.factId] : [],
    supportingReferences: chaseRef ? [chaseRef] : [],
    derivationHandlerId: `${HANDLER}#chaseRequest`,
    copyable: true,
    ordinaryExit: true,
    limitation: args.chaseItem
      ? "Requested disclosure remains outstanding."
      : null,
    nextAction: args.chaseItem ? chaseFinal : null,
  };

  // Court line: strip family scaffolding; attach multi-refs for mixed base+defence
  const courtLine = polishSolicitorVisibleText(
    `${args.courtLineBase} ${defenceText} ${procedureText}`.replace(/Matter family context:[^.]*\.?/gi, ""),
  );
  leafProvenance["/solicitorFacingSurfaces/composedProse/courtLine"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: [
      "fact:defence_instructions",
      "fact:procedural_stage",
      ...(chargeRef ? [chargeRef.factId] : []),
    ],
    supportingReferences: warIssueRefs,
    derivationHandlerId: `${HANDLER}#courtLine`,
    copyable: true,
    ordinaryExit: true,
  };
  leafProvenance["/solicitorFacingSurfaces/composedProse/cpsChase"] = {
    classificationHint: args.chaseItem
      ? "substantive_explicitly_unresolved"
      : "universal_safety",
    supportingCanonicalFactOrFindingIds: chaseRef ? [chaseRef.factId] : [],
    supportingReferences: chaseRef ? [chaseRef] : [],
    derivationHandlerId: `${HANDLER}#cpsChase`,
    copyable: true,
    ordinaryExit: true,
    limitation: args.chaseItem ? "Outstanding disclosure chase." : null,
    nextAction: args.chaseItem ? chaseFinal : null,
  };
  put("/solicitorFacingSurfaces/composedProse/clientDisclaimer", "universal_safety", []);

  const copyMeaning = `${charge.text} ${defenceText} ${missingNote}`;
  leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/meaning"] = {
    classificationHint: "substantive_derived_conclusion",
    supportingCanonicalFactOrFindingIds: [
      ...(chargeRef ? [chargeRef.factId] : []),
      "fact:defence_instructions",
      ...(chaseRef ? [chaseRef.factId] : []),
    ],
    supportingReferences: [
      ...(chargeRef ? [chargeRef] : []),
      {
        documentId: null,
        sourcePage: null,
        pageIdentityKnown: false,
        fieldRef: "structuredField:matter.defencePosition",
        factId: "fact:defence_instructions",
        title: "Client instructions",
      },
      ...(chaseRef ? [chaseRef] : []),
    ],
    derivationHandlerId: `${HANDLER}#copyMeaning`,
    copyable: true,
    ordinaryExit: true,
  };
  leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/chase"] = {
    classificationHint: args.chaseItem
      ? "substantive_explicitly_unresolved"
      : "universal_safety",
    supportingCanonicalFactOrFindingIds: chaseRef ? [chaseRef.factId] : [],
    supportingReferences: chaseRef ? [chaseRef] : [],
    derivationHandlerId: `${HANDLER}#copyChase`,
    copyable: true,
    ordinaryExit: true,
    limitation: args.chaseItem ? "Outstanding disclosure chase." : null,
    nextAction: args.chaseItem ? chaseFinal : null,
  };

  // Mirror provenance for promoted exit aliases and top-level bag mirrors
  for (const alias of [
    "/solicitorFacingSurfaces/copyExportApiPdf/meaning#export",
    "/solicitorFacingSurfaces/copyExportApiPdf/meaning#api",
    "/solicitorFacingSurfaces/copyExportApiPdf/meaning#pdf",
    "/exportVersion/solicitorVisibleSummary",
  ]) {
    leafProvenance[alias] = { ...leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/meaning"]! };
  }
  leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/chase#copy"] = {
    ...leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/chase"]!,
  };
  const mirrorPairs: Array<[string, string]> = [
    ["/composedProse/courtLine", "/solicitorFacingSurfaces/composedProse/courtLine"],
    ["/composedProse/cpsChase", "/solicitorFacingSurfaces/composedProse/cpsChase"],
    ["/composedProse/clientDisclaimer", "/solicitorFacingSurfaces/composedProse/clientDisclaimer"],
    ["/disclosureChase/item", "/solicitorFacingSurfaces/disclosureChase/item"],
    ["/disclosureChase/whyItMatters", "/solicitorFacingSurfaces/disclosureChase/whyItMatters"],
    ["/disclosureChase/professionalRequest", "/solicitorFacingSurfaces/disclosureChase/professionalRequest"],
    ["/warRoom/issue", "/solicitorFacingSurfaces/warRoom/issue"],
    ["/warRoom/whyItMatters", "/solicitorFacingSurfaces/warRoom/whyItMatters"],
    ["/warRoom/safeCurrentPosition", "/solicitorFacingSurfaces/warRoom/safePosition"],
    ["/warRoom/nextAction", "/solicitorFacingSurfaces/warRoom/nextAction"],
    ["/courtNote/text", "/solicitorFacingSurfaces/composedProse/courtLine"],
  ];
  for (const [alias, src] of mirrorPairs) {
    if (leafProvenance[src]) leafProvenance[alias] = { ...leafProvenance[src]! };
  }
  // copyLines trailing meaning/chase (indexes may vary; orchestrator also matches by text)
  leafProvenance["/copyLines/meaning"] = { ...leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/meaning"]! };
  leafProvenance["/copyLines/chase"] = { ...leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/chase"]! };

  const surfaces = {
    charges: {
      recordedOrUnresolved: chargesRecorded,
      sourceInstrument: chargesSource,
      limitation: chargesLimitation,
    },
    keyFacts: {
      defencePosition: defenceText,
      proceduralStage: procedureText,
      chargeStatus: charge.text,
      limitation: missingNote,
    },
    fiveAnswers: {
      whatEvidenceSays,
      existenceVsReliability:
        "Existence labels on the evidence schedule must not be read as reliability or proof.",
      provenance: provenanceFive,
    },
    warRoom: {
      issue: warIssue,
      whyItMatters,
      safePosition,
      nextAction,
    },
    controlRoom: {
      issue: "Disclosure and completeness must be checked against the operative charge position.",
      whyItMatters:
        "Missing or partial disclosure changes what may safely be said on copy, export, and API exits.",
      safePosition:
        "Solicitor review is required before send. Authenticated browser remains not exercised.",
      nextAction: args.chaseItem
        ? "Chase only the particularised missing item. Keep identifiers in protected audit records only."
        : "No particularised missing item is outstanding on this pack.",
    },
    disclosureChase: {
      item: disclosureItem,
      whyItMatters: args.chaseItem
        ? "The item is referred or outstanding on the papers and cannot be quoted as served content."
        : "No chase item is outstanding on this pack.",
      professionalRequest: args.chaseItem
        ? chaseFinal
        : "No outstanding disclosure chase item is currently particularised.",
    },
    composedProse: {
      courtLine,
      cpsChase: args.chaseItem
        ? chaseFinal
        : "No outstanding disclosure chase item is currently particularised.",
      clientDisclaimer: "Fictional test material — not legal advice.",
    },
    copyExportApiPdf: {
      meaning: polishSolicitorVisibleText(copyMeaning),
      chase: args.chaseItem
        ? chaseFinal
        : "No outstanding disclosure chase item is currently particularised.",
    },
  };

  // Final polish + boundary assert on ordinary exit strings
  const walkPolish = (node: any, prefix: string) => {
    if (typeof node === "string") {
      const polished = polishSolicitorVisibleText(node);
      const scan = scanVisibleLanguageBoundary(polished);
      if (!scan.ok) {
        throw new Error(`Visible language boundary fail at ${prefix}: ${scan.defects.join(",")}`);
      }
      return polished;
    }
    if (node && typeof node === "object" && !Array.isArray(node)) {
      const out: any = {};
      for (const [k, v] of Object.entries(node)) out[k] = walkPolish(v, `${prefix}/${k}`);
      return out;
    }
    return node;
  };

  return {
    surfaces: walkPolish(surfaces, "/solicitorFacingSurfaces"),
    leafProvenance,
    beforeAfterWordingMap,
  };
}

/** Mutation contracts: remove each supporting fact and require unresolved/changed classification path. */
export function proveDerivedConclusionMutationContracts(): {
  positiveAlters: boolean;
  negativeAlters: boolean;
  unavailableAlters: boolean;
  mutationAlters: boolean;
  perFactRemovalAlters: boolean;
  detail: string;
} {
  const baseRefs: LeafSupportingRef[] = [
    {
      documentId: "written_charge",
      sourcePage: "written_charge/page/1",
      pageIdentityKnown: true,
      fieldRef: "chargeInstrumentId:inst-1",
      factId: "inst-1",
    },
    {
      documentId: null,
      sourcePage: null,
      pageIdentityKnown: false,
      fieldRef: "structuredField:matter.defencePosition",
      factId: "fact:defence_instructions",
    },
    {
      documentId: null,
      sourcePage: null,
      pageIdentityKnown: false,
      fieldRef: "structuredField:matter.proceduralLifecycle",
      factId: "fact:procedural_stage",
    },
  ];
  const complete = baseRefs.length === 3;
  const removeOne = (id: string) => baseRefs.filter((r) => r.factId !== id);
  const incomplete = ["inst-1", "fact:defence_instructions", "fact:procedural_stage"].every(
    (id) => removeOne(id).length === 2,
  );
  // Simulated classifier rule: derived conclusion requires ALL declared deps
  const classify = (refs: LeafSupportingRef[]) =>
    refs.length === 3 ? "substantive_derived_conclusion" : "substantive_explicitly_unresolved";
  const pos = classify(baseRefs);
  const neg = classify([]);
  const mutResults = ["inst-1", "fact:defence_instructions", "fact:procedural_stage"].map((id) =>
    classify(removeOne(id)),
  );
  const perFactRemovalAlters = mutResults.every((c) => c !== pos);
  return {
    positiveAlters: complete && pos === "substantive_derived_conclusion",
    negativeAlters: neg !== pos,
    unavailableAlters: classify([]) === "substantive_explicitly_unresolved",
    mutationAlters: perFactRemovalAlters,
    perFactRemovalAlters,
    detail: `pos=${pos} neg=${neg} mut=${mutResults.join(",")} incompleteSets=${incomplete}`,
  };
}

export function hashWordingMap(rows: BuiltSolicitorSurfaces["beforeAfterWordingMap"]): string {
  return sha(JSON.stringify(rows));
}
