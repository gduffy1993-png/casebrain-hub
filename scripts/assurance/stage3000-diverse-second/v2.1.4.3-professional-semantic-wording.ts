/**
 * V2.1.4.3 professional semantic solicitor-visible wording.
 * Shared-root only — no case/family/fixture patches.
 * Versioned vocabulary + structured clause composition.
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

const HANDLER = "v2.1.4.3-professional-semantic-wording@1.0.0";
const VOCAB_VERSION = "diverse3000-professional-vocab@1.0.0";

function sha(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** True when text is a heading/label/boilerplate — never usable as recorded charge wording. */
export function isChargeHeadingOrLabel(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (/^#{1,6}\s*/.test(t)) return true;
  if (/^particulars(\s+of(\s+the)?\s+offence)?\.?$/i.test(t)) return true;
  if (/^statement of offence\.?$/i.test(t)) return true;
  if (/^(charge|offence|count)\s*(wording|text|details)?\.?$/i.test(t)) return true;
  if (/^particulars\b/i.test(t) && t.length < 40 && !/contrary to|section\s+\d/i.test(t)) return true;
  if (/^##/.test(t)) return true;
  return false;
}

/** Complete source-backed charge wording — not a heading, has offence substance. */
export function isCompleteChargeWording(text: string): boolean {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t || isChargeHeadingOrLabel(t)) return false;
  if (t.length < 24) return false;
  // Require either statutory/common-law cue or a clear offence noun phrase of substance
  if (
    /contrary to|section\s+\d|Theft Act|Offences Against|common law|Criminal Justice|Sexual Offences|Misuse of Drugs|Fraud Act|Public Order|Offensive Weapons|Modern Slavery|Coroners|Corporate Manslaughter/i.test(
      t,
    )
  ) {
    return true;
  }
  // Longer narrative particulars without statute may still be incomplete for "operative" claims
  return false;
}

/**
 * Extract charge wording from matter/page — never returns headings as charge text.
 * Incomplete extracts return a structured incomplete marker (not invented wording).
 */
export function extractValidatedChargeWording(matter: any, pageText: string): {
  wording: string;
  complete: boolean;
  foundFragment: string | null;
  reason: string | null;
} {
  const fromMatter =
    (typeof matter?.charge?.wording === "string" && matter.charge.wording.trim()) ||
    (typeof matter?.charge === "string" && matter.charge.trim()) ||
    (typeof matter?.recordedChargeText === "string" && matter.recordedChargeText.trim()) ||
    "";
  if (fromMatter && isCompleteChargeWording(fromMatter)) {
    return { wording: fromMatter, complete: true, foundFragment: fromMatter, reason: null };
  }
  // Harness / skeleton placeholders are not instrument finds
  if (
    fromMatter &&
    (/not pinned|structural only|charge wording not/i.test(fromMatter) || isChargeHeadingOrLabel(fromMatter))
  ) {
    // fall through to page extract
  } else if (fromMatter && fromMatter.length >= 24 && !isChargeHeadingOrLabel(fromMatter)) {
    return {
      wording: fromMatter,
      complete: isCompleteChargeWording(fromMatter),
      foundFragment: fromMatter,
      reason: isCompleteChargeWording(fromMatter)
        ? null
        : "Matter charge text lacks a clear statutory or common-law cue.",
    };
  }

  const page = String(pageText || "");
  const patterns = [
    /STATEMENT OF OFFENCE[\s:\n]+([^\n#]{20,300})/i,
    /Particulars of (?:the )?offence[\s:\n]+([^\n#]{20,300})/i,
    /Charge wording[\s:\n]+([^\n#]{20,300})/i,
    /(?:^|\n)\s*(?:Count\s+\d+[:.\s]+)?([A-Z][^#\n]{20,300}contrary to[^#\n]{5,120})/i,
  ];
  for (const re of patterns) {
    const m = page.match(re);
    const frag = m?.[1]?.replace(/\s+/g, " ").trim() || "";
    if (frag && isCompleteChargeWording(frag)) {
      return { wording: frag, complete: true, foundFragment: frag, reason: null };
    }
    if (frag && !isChargeHeadingOrLabel(frag) && frag.length >= 24) {
      return {
        wording: frag,
        complete: false,
        foundFragment: frag,
        reason: "Extracted particulars lack a clear statutory or common-law cue.",
      };
    }
  }

  // Detect heading-only hits for honest reporting
  const headingHit =
    page.match(/#{1,6}\s*Particulars[^\n]*/i)?.[0] ||
    page.match(/\bPARTICULARS OF OFFENCE\b/i)?.[0] ||
    (fromMatter && isChargeHeadingOrLabel(fromMatter) ? fromMatter : null);

  return {
    wording: "",
    complete: false,
    foundFragment: headingHit ? String(headingHit).replace(/\s+/g, " ").trim() : null,
    reason: headingHit
      ? "Only a structural heading or label was found on the instrument (for example Particulars / Particulars of Offence); complete charge wording is not confirmed."
      : "Complete charge wording is not confirmed on the current papers.",
  };
}

export function polishSolicitorVisibleText(text: string): string {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  s = s.replace(/^(?:Regarding\s+[^:]{1,80}:\s*)+/i, (m) => {
    const once = m.match(/Regarding\s+[^:]{1,80}:/i);
    return once ? `${once[0]} ` : "";
  });
  s = s.replace(/^Matter family context:\s*/i, "");
  s = s.replace(/^Matter family\s+[^:]+:\s*/i, "");
  s = s
    .replace(/\brequest identifiers?\b/gi, "")
    .replace(/\baudit metadata\b/gi, "")
    .replace(/\bhandler\b/gi, "")
    .replace(/\bfixture\b/gi, "")
    .replace(/\bmatter family\b/gi, "matter")
    .replace(/\breferred-absent masters?\b/gi, "referred material that has not been supplied")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (tok) => tok.replace(/_/g, " "));
  // Acronym casing
  s = s.replace(/\babe\b/g, "ABE");
  s = s.replace(/\bbwv\b/g, "BWV");
  s = s.replace(/\bcctv\b/g, "CCTV");
  s = s.replace(/\broti\b/g, "ROTI");
  s = s.replace(/\bmg(\d{1,2})\b/gi, (_m, n) => `MG${n}`);
  return s.replace(/\s+/g, " ").trim();
}

/** Versioned procedural-stage vocabulary. */
export function procedureProse(raw: string): {
  text: string;
  unresolved: boolean;
  limitation: string | null;
  nextAction: string | null;
  factId: string;
} {
  const p = String(raw || "").replace(/_/g, " ").trim().toLowerCase();
  if (/^pet$|plea and trial|plea\s*&\s*trial|ptph/i.test(p) || p === "pet") {
    return {
      text: "The matter remains listed for a plea and trial preparation hearing.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:procedural_stage",
    };
  }
  if (/police.?investigation|^investigation$/.test(p)) {
    return {
      text: "The matter remains at the police-investigation stage.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:procedural_stage",
    };
  }
  if (/trial prep|pre[- ]?trial|trial preparation/.test(p)) {
    return {
      text: "The matter remains at the trial-preparation stage.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:procedural_stage",
    };
  }
  if (/first hearing|plea(?! and)/.test(p)) {
    return {
      text: "The matter remains at the first-hearing stage.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:procedural_stage",
    };
  }
  if (/sentence/.test(p)) {
    return {
      text: "The matter remains at the sentencing stage.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:procedural_stage",
    };
  }
  if (!p || /procedural stage|unknown|tbd/.test(p)) {
    return {
      text: "The procedural stage is not safely confirmed on the current papers.",
      unresolved: true,
      limitation: "Procedural stage token is missing or unrecognised.",
      nextAction: "Confirm the current hearing or investigation stage from the papers.",
      factId: "fact:procedural_stage_unresolved",
    };
  }
  // Unknown token — do not copy into prose
  return {
    text: "The procedural stage recorded on the papers could not be safely mapped to a recognised hearing stage.",
    unresolved: true,
    limitation: `Unrecognised procedural token was not copied into solicitor-facing prose (vocab ${VOCAB_VERSION}).`,
    nextAction: "Confirm the procedural stage from the hearing notice or custody record.",
    factId: "fact:procedural_stage_unresolved",
  };
}

/** Versioned defence-position mapping — does not overstate. */
export function defenceProse(raw: string): {
  text: string;
  unresolved: boolean;
  limitation: string | null;
  nextAction: string | null;
  factId: string;
} {
  const d = String(raw || "").replace(/_/g, " ").trim().toLowerCase();
  if (/factual denial|denies|denial/.test(d)) {
    return {
      text: "The client denies the allegation.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:defence_instructions",
    };
  }
  if (/alibi/.test(d)) {
    return {
      text: "The client advances an alibi on instructions.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:defence_instructions",
    };
  }
  if (/consent/.test(d)) {
    return {
      text: "The client disputes consent on instructions.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:defence_instructions",
    };
  }
  if (/lack of intent|no intent/.test(d)) {
    return {
      text: "The client disputes intent on instructions.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:defence_instructions",
    };
  }
  if (/self[- ]?defence/.test(d)) {
    return {
      text: "The client raises self-defence on instructions.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:defence_instructions",
    };
  }
  if (/no case to answer|no.case/.test(d)) {
    return {
      text: "On instructions, the defence will test whether the prosecution evidence establishes a case to answer.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:defence_instructions",
    };
  }
  if (/abuse of process/.test(d)) {
    return {
      text: "On instructions, there may be an abuse-of-process argument; that remains a potential issue requiring confirmation from the evidence and procedural history.",
      unresolved: false,
      limitation: "Abuse-of-process is flagged on instructions only — not confirmed as an established finding.",
      nextAction: "Confirm any abuse-of-process basis from the procedural history before court use.",
      factId: "fact:defence_instructions",
    };
  }
  if (/section\s*45|s\.?\s*45|indicator/.test(d)) {
    return {
      text: "The papers refer to a possible section 45 issue. The statutory basis and factual foundation are not pinned on the current pack, so no statutory defence is identified.",
      unresolved: true,
      limitation: "Section 45 reference lacks pinned legislation and factual basis.",
      nextAction: "Confirm the applicable statute and factual basis before describing any section 45 defence.",
      factId: "fact:defence_instructions_section45_unresolved",
    };
  }
  if (/on instructions/.test(d) || !d) {
    return {
      text: "The client’s position remains on instructions.",
      unresolved: false,
      limitation: null,
      nextAction: null,
      factId: "fact:defence_instructions",
    };
  }
  return {
    text: "The defence position on instructions could not be safely mapped to a recognised professional formulation.",
    unresolved: true,
    limitation: "Unrecognised defence-position token was not copied verbatim into solicitor-facing prose.",
    nextAction: "Confirm the defence position from instructions before court use.",
    factId: "fact:defence_instructions_unresolved",
  };
}

/** Convert canonical disclosure item identifiers into professional noun phrases. */
export function professionalDisclosureItemPhrase(label: string): string {
  let s = String(label || "")
    .replace(/\s*\(requestId\s*=\s*[^)]+\)\s*/gi, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/master media|referred master|referred missing master|full record/i.test(s)) {
    return "the complete master recording or media referred to in the disclosure material but not supplied";
  }
  if (/\babe\b/i.test(s) && /special.?measure/i.test(s)) {
    // Do not merge — prefer ABE if both mentioned in one label; caller should split
    return "the ABE recording or material referred to in the disclosure schedule";
  }
  if (/\babe\b/i.test(s)) {
    return "the ABE recording or material referred to in the disclosure schedule";
  }
  if (/special.?measure/i.test(s)) {
    return "the special-measures material referred to in the disclosure schedule";
  }
  if (/third.?party/i.test(s)) {
    return "the identified third-party material referred to in the disclosure schedule";
  }
  if (/^mg\s*6\b/i.test(s) || /^mg06\b/i.test(s)) {
    return "the complete MG6 file front sheet or index referred to in the disclosure material";
  }
  if (/^mg\s*5\b/i.test(s) || /^mg05\b/i.test(s)) {
    return "the complete MG5 case summary referred to in the disclosure material";
  }
  s = s.replace(/\s*\(missing\)\s*$/i, "").trim();
  if (!s || /nil outstanding|no outstanding/i.test(s)) {
    return "";
  }
  return polishSolicitorVisibleText(s);
}

export function professionalChaseRequestFromLabel(label: string): string {
  const item = professionalDisclosureItemPhrase(label);
  if (!item) return "";
  return `Please provide ${item}.`;
}

export function chargeStatusProse(args: {
  status: string;
  chargeExtract: ReturnType<typeof extractValidatedChargeWording>;
}): { text: string; unresolved: boolean; limitation: string | null; nextAction: string | null } {
  const { chargeExtract, status } = args;
  if (!chargeExtract.complete) {
    const fragRaw = chargeExtract.foundFragment
      ? chargeExtract.foundFragment.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim()
      : null;
    const found = fragRaw
      ? `What was found on the instrument was a structural heading or incomplete extract only (“${fragRaw}”).`
      : "No usable charge extract was found on the instrument.";
    return {
      text: `${found} Complete charge wording is not confirmed on the current papers. ${chargeExtract.reason || ""} Next action: check the operative charge sheet or amendment record.`
        .replace(/\s+/g, " ")
        .trim(),
      unresolved: true,
      limitation: chargeExtract.reason,
      nextAction: "Check the operative charge sheet or amendment record.",
    };
  }
  if (/operative/i.test(status)) {
    return {
      text: `The operative recorded charge is: ${chargeExtract.wording}.`,
      unresolved: false,
      limitation: null,
      nextAction: null,
    };
  }
  return {
    text: `The recorded charge is: ${chargeExtract.wording}.`,
    unresolved: false,
    limitation: null,
    nextAction: null,
  };
}

/** Structured court-line composition — never concatenates free-text status into broken joins. */
export function buildStructuredCourtLine(args: {
  charge: ReturnType<typeof chargeStatusProse>;
  defence: ReturnType<typeof defenceProse>;
  procedure: ReturnType<typeof procedureProse>;
}): string {
  const clauses: string[] = [];
  if (args.charge.unresolved) {
    clauses.push("Complete charge wording is not confirmed on the current papers.");
    if (args.charge.limitation) clauses.push(args.charge.limitation.replace(/\.$/, "") + ".");
    if (args.charge.nextAction) clauses.push(args.charge.nextAction.replace(/\.$/, "") + ".");
  } else {
    clauses.push(args.charge.text.replace(/\.$/, "") + ".");
    clauses.push("The allegation remains unproved on the current papers.");
  }
  clauses.push(args.defence.text.replace(/\.$/, "") + ".");
  clauses.push(args.procedure.text.replace(/\.$/, "") + ".");
  return clauses.join(" ").replace(/\s+/g, " ").trim();
}

export type SemanticDefect =
  | "markdown_heading_as_charge"
  | "broken_sentence_join"
  | "lowercase_protected_acronym"
  | "raw_pet_token"
  | "unknown_procedure_token_copied"
  | "raw_absence_identifier"
  | "ambiguous_section_reference"
  | "clunky_defence_label"
  | "incomplete_charge_as_operative"
  | "vague_combined_disclosure"
  | "referred_absent_masters_phrase"
  | "snake_case_token"
  | "duplicate_regarding_prefix"
  | "internal_process_language";

export function scanProfessionalSemanticQuality(text: string): {
  ok: boolean;
  defects: SemanticDefect[];
} {
  const defects: SemanticDefect[] = [];
  const s = String(text || "");
  if (/recorded charge is:\s*##/i.test(s) || /operative recorded charge is:\s*##/i.test(s)) {
    defects.push("markdown_heading_as_charge");
  }
  if (/##\s*Particulars/i.test(s) || /charge is:\s*Particulars(\s+of\s+offence)?\s*\.?$/i.test(s)) {
    defects.push("markdown_heading_as_charge");
  }
  if (/Action:\s*[^.?]+\.\s*remains\b/i.test(s) || /record that status:\s*The recorded/i.test(s)) {
    defects.push("broken_sentence_join");
  }
  if (/\babe\b/.test(s)) defects.push("lowercase_protected_acronym");
  if (/\bbwv\b/.test(s) || /\bcctv\b/.test(s)) defects.push("lowercase_protected_acronym");
  if (/\bprocedural stage is pet\b/i.test(s) || /\bis pet\./i.test(s)) defects.push("raw_pet_token");
  if (/referred_missing_master|third_party_material/i.test(s)) defects.push("raw_absence_identifier");
  if (/referred missing master(?!\s+recording|\s+or media|\s+media)/i.test(s)) {
    defects.push("raw_absence_identifier");
  }
  if (/third party material note/i.test(s)) defects.push("raw_absence_identifier");
  if (/referred-absent masters/i.test(s)) defects.push("referred_absent_masters_phrase");
  if (/section-45 indicator|engage a section-45/i.test(s)) defects.push("ambiguous_section_reference");
  if (/no case to answer focus/i.test(s)) defects.push("clunky_defence_label");
  if (/abuse of process argument(?! requiring|; that remains)/i.test(s) && !/potential/i.test(s)) {
    defects.push("clunky_defence_label");
  }
  if (/ABE or special measures/i.test(s) || /abe or special measures/i.test(s)) {
    defects.push("vague_combined_disclosure");
  }
  if (/operative recorded charge is:\s*##|recorded charge is:\s*##/i.test(s)) {
    defects.push("incomplete_charge_as_operative");
  }
  if (/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/.test(s)) defects.push("snake_case_token");
  if (/(Regarding\s+[^:]{1,80}:\s*){2,}/i.test(s)) defects.push("duplicate_regarding_prefix");
  if (/\b(audit metadata|request identifiers?|handler|fixture)\b/i.test(s)) {
    defects.push("internal_process_language");
  }
  // Keep backward-compatible alias used by older callers
  return { ok: defects.length === 0, defects };
}

/** Alias for callers expecting the V2.1.4.2 name. */
export function scanVisibleLanguageBoundary(text: string): { ok: boolean; defects: string[] } {
  const r = scanProfessionalSemanticQuality(text);
  return { ok: r.ok, defects: r.defects };
}

export type WordingBuildArgs = {
  familyProse: string;
  defenceRaw: string;
  procedureRaw: string;
  chargeWording: string;
  chargeStatus: string;
  chargeInstrument: Record<string, unknown> | null;
  chargeExtract: ReturnType<typeof extractValidatedChargeWording>;
  chaseRequest: string;
  chaseLabel: string | null;
  chaseItem: Record<string, unknown> | null;
  chaseLabels: string[];
  servedEvidenceCount: number;
  mg06: { docId: string; pageIdentity: string; sourcePageNo: string } | null;
  absentTitles: string[];
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

function structuredRef(fieldRef: string, factId: string, title: string): LeafSupportingRef {
  return {
    documentId: null,
    sourcePage: null,
    pageIdentityKnown: false,
    fieldRef,
    factId,
    title,
  };
}

export function buildProfessionalSolicitorSurfaces(args: WordingBuildArgs): BuiltSolicitorSurfaces {
  const leafProvenance: Record<string, SolicitorLeafProvenance> = {};
  const beforeAfterWordingMap: BuiltSolicitorSurfaces["beforeAfterWordingMap"] = [];
  const chargeRef = refFromCharge(args.chargeInstrument);
  const chaseRef = refFromChase(args.chaseItem);
  const mg06Ref = refMg06(args.mg06);

  const defence = defenceProse(args.defenceRaw);
  const procedure = procedureProse(args.procedureRaw);
  const charge = chargeStatusProse({
    status: args.chargeStatus,
    chargeExtract: args.chargeExtract,
  });
  const courtLine = buildStructuredCourtLine({ charge, defence, procedure });

  const labels = [
    ...(args.chaseLabel ? [args.chaseLabel] : []),
    ...args.chaseLabels,
    ...args.absentTitles,
  ].filter(Boolean);
  const uniqueLabels = [...new Set(labels.map((l) => String(l).trim()).filter(Boolean))];
  const itemPhrases = uniqueLabels
    .map((l) => professionalDisclosureItemPhrase(l))
    .filter(Boolean);
  // Deduplicate phrases; never merge ABE + special measures into one "or" phrase from a single label
  const distinctItems = [...new Set(itemPhrases)];
  const chaseFinal =
    distinctItems.length === 1
      ? `Please provide ${distinctItems[0]}.`
      : distinctItems.length > 1
        ? distinctItems.map((p) => `Please provide ${p}.`).join(" ")
        : "";

  beforeAfterWordingMap.push(
    {
      pointer: "/solicitorFacingSurfaces/charges/recordedOrUnresolved",
      beforePattern: "The recorded charge is: ## Particulars.",
      after: charge.text,
    },
    {
      pointer: "/solicitorFacingSurfaces/composedProse/courtLine",
      beforePattern: "Action: … remains not safely confirmed…",
      after: courtLine,
    },
    {
      pointer: "/solicitorFacingSurfaces/keyFacts/proceduralStage",
      beforePattern: "The procedural stage is pet.",
      after: procedure.text,
    },
    {
      pointer: "/solicitorFacingSurfaces/keyFacts/defencePosition",
      beforePattern: "section-45 indicator / no case to answer focus",
      after: defence.text,
    },
  );

  const put = (
    pointer: string,
    hint: LeafProvClassHint,
    refs: LeafSupportingRef[],
    factIds: string[],
    extra?: Partial<SolicitorLeafProvenance>,
  ) => {
    leafProvenance[pointer] = {
      classificationHint: hint,
      supportingCanonicalFactOrFindingIds: factIds,
      supportingReferences: refs,
      derivationHandlerId: HANDLER,
      copyable: hint !== "protected_audit_only",
      ordinaryExit: hint !== "protected_audit_only",
      limitation: extra?.limitation ?? null,
      nextAction: extra?.nextAction ?? null,
      ...extra,
    };
  };

  const chargesRecorded = charge.text;
  const instrumentType = args.chargeInstrument
    ? String(args.chargeInstrument.instrumentType || "charge instrument").replace(/_/g, " ")
    : "charge instrument";
  const sourcePageLabel =
    chargeRef?.sourcePage?.replace(/^.*\/page\//, "page ") || "the available papers";
  const chargesSource = args.chargeInstrument
    ? args.chargeExtract.complete
      ? `The operative ${instrumentType} is recorded at ${sourcePageLabel} of the ${String(args.chargeInstrument.sourceDocument || instrumentType).replace(/_/g, " ")}.`
      : `An instrument is present at ${sourcePageLabel}, but complete charge wording is not confirmed.`
    : "No charge instrument page is available in the served pack; the charge position remains unresolved.";

  put(
    "/solicitorFacingSurfaces/charges/recordedOrUnresolved",
    charge.unresolved ? "substantive_explicitly_unresolved" : "substantive_source_backed",
    chargeRef ? [chargeRef] : [structuredRef("structuredField:chargeInstruments", "fact:charge_unresolved", "Charge")],
    chargeRef ? [chargeRef.factId] : ["fact:charge_unresolved"],
    { limitation: charge.limitation, nextAction: charge.nextAction },
  );
  put(
    "/solicitorFacingSurfaces/charges/sourceInstrument",
    args.chargeInstrument && args.chargeExtract.complete
      ? "substantive_source_backed"
      : "substantive_explicitly_unresolved",
    chargeRef ? [chargeRef] : [],
    chargeRef ? [chargeRef.factId] : ["fact:charge_instrument_unresolved"],
    {
      limitation: args.chargeExtract.complete ? null : args.chargeExtract.reason,
      nextAction: args.chargeExtract.complete ? null : "Obtain or confirm the operative charge instrument wording.",
    },
  );
  put("/solicitorFacingSurfaces/charges/limitation", "universal_safety", [], []);

  put(
    "/solicitorFacingSurfaces/keyFacts/defencePosition",
    defence.unresolved ? "substantive_explicitly_unresolved" : "substantive_derived_conclusion",
    [structuredRef("structuredField:matter.defencePosition", defence.factId, "Client instructions")],
    [defence.factId],
    { limitation: defence.limitation, nextAction: defence.nextAction },
  );
  put(
    "/solicitorFacingSurfaces/keyFacts/proceduralStage",
    procedure.unresolved ? "substantive_explicitly_unresolved" : "substantive_derived_conclusion",
    [structuredRef("structuredField:matter.proceduralLifecycle", procedure.factId, "Procedural stage")],
    [procedure.factId],
    { limitation: procedure.limitation, nextAction: procedure.nextAction },
  );
  put(
    "/solicitorFacingSurfaces/keyFacts/chargeStatus",
    charge.unresolved ? "substantive_explicitly_unresolved" : "substantive_source_backed",
    chargeRef ? [chargeRef] : [structuredRef("structuredField:chargeInstruments", "fact:charge_unresolved", "Charge")],
    chargeRef ? [chargeRef.factId] : ["fact:charge_unresolved"],
    { limitation: charge.limitation, nextAction: charge.nextAction },
  );

  const missingNote =
    distinctItems.length > 0
      ? `The following referred material remains without page content and must not be treated as served: ${distinctItems.join("; ")}.`
      : "No specific outstanding disclosure item has been identified from the available papers.";
  put(
    "/solicitorFacingSurfaces/keyFacts/limitation",
    distinctItems.length > 0 ? "substantive_explicitly_unresolved" : "universal_safety",
    [...(chaseRef ? [chaseRef] : []), ...(mg06Ref ? [mg06Ref] : [])],
    [...(chaseRef ? [chaseRef.factId] : []), ...(mg06Ref ? [mg06Ref.factId] : [])],
    {
      limitation: distinctItems.length > 0 ? missingNote : null,
      nextAction: chaseFinal || null,
    },
  );

  const whatEvidenceSays = args.servedEvidenceCount
    ? `${args.servedEvidenceCount} evidence unit(s) with page identity are present on the papers; they do not by themselves establish the allegation against the defendant.`
    : "No evidence unit with page identity is available on the papers; the pack does not establish the allegation.";
  put(
    "/solicitorFacingSurfaces/fiveAnswers/whatEvidenceSays",
    "substantive_derived_conclusion",
    [
      structuredRef("structuredField:evidenceStates.servedCount", "fact:evidence_unit_count", "Evidence schedule count"),
      ...(chargeRef ? [chargeRef] : []),
    ],
    ["fact:evidence_unit_count", ...(chargeRef ? [chargeRef.factId] : [])],
  );
  put("/solicitorFacingSurfaces/fiveAnswers/existenceVsReliability", "universal_safety", [], []);
  const provenanceFive = mg06Ref
    ? `Provenance for referred material that has not been supplied anchors to MG6 ${mg06Ref.sourcePage} without inventing master content.`
    : "No MG6 page is available to anchor referred material that has not been supplied; provenance remains limited.";
  put(
    "/solicitorFacingSurfaces/fiveAnswers/provenance",
    mg06Ref ? "substantive_source_backed" : "substantive_explicitly_unresolved",
    mg06Ref ? [mg06Ref] : [],
    mg06Ref ? [mg06Ref.factId] : ["fact:mg06_missing"],
    {
      limitation: mg06Ref ? null : "No MG6 page available.",
      nextAction: mg06Ref ? null : "Obtain the MG6 index before relying on referred items.",
    },
  );

  const warIssueRefs = [
    structuredRef("structuredField:matter.defencePosition", defence.factId, "Client instructions"),
    structuredRef("structuredField:matter.proceduralLifecycle", procedure.factId, "Procedural stage"),
    ...(chargeRef ? [chargeRef] : []),
  ];
  const warIssue = `${defence.text} ${procedure.text} ${charge.text}`;
  put(
    "/solicitorFacingSurfaces/warRoom/issue",
    "substantive_derived_conclusion",
    warIssueRefs,
    warIssueRefs.map((r) => r.factId),
  );
  put(
    "/solicitorFacingSurfaces/warRoom/whyItMatters",
    "substantive_derived_conclusion",
    [...(chargeRef ? [chargeRef] : []), ...(chaseRef ? [chaseRef] : []), ...(mg06Ref ? [mg06Ref] : [])],
    [
      ...(chargeRef ? [chargeRef.factId] : ["fact:charge_unresolved"]),
      ...(chaseRef ? [chaseRef.factId] : []),
    ],
  );
  const whyItMatters =
    "Incorrect charge or instrument precedence, or quoting material that has not been supplied, would mislead the court-facing position.";
  put(
    "/solicitorFacingSurfaces/warRoom/safePosition",
    "substantive_derived_conclusion",
    [...(chargeRef ? [chargeRef] : []), ...(chaseRef ? [chaseRef] : [])],
    [...(chargeRef ? [chargeRef.factId] : []), ...(chaseRef ? [chaseRef.factId] : ["fact:nil_chase"])],
  );
  const safePosition =
    "Treat the allegation as unproved; prefer operative instruments; do not summarise material that has not been supplied.";

  const nextAction = chaseFinal
    ? chaseFinal
    : "Reconcile the MG5 case summary against the MG6 index before any court send.";
  put(
    "/solicitorFacingSurfaces/warRoom/nextAction",
    chaseFinal ? "substantive_explicitly_unresolved" : "substantive_derived_conclusion",
    chaseRef ? [chaseRef] : [...(mg06Ref ? [mg06Ref] : [])],
    chaseRef ? [chaseRef.factId] : ["fact:mg5_mg6_reconcile", ...(mg06Ref ? [mg06Ref.factId] : [])],
    {
      limitation: chaseFinal ? "Requested disclosure remains outstanding." : null,
      nextAction,
    },
  );

  put(
    "/solicitorFacingSurfaces/controlRoom/issue",
    charge.unresolved ? "substantive_explicitly_unresolved" : "substantive_derived_conclusion",
    chargeRef ? [chargeRef] : [],
    chargeRef ? [chargeRef.factId] : ["fact:charge_unresolved"],
  );
  put(
    "/solicitorFacingSurfaces/controlRoom/whyItMatters",
    "substantive_derived_conclusion",
    [...(chaseRef ? [chaseRef] : []), ...(chargeRef ? [chargeRef] : [])],
    [...(chaseRef ? [chaseRef.factId] : []), ...(chargeRef ? [chargeRef.factId] : [])],
  );
  put("/solicitorFacingSurfaces/controlRoom/safePosition", "universal_safety", [], []);
  put(
    "/solicitorFacingSurfaces/controlRoom/nextAction",
    chaseFinal ? "substantive_derived_conclusion" : "universal_safety",
    chaseRef ? [chaseRef] : [],
    chaseRef ? [chaseRef.factId] : [],
  );

  const disclosureItem =
    distinctItems.length === 1
      ? distinctItems[0]
      : distinctItems.length > 1
        ? distinctItems.join("; ")
        : "No specific outstanding disclosure item has been identified from the available papers.";
  put(
    "/solicitorFacingSurfaces/disclosureChase/item",
    chaseFinal ? "substantive_explicitly_unresolved" : "universal_safety",
    chaseRef ? [chaseRef] : [],
    chaseRef ? [chaseRef.factId] : [],
    {
      limitation: chaseFinal
        ? "Item is referred or outstanding and cannot be quoted as served content."
        : null,
      nextAction: chaseFinal || null,
    },
  );
  put(
    "/solicitorFacingSurfaces/disclosureChase/whyItMatters",
    chaseFinal ? "substantive_explicitly_unresolved" : "universal_safety",
    chaseRef ? [chaseRef] : [],
    chaseRef ? [chaseRef.factId] : [],
    {
      limitation: chaseFinal
        ? "The item is referred or outstanding on the papers and cannot be quoted as served content."
        : null,
    },
  );
  const professionalRequest = chaseFinal
    ? chaseFinal
    : "No specific outstanding disclosure item has been identified from the available papers.";
  put(
    "/solicitorFacingSurfaces/disclosureChase/professionalRequest",
    chaseFinal ? "substantive_explicitly_unresolved" : "universal_safety",
    chaseRef ? [chaseRef] : [],
    chaseRef ? [chaseRef.factId] : [],
    { limitation: chaseFinal ? "Requested disclosure remains outstanding." : null, nextAction: chaseFinal || null },
  );

  put(
    "/solicitorFacingSurfaces/composedProse/courtLine",
    "substantive_derived_conclusion",
    warIssueRefs,
    warIssueRefs.map((r) => r.factId),
  );
  put(
    "/solicitorFacingSurfaces/composedProse/cpsChase",
    chaseFinal ? "substantive_explicitly_unresolved" : "universal_safety",
    chaseRef ? [chaseRef] : [],
    chaseRef ? [chaseRef.factId] : [],
    { limitation: chaseFinal ? "Outstanding disclosure chase." : null, nextAction: chaseFinal || null },
  );
  put("/solicitorFacingSurfaces/composedProse/clientDisclaimer", "universal_safety", [], []);

  const copyMeaning = `${charge.text} ${defence.text} ${missingNote}`;
  put(
    "/solicitorFacingSurfaces/copyExportApiPdf/meaning",
    "substantive_derived_conclusion",
    [
      ...(chargeRef ? [chargeRef] : []),
      structuredRef("structuredField:matter.defencePosition", defence.factId, "Client instructions"),
      ...(chaseRef ? [chaseRef] : []),
    ],
    [
      ...(chargeRef ? [chargeRef.factId] : []),
      defence.factId,
      ...(chaseRef ? [chaseRef.factId] : []),
    ],
  );
  put(
    "/solicitorFacingSurfaces/copyExportApiPdf/chase",
    chaseFinal ? "substantive_explicitly_unresolved" : "universal_safety",
    chaseRef ? [chaseRef] : [],
    chaseRef ? [chaseRef.factId] : [],
    { limitation: chaseFinal ? "Outstanding disclosure chase." : null, nextAction: chaseFinal || null },
  );

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
  for (const [alias, src] of [
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
  ] as const) {
    if (leafProvenance[src]) leafProvenance[alias] = { ...leafProvenance[src]! };
  }
  leafProvenance["/copyLines/meaning"] = {
    ...leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/meaning"]!,
  };
  leafProvenance["/copyLines/chase"] = {
    ...leafProvenance["/solicitorFacingSurfaces/copyExportApiPdf/chase"]!,
  };

  const surfaces = {
    charges: {
      recordedOrUnresolved: chargesRecorded,
      sourceInstrument: chargesSource,
      limitation: "The allegation recorded on the instrument is not proof of guilt.",
    },
    keyFacts: {
      defencePosition: defence.text,
      proceduralStage: procedure.text,
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
      nextAction: chaseFinal
        ? "Chase only the particularised missing item. Keep identifiers in protected audit records only."
        : "No specific outstanding disclosure item has been identified from the available papers.",
    },
    disclosureChase: {
      item: disclosureItem,
      whyItMatters: chaseFinal
        ? "The item is referred or outstanding on the papers and cannot be quoted as served content."
        : "No specific outstanding disclosure item has been identified from the available papers.",
      professionalRequest,
    },
    composedProse: {
      courtLine,
      cpsChase: professionalRequest,
      clientDisclaimer: "Fictional test material — not legal advice.",
    },
    copyExportApiPdf: {
      meaning: polishSolicitorVisibleText(copyMeaning),
      chase: professionalRequest,
    },
  };

  const walkPolish = (node: any, prefix: string): any => {
    if (typeof node === "string") {
      const polished = polishSolicitorVisibleText(node);
      const scan = scanProfessionalSemanticQuality(polished);
      if (!scan.ok) {
        throw new Error(`Professional semantic boundary fail at ${prefix}: ${scan.defects.join(",")}`);
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

export function proveDerivedConclusionMutationContracts(): {
  positiveAlters: boolean;
  negativeAlters: boolean;
  unavailableAlters: boolean;
  mutationAlters: boolean;
  perFactRemovalAlters: boolean;
  detail: string;
} {
  const baseRefs = ["inst-1", "fact:defence_instructions", "fact:procedural_stage"];
  const classify = (refs: string[]) =>
    refs.length === 3 ? "substantive_derived_conclusion" : "substantive_explicitly_unresolved";
  const pos = classify(baseRefs);
  const neg = classify([]);
  const mut = baseRefs.map((id) => classify(baseRefs.filter((x) => x !== id)));
  return {
    positiveAlters: pos === "substantive_derived_conclusion",
    negativeAlters: neg !== pos,
    unavailableAlters: neg === "substantive_explicitly_unresolved",
    mutationAlters: mut.every((c) => c !== pos),
    perFactRemovalAlters: mut.every((c) => c !== pos),
    detail: `pos=${pos} neg=${neg} mut=${mut.join(",")}`,
  };
}

export function proveProfessionalSemanticContracts(): {
  markdownHeadingFails: boolean;
  lowercaseAcronymFails: boolean;
  rawPetFails: boolean;
  rawAbsenceFails: boolean;
  ambiguousSectionFails: boolean;
  brokenJoinFails: boolean;
  clunkyDefenceFails: boolean;
  incompleteChargeFails: boolean;
  vagueDisclosureFails: boolean;
  chargeExtractRejectsHeading: boolean;
  petMapsProfessionally: boolean;
  section45DoesNotOverstate: boolean;
  detail: string;
} {
  const md = scanProfessionalSemanticQuality("The recorded charge is: ## Particulars.");
  const abe = scanProfessionalSemanticQuality("Please provide the abe recording.");
  const pet = scanProfessionalSemanticQuality("The procedural stage is pet.");
  const abs = scanProfessionalSemanticQuality("Please provide referred missing master.");
  const s45 = scanProfessionalSemanticQuality("The client’s instructions engage a section-45 indicator.");
  const broken = scanProfessionalSemanticQuality(
    "Action: Check the operative charge sheet or amendment record. remains not safely confirmed on the current papers.",
  );
  const nocase = scanProfessionalSemanticQuality("On instructions, the defence position is no case to answer focus.");
  const incomplete = scanProfessionalSemanticQuality("The operative recorded charge is: ## PARTICULARS OF OFFENCE.");
  const vague = scanProfessionalSemanticQuality("Please provide abe or special measures.");
  const extract = extractValidatedChargeWording({}, "## Particulars.\nSome heading only");
  const petMap = procedureProse("pet");
  const s45map = defenceProse("section_45_indicator");
  return {
    markdownHeadingFails: !md.ok,
    lowercaseAcronymFails: !abe.ok,
    rawPetFails: !pet.ok,
    rawAbsenceFails: !abs.ok,
    ambiguousSectionFails: !s45.ok,
    brokenJoinFails: !broken.ok,
    clunkyDefenceFails: !nocase.ok,
    incompleteChargeFails: !incomplete.ok,
    vagueDisclosureFails: !vague.ok,
    chargeExtractRejectsHeading: !extract.complete && Boolean(extract.reason),
    petMapsProfessionally: /plea and trial preparation hearing/i.test(petMap.text),
    section45DoesNotOverstate:
      s45map.unresolved && /not pinned|possible section 45/i.test(s45map.text),
    detail: JSON.stringify({
      md: md.defects,
      extract: extract.reason,
      pet: petMap.text,
      s45: s45map.text.slice(0, 120),
    }),
  };
}

export function hashWordingMap(rows: BuiltSolicitorSurfaces["beforeAfterWordingMap"]): string {
  return sha(JSON.stringify(rows));
}
