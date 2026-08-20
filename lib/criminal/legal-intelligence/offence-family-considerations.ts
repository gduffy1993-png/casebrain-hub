/**
 * Recovered offence-family practitioner knowledge — useful intelligence split
 * from unsafe factual inference (claim-truth / gate-A class).
 *
 * Bad historical behaviour restored as CONSIDERATION only:
 *   Affray → self-defence remains live          → consider whether self-defence arises
 *   CAD mention → 999 outstanding               → consider related call/control-room material
 *   Offence shape → BWV missing                 → consider whether BWV exists / needs checking
 */

import type { AdvisoryConsideration } from "./types";

const OVERVIEW_SURFACES = [
  "overview",
  "court",
  "papers",
  "client",
  "file",
  "hearing_mode",
  "export",
] as const;

function baseConsideration(
  partial: Omit<AdvisoryConsideration, "supportClass" | "allowedSurfaces" | "recoverySource"> & {
    recoverySource?: AdvisoryConsideration["recoverySource"];
  },
): AdvisoryConsideration {
  return {
    supportClass: "PRACTITIONER_CONSIDERATION",
    allowedSurfaces: [...OVERVIEW_SURFACES],
    recoverySource: partial.recoverySource ?? "offence_family_knowledge",
    ...partial,
  };
}

/** Normalise for matching. */
function n(text: string | undefined | null): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type OffenceKnowledgeInput = {
  allegation?: string;
  offenceType?: string;
  bundleText?: string;
  /** Canonical / structured evidence labels already established. */
  establishedEvidenceLabels?: string[];
};

/**
 * Emit offence-shape and source-hint considerations without inventing evidence state.
 */
export function buildOffenceFamilyConsiderations(
  input: OffenceKnowledgeInput,
): AdvisoryConsideration[] {
  const charge = n([input.allegation, input.offenceType].filter(Boolean).join(" "));
  const bundle = n(input.bundleText);
  const established = (input.establishedEvidenceLabels ?? []).map((x) => n(x));
  const out: AdvisoryConsideration[] = [];

  const isViolenceOrPublicOrder =
    /\b(affray|assault|oapa|gbh|abh|s\.?\s*18|s\.?\s*20|s\.?\s*47|public.?order|violence|battery|wounding)\b/.test(
      charge,
    );

  if (isViolenceOrPublicOrder) {
    out.push(
      baseConsideration({
        id: "consider:self-defence-may-arise",
        what: "Consider whether self-defence or first-contact issues arise on instructions and the evidence sequence.",
        why: "Violence / public-order allegations often turn on who used force first and whether any response was reasonable — but that is not established merely because the charge is Affray or assault.",
        canonicalTriggers: charge ? [`offence:${charge.slice(0, 80)}`] : ["offence:violence_or_public_order"],
        provenance: ["offence_family_knowledge:violence_public_order"],
        scope: "general_professional",
        mustConfirmBeforeFactualLanguage: [
          "Client instructions on belief in need to use force",
          "Source-backed sequence / first contact evidence",
          "Any served CCTV/BWV/witness account supporting the defence narrative",
        ],
        category: "self_defence",
        confidence: "medium",
        offenceShapeOnly: true,
      }),
    );
  }

  // CAD / listing timing → check related call material (NOT "999 outstanding")
  if (/\bcad\b|\blisting\b.*\btiming\b|\bcontrol.?room\b/.test(bundle) && !/\b999\b/.test(established.join(" "))) {
    const cadEstablished = /\bcad\b/.test(bundle);
    out.push(
      baseConsideration({
        id: "consider:cad-related-call-material",
        what: "The CAD / listing timing reference may justify checking whether related call or control-room material exists or is relevant.",
        why: "CAD timing can be analytically useful for sequence, but it does not by itself establish that 999 audio is outstanding.",
        canonicalTriggers: cadEstablished ? ["source:cad_or_timing_reference"] : ["source:timing_reference"],
        provenance: ["offence_family_knowledge:cad_vs_999_split"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Explicit source mention that 999 audio / call recording exists or is outstanding",
          "Schedule or MG6 entry for 999 / control-room product",
        ],
        category: "disclosure",
        confidence: "medium",
        offenceShapeOnly: false,
      }),
    );
  }

  // BWV consideration where circumstances make it sensible — never "BWV missing" from offence alone
  const bwvMentioned = /\bbwv\b|body[-\s]?worn/.test(bundle);
  const bwvEstablished = established.some((e) => /\bbwv\b|body[-\s]?worn/.test(e));
  if (bwvEstablished) {
    out.push(
      baseConsideration({
        id: "consider:bwv-established-review",
        what: "Consider how served or outstanding BWV will be used for sequence, force, and first-contact analysis once the product is reviewed.",
        why: "Where papers already establish BWV status, the remaining intelligence is tactical use — not inventing a missing counter.",
        canonicalTriggers: ["source:bwv_established"],
        provenance: ["offence_family_knowledge:bwv_tactical_use"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Actual BWV content before asserting what footage shows",
        ],
        category: "disclosure",
        confidence: "high",
      }),
    );
  } else if (bwvMentioned) {
    out.push(
      baseConsideration({
        id: "consider:bwv-source-mentioned",
        what: "Consider confirming BWV status (served / outstanding / not used) where papers refer to body-worn video.",
        why: "A BWV reference is source-specific and warrants status confirmation — without inventing a missing-evidence counter.",
        canonicalTriggers: ["source:bwv_mention"],
        provenance: ["offence_family_knowledge:bwv_status_check"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Schedule / MG entry stating BWV is outstanding or not served",
        ],
        category: "disclosure",
        confidence: "medium",
      }),
    );
  } else if (isViolenceOrPublicOrder || /\bcustody\b|\barrest\b|\bofficer\b/.test(bundle)) {
    out.push(
      baseConsideration({
        id: "consider:bwv-may-exist",
        what: "Consider whether BWV exists or requires checking where arrest / officer / violence circumstances make that a sensible investigative question.",
        why: "Officer involvement often produces BWV, but offence shape alone must not create a 'BWV missing' fact or chase item.",
        canonicalTriggers: ["circumstance:arrest_or_violence"],
        provenance: ["offence_family_knowledge:bwv_investigative_question"],
        scope: "general_professional",
        mustConfirmBeforeFactualLanguage: [
          "Source mention of BWV / body-worn product",
          "Schedule entry for BWV",
        ],
        category: "disclosure",
        confidence: "low",
        offenceShapeOnly: true,
      }),
    );
  }

  // Identification / participation — robbery and multi-party CCTV matters
  if (/\brobbery\b|\bidentif|\bturnbull\b|\bparticipation\b|\bco-?defendant\b/.test(`${charge} ${bundle}`)) {
    out.push(
      baseConsideration({
        id: "consider:identification-participation",
        what: "Consider identification and participation issues (including Turnbull where recognition/ID is in play) against served CCTV and witness products.",
        why: "Robbery and multi-party matters frequently turn on who did what — restored as consideration when source or offence engages ID/participation.",
        canonicalTriggers: [/\brobbery\b/.test(charge) ? "offence:robbery" : "source:id_or_participation"],
        provenance: ["offence_family_knowledge:identification_participation"],
        scope: /\bidentif|\bturnbull\b|\bco-?defendant\b/.test(bundle) ? "source_specific" : "general_professional",
        mustConfirmBeforeFactualLanguage: [
          "Served ID / CCTV / witness material before asserting identification theory",
        ],
        category: "identification",
        confidence: "medium",
        offenceShapeOnly: !/\bidentif|\bturnbull\b|\bco-?defendant\b|\bcctv\b/.test(bundle),
      }),
    );
  }

  // Medical — consideration only unless papers establish medical material
  if (isViolenceOrPublicOrder && !established.some((e) => /\bmedical\b|\binjury\b|\bhospital\b/.test(e))) {
    if (/\bmedical\b|\binjury\b|\bhospital\b|\bwound\b/.test(bundle)) {
      out.push(
        baseConsideration({
          id: "consider:medical-source-mentioned",
          what: "Consider confirming medical / injury material status where papers refer to injury or medical attention.",
          why: "Injury references can be evidentially significant for harm and causation without inventing an outstanding medical report.",
          canonicalTriggers: ["source:medical_or_injury_mention"],
          provenance: ["offence_family_knowledge:medical_status_check"],
          scope: "source_specific",
          mustConfirmBeforeFactualLanguage: [
            "Schedule / MG entry stating medical report is outstanding or served",
          ],
          category: "medical",
          confidence: "medium",
        }),
      );
    } else {
      out.push(
        baseConsideration({
          id: "consider:medical-may-be-relevant",
          what: "Consider whether medical or injury evidence is relevant to harm / causation once instructions and papers are reviewed.",
          why: "Violence allegations often engage harm evidence, but that is a professional consideration until papers establish medical material.",
          canonicalTriggers: charge ? [`offence:${charge.slice(0, 80)}`] : ["offence:violence"],
          provenance: ["offence_family_knowledge:medical_relevance"],
          scope: "general_professional",
          mustConfirmBeforeFactualLanguage: [
            "Source mention of medical / injury product",
          ],
          category: "medical",
          confidence: "low",
          offenceShapeOnly: true,
        }),
      );
    }
  }

  // Interview strategy — only when interview is in papers
  if (/\binterview\b/.test(bundle)) {
    out.push(
      baseConsideration({
        id: "consider:interview-modality",
        what: "Consider separating interview summary vs full recording vs transcript service issues before any court or chase wording.",
        why: "Interview modality splits are high-risk for false 'missing' claims; each product must be tracked independently.",
        canonicalTriggers: ["source:interview_mention"],
        provenance: ["offence_family_knowledge:interview_modality_split"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Which interview product is served (summary / recording / transcript)",
        ],
        category: "interview",
        confidence: "high",
      }),
    );
  }

  // CCTV clip vs master
  if (/\bcctv\b/.test(bundle)) {
    out.push(
      baseConsideration({
        id: "consider:cctv-clip-vs-master",
        what: "Consider distinguishing CCTV stills/clips from master footage / export log before asserting continuity or completeness.",
        why: "Clip/master confusion is a known false-open class; stills do not prove master continuity.",
        canonicalTriggers: ["source:cctv_mention"],
        provenance: ["offence_family_knowledge:cctv_clip_master_split"],
        scope: "source_specific",
        mustConfirmBeforeFactualLanguage: [
          "Explicit source language on master / export / continuity status",
        ],
        category: "disclosure",
        confidence: "high",
      }),
    );
  }

  return out;
}
