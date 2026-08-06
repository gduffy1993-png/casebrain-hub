/**
 * Batch-3 Stage-150 packet-local detectors (all ESA-feasible remaining SNI controls).
 * Deterministic; inventory-bound; no truth opening; no case-specific patches.
 */

import type { Stage150EvalContext, Stage150Hit } from "./detectors";
import { includedWordingLeaves } from "./detectors";
import type { SharedEngineId } from "../every-word/types";

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function hit(
  partial: Omit<Stage150Hit, "exactWording"> & { exactWording?: string },
): Stage150Hit {
  return { ...partial, exactWording: partial.exactWording ?? "" };
}

type WordingRule = {
  controlId: string;
  findingCode: string;
  handlerId: string;
  engineId: SharedEngineId;
  candidateClass: Stage150Hit["candidateClass"];
  plainEnglish: string;
  match: (text: string, ref: string) => boolean;
};

const WORDING_RULES: WordingRule[] = [
  {
    controlId: "MAA2-BND-03-REPLACEMENT-LINKS",
    findingCode: "BND_REPLACEMENT_UNLINKED",
    handlerId: "replacement_unlinked",
    engineId: "document_relationship",
    candidateClass: "candidate_defect",
    plainEnglish: "Replacement/supersession mentioned without link to prior instrument.",
    match: (t) =>
      /\b(replaced|superseded|replacement)\b/i.test(t) &&
      !/\b(replaces|supersedes|linked\s+to|see\s+(prior|previous)|formerly)\b/i.test(t),
  },
  {
    controlId: "MAA2-BND-04-VERSION-PRECEDENCE",
    findingCode: "BND_VERSION_PRECEDENCE_COLLAPSE",
    handlerId: "version_precedence_collapse",
    engineId: "document_relationship",
    candidateClass: "candidate_defect",
    plainEnglish: "Multiple versions treated without precedence cue.",
    match: (t) =>
      /\bversion\s+\d+\b/i.test(t) &&
      /\bversion\s+\d+\b/i.test(t) &&
      (t.match(/\bversion\s+\d+\b/gi) ?? []).length >= 2 &&
      !/\b(latest|operative|supersedes|takes\s+precedence)\b/i.test(t),
  },
  {
    controlId: "MAA2-BND-05-MISSING-ATTACHMENTS",
    findingCode: "BND_MISSING_ATTACHMENT_CLAIM",
    handlerId: "missing_attachment_claim",
    engineId: "document_relationship",
    candidateClass: "unresolved",
    plainEnglish: "Attachment claimed present while marked missing/absent.",
    match: (t) =>
      /\battachment\b/i.test(t) &&
      /\b(attached|included|enclosed)\b/i.test(t) &&
      /\b(missing|absent|not\s+attached)\b/i.test(t),
  },
  {
    controlId: "MAA2-BND-06-EXHIBIT-LABEL-COLLISION",
    findingCode: "BND_EXHIBIT_LABEL_COLLISION",
    handlerId: "exhibit_label_collision",
    engineId: "document_relationship",
    candidateClass: "candidate_defect",
    plainEnglish: "Same exhibit label applied to distinct items.",
    match: (t) =>
      /\bexhibit\s+[A-Z]?\d+\b/i.test(t) &&
      /\b(same\s+exhibit|duplicate\s+exhibit\s+label|label\s+collision)\b/i.test(t),
  },
  {
    controlId: "MAA2-BND-13-CODEFENDANT-ONLY",
    findingCode: "BND_CODEFENDANT_ONLY_AS_SHARED",
    handlerId: "codefendant_only_as_shared",
    engineId: "document_relationship",
    candidateClass: "candidate_defect",
    plainEnglish: "Co-defendant-only material treated as shared/defendant evidence.",
    match: (t) =>
      /\bco-?defendant\s+only\b/i.test(t) &&
      /\b(shared|our\s+bundle|defendant.?s\s+case|served\s+on\s+(the\s+)?defendant)\b/i.test(t),
  },
  {
    controlId: "MAA2-BND-16-NO-INVENTED-RELATIONSHIPS",
    findingCode: "BND_INVENTED_RELATIONSHIP",
    handlerId: "invented_relationship",
    engineId: "document_relationship",
    candidateClass: "candidate_defect",
    plainEnglish: "Document relationship invented without source cue.",
    match: (t) =>
      /\b(therefore\s+the\s+same\s+document|must\s+be\s+the\s+same\s+exhibit|inferred\s+relationship)\b/i.test(
        t,
      ) && !/\b(source|recorded|per\s+index)\b/i.test(t),
  },
  {
    controlId: "MAA2-FID-01-NAMES-DEFENDANT-ALLOC",
    findingCode: "FID_NAME_DEFENDANT_ALLOC_UNCLEAR",
    handlerId: "name_defendant_alloc",
    engineId: "charge_legal_state",
    candidateClass: "unresolved",
    plainEnglish: "Name/defendant allocation unclear across counts.",
    match: (t) =>
      /\b(defendant|accused)\b/i.test(t) &&
      /\b(unclear|ambiguous|which\s+defendant|name\s+mismatch)\b/i.test(t),
  },
  {
    controlId: "MAA2-FID-04-DATES-TIMES-LOCATIONS-MONEY",
    findingCode: "FID_PARTICULAR_VALUE_DRIFT",
    handlerId: "particular_value_drift",
    engineId: "charge_legal_state",
    candidateClass: "candidate_defect",
    plainEnglish: "Date/time/location/money particulars appear altered without cue.",
    match: (t) =>
      /\b(date|time|location|£|\$|amount)\b/i.test(t) &&
      /\b(changed\s+to|corrected\s+silently|now\s+reads)\b/i.test(t) &&
      !/\b(amendment\s+notice|formally\s+amended)\b/i.test(t),
  },
  {
    controlId: "MAA2-FID-05-EXHIBIT-DOC-REFS",
    findingCode: "FID_EXHIBIT_REF_BROKEN",
    handlerId: "exhibit_ref_broken",
    engineId: "charge_legal_state",
    candidateClass: "unresolved",
    plainEnglish: "Exhibit/document reference asserted without resolvable ref cue.",
    match: (t) =>
      /\b(exhibit|MG\d+|document)\b/i.test(t) &&
      /\b(see\s+above|as\s+referenced|that\s+document)\b/i.test(t) &&
      !/\b(exhibit\s+[A-Z]?\d+|MG\d+\s*(para|p\.|page)|doc(ument)?\s*id)\b/i.test(t),
  },
  {
    controlId: "MAA2-FID-08-NO-STRENGTHEN-ALLEGE-TO-FACT",
    findingCode: "FID_STRENGTHEN_ALLEGE_TO_FACT",
    handlerId: "strengthen_allege_to_fact",
    engineId: "charge_legal_state",
    candidateClass: "candidate_defect",
    plainEnglish: "Allegation strengthened into proven fact.",
    match: (t) =>
      /\b(alleged|allegation)\b/i.test(t) &&
      /\b(is\s+proven|established\s+fact|beyond\s+doubt)\b/i.test(t) &&
      !/\b(remains\s+alleged|not\s+proven)\b/i.test(t),
  },
  {
    controlId: "MAA2-LSL-04-NO-HYPOTHESIS-TO-ADVICE",
    findingCode: "LSL_HYPOTHESIS_AS_ADVICE",
    handlerId: "hypothesis_as_advice",
    engineId: "charge_legal_state",
    candidateClass: "candidate_defect",
    plainEnglish: "Hypothesis presented as solicitor advice/instruction.",
    match: (t) =>
      /\b(hypothesis|possible\s+scenario|might\s+have)\b/i.test(t) &&
      /\b(you\s+should|advice\s+is|instruct\s+counsel|must\s+argue)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHG-03-STATEMENT-VS-PARTICULARS",
    findingCode: "CHG_STATEMENT_PARTICULARS_COLLAPSE",
    handlerId: "statement_vs_particulars",
    engineId: "charge_legal_state",
    candidateClass: "candidate_defect",
    plainEnglish: "Witness statement treated as charge particulars.",
    match: (t) =>
      /\b(statement|MG11)\b/i.test(t) &&
      /\b(is\s+the\s+charge|as\s+particulars|charge\s+wording)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHG-07-STATUTORY-PROVISION",
    findingCode: "CHG_STATUTORY_PROVISION_MISSING",
    handlerId: "statutory_provision_missing",
    engineId: "charge_legal_state",
    candidateClass: "unresolved",
    plainEnglish: "Charge cites offence without statutory provision cue.",
    match: (t) =>
      /\b(charged\s+with|offence\s+of)\b/i.test(t) &&
      !/\b(s\.?\s*\d+|section\s+\d+|contrary\s+to)\b/i.test(t) &&
      /\b(theft|assault|GBH|PWITS|fraud)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHG-09-VERIFIED-DISCREPANCY-STATE",
    findingCode: "CHG_DISCREPANCY_UNSTATED",
    handlerId: "discrepancy_unstated",
    engineId: "charge_legal_state",
    candidateClass: "candidate_defect",
    plainEnglish: "Verified discrepancy collapsed without stated discrepancy state.",
    match: (t) =>
      /\b(discrepanc\w+|inconsisten\w+)\b/i.test(t) &&
      /\b(resolved|ignore|same\s+charge)\b/i.test(t) &&
      !/\b(discrepancy\s+(noted|recorded|outstanding))\b/i.test(t),
  },
  {
    controlId: "MAA2-CHG-11-NO-REGISTRY-AS-OPERATIVE-FACT",
    findingCode: "CHG_REGISTRY_AS_OPERATIVE",
    handlerId: "registry_as_operative",
    engineId: "charge_legal_state",
    candidateClass: "candidate_defect",
    plainEnglish: "Internal registry/meta treated as operative charge fact.",
    match: (t) =>
      /\b(registry|casebrain\s+id|internal\s+code)\b/i.test(t) &&
      /\b(operative\s+charge|the\s+charge\s+is)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHG-12-SOURCE-AND-REQUIRED-ACTION",
    findingCode: "CHG_SOURCE_WITHOUT_ACTION",
    handlerId: "source_without_action",
    engineId: "charge_legal_state",
    candidateClass: "unresolved",
    plainEnglish: "Charge source issue noted without required action.",
    match: (t) =>
      /\b(charge\s+source|source\s+of\s+charge)\b/i.test(t) &&
      /\b(unclear|missing|disputed)\b/i.test(t) &&
      !/\b(must|required|chase|obtain|confirm)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHG-13-NO-GENERIC-VERIFY-REPLACE",
    findingCode: "CHG_GENERIC_VERIFY_REPLACE",
    handlerId: "generic_verify_replace",
    engineId: "charge_legal_state",
    candidateClass: "candidate_defect",
    plainEnglish: "Generic verify/replace instruction without charge-specific cue.",
    match: (t) =>
      /\b(verify\s+and\s+replace|check\s+and\s+update\s+as\s+needed)\b/i.test(t) &&
      /\bcharge\b/i.test(t) &&
      !/\b(count\s+\d+|section\s+\d+|particulars)\b/i.test(t),
  },
  {
    controlId: "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
    findingCode: "ATR_DOCUMENT_OWNERSHIP_UNCLEAR",
    handlerId: "document_ownership_unclear",
    engineId: "evidence_attribution",
    candidateClass: "unresolved",
    plainEnglish: "Document ownership/attribution unclear.",
    match: (t) =>
      /\b(document|exhibit|statement)\b/i.test(t) &&
      /\b(whose|ownership\s+unclear|unattributed)\b/i.test(t),
  },
  {
    controlId: "MAA2-ATR-03-STATEMENT-OWNERSHIP",
    findingCode: "ATR_STATEMENT_OWNERSHIP_COLLAPSE",
    handlerId: "statement_ownership_collapse",
    engineId: "evidence_attribution",
    candidateClass: "candidate_defect",
    plainEnglish: "Statement ownership collapsed across speakers.",
    match: (t) =>
      /\b(MG11|witness\s+statement)\b/i.test(t) &&
      /\b(same\s+as|also\s+said\s+by|merged\s+account)\b/i.test(t) &&
      !/\b(separate\s+statement|distinct\s+witness)\b/i.test(t),
  },
  {
    controlId: "MAA2-ATR-06-GROUP-VS-INDIVIDUAL",
    findingCode: "ATR_GROUP_AS_INDIVIDUAL",
    handlerId: "group_as_individual",
    engineId: "evidence_attribution",
    candidateClass: "candidate_defect",
    plainEnglish: "Group attribution presented as individual proven act.",
    match: (t) =>
      /\b(they|the\s+group|defendants)\b/i.test(t) &&
      /\b(he\s+personally|she\s+alone|individual\s+guilt)\b/i.test(t) &&
      !/\b(alleged|role\s+unclear)\b/i.test(t),
  },
  {
    controlId: "MAA2-ATR-07-INFERENCE-VS-PROVEN",
    findingCode: "ATR_INFERENCE_AS_PROVEN",
    handlerId: "inference_as_proven",
    engineId: "evidence_attribution",
    candidateClass: "candidate_defect",
    plainEnglish: "Inference presented as proven attribution.",
    match: (t) =>
      /\b(infer|inference|appears\s+to\s+be)\b/i.test(t) &&
      /\b(proven|established|confirmed)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHR-08-PROCEDURAL-DEADLINES",
    findingCode: "CHR_DEADLINE_UNSTATED",
    handlerId: "deadline_unstated",
    engineId: "chronology_procedure",
    candidateClass: "unresolved",
    plainEnglish: "Procedural deadline referenced without date/state.",
    match: (t) =>
      /\b(deadline|time\s+limit|must\s+be\s+filed|PTPH\s+deadline)\b/i.test(t) &&
      !/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|by\s+\d|due\s+\d)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHR-11-DUPLICATE-OMITTED-EVENTS",
    findingCode: "CHR_DUPLICATE_OR_OMITTED_EVENT",
    handlerId: "duplicate_omitted_event",
    engineId: "chronology_procedure",
    candidateClass: "candidate_defect",
    plainEnglish: "Chronology shows duplicate or omitted event cue.",
    match: (t) =>
      /\b(duplicate\s+(hearing|event)|omitted\s+(hearing|event)|missing\s+from\s+timeline)\b/i.test(t),
  },
  {
    controlId: "MAA2-PRC-01-STAGE-TAGGING",
    findingCode: "PRC_STAGE_UNTAGGED",
    handlerId: "stage_untagged",
    engineId: "chronology_procedure",
    candidateClass: "unresolved",
    plainEnglish: "Procedural content without stage tag.",
    match: (t) =>
      /\b(hearing|plea|PTPH|trial|sentence)\b/i.test(t) &&
      /\b(stage\s+unknown|untagged|no\s+stage)\b/i.test(t),
  },
  {
    controlId: "MAA2-PRC-02-WRONG-STAGE-DETECT",
    findingCode: "PRC_WRONG_STAGE",
    handlerId: "wrong_stage",
    engineId: "chronology_procedure",
    candidateClass: "candidate_defect",
    plainEnglish: "Wrong procedural stage applied.",
    match: (t) =>
      /\bmarked\s+as\s+(trial|PTPH|sentence|plea)\b/i.test(t) &&
      /\b(but\s+is|actually|should\s+be)\s+(a\s+)?(trial|PTPH|sentence|plea)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHS-01-FIVE-PART-FINDING",
    findingCode: "CHS_FIVE_PART_INCOMPLETE",
    handlerId: "five_part_incomplete",
    engineId: "chase_actionability",
    candidateClass: "candidate_defect",
    plainEnglish: "Chase finding missing required five-part structure cues.",
    match: (t, ref) =>
      ref.includes("chaseItems") &&
      /\b(chase|request|obtain)\b/i.test(t) &&
      !/\b(what|why|from\s+whom|by\s+when|if\s+not)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHS-03-PROVENANCE-LINK",
    findingCode: "CHS_PROVENANCE_UNLINKED",
    handlerId: "chase_provenance_unlinked",
    engineId: "chase_actionability",
    candidateClass: "unresolved",
    plainEnglish: "Chase item without provenance link cue.",
    match: (t, ref) =>
      (ref.includes("chaseItems") || /\bchase\b/i.test(t)) &&
      /\b(please\s+request|request\s+disclosure)\b/i.test(t) &&
      !/\b(MG\d+|exhibit|source|per\s+list|anchor)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHS-04-EVIDENTIAL-VS-PROCEDURAL",
    findingCode: "CHS_EVIDENTIAL_PROCEDURAL_COLLAPSE",
    handlerId: "evidential_procedural_collapse",
    engineId: "chase_actionability",
    candidateClass: "candidate_defect",
    plainEnglish: "Evidential chase collapsed into procedural-only ask.",
    match: (t) =>
      /\b(evidential|evidence\s+chase)\b/i.test(t) &&
      /\b(admin\s+only|procedural\s+only|listing\s+update)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHS-05-NO-TEMPLATE-ONLY",
    findingCode: "CHS_TEMPLATE_ONLY",
    handlerId: "chase_template_only",
    engineId: "chase_actionability",
    candidateClass: "candidate_defect",
    plainEnglish: "Chase draft is template-only without case facts.",
    match: (t) =>
      /\b(insert\s+details|\[matter\]|\[defendant\]|TODO\s+chase)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHS-07-UPDATE-ON-SERVICE-CHANGE",
    findingCode: "CHS_STALE_AFTER_SERVICE_CHANGE",
    handlerId: "chase_stale_after_service",
    engineId: "chase_actionability",
    candidateClass: "candidate_defect",
    plainEnglish: "Chase not updated after service-state change cue.",
    match: (t) =>
      /\b(now\s+served|service\s+complete)\b/i.test(t) &&
      /\b(still\s+chase|continue\s+to\s+request|outstanding\s+chase)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHS-08-DISCLOSE-EXCLUDED",
    findingCode: "CHS_EXCLUDED_NOT_DISCLOSED",
    handlerId: "excluded_not_disclosed",
    engineId: "chase_actionability",
    candidateClass: "candidate_defect",
    plainEnglish: "Excluded material not disclosed in chase/warnings.",
    match: (t) =>
      /\b(excluded|withheld)\b/i.test(t) &&
      /\b(do\s+not\s+mention|omit\s+from\s+chase)\b/i.test(t),
  },
  {
    controlId: "MAA2-CHS-09-CPS-PROFESSIONAL-LANGUAGE",
    findingCode: "CHS_UNPROFESSIONAL_CPS_LANGUAGE",
    handlerId: "unprofessional_cps_language",
    engineId: "chase_actionability",
    candidateClass: "candidate_defect",
    plainEnglish: "Chase to CPS uses unprofessional/hostile language.",
    match: (t) =>
      /\bCPS\b/i.test(t) &&
      /\b(incompetent|ridiculous|waste\s+of\s+time|obviously\s+wrong)\b/i.test(t),
  },
  {
    controlId: "MAA2-WRD-01-GRAMMAR-SENTENCES",
    findingCode: "WRD_BROKEN_SENTENCE",
    handlerId: "broken_sentence",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Broken/incomplete solicitor-visible sentence.",
    match: (t) => /\b(the\s+the|is\s+is)\b/i.test(t) || /\bINCOMPLETE_SENTENCE_FRAGMENT\b/.test(t),
  },
  {
    controlId: "MAA2-WRD-03-COMPLETE-DISCLAIMERS",
    findingCode: "WRD_DISCLAIMER_INCOMPLETE",
    handlerId: "disclaimer_incomplete",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Disclaimer truncated/incomplete.",
    match: (t) =>
      /\b(solicitor\s+review\s+required|not\s+for\s+external)\b/i.test(t) &&
      /\b(…|\.\.\.|truncated|TBC)\s*$/i.test(t.trim()),
  },
  {
    controlId: "MAA2-WRD-05-TEMPLATE-JOINS",
    findingCode: "WRD_TEMPLATE_JOIN_ARTIFACT",
    handlerId: "template_join_artifact",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Template join artefact in solicitor-visible wording.",
    match: (t) => /\{\{|\[\[|<%|%>|\$\{/.test(t),
  },
  {
    controlId: "MAA2-WRD-06-SPACES-PUNCTUATION",
    findingCode: "WRD_SPACE_PUNCT_CORRUPT",
    handlerId: "space_punct_corrupt",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Spacing/punctuation corruption.",
    match: (t) => /\w{3,}\.\w{3,}/.test(t) && /\b(Mr|Dr|etc)\./i.test(t) === false && /\b[a-z]{2,}\.[A-Z]/.test(t),
  },
  {
    controlId: "MAA2-WRD-07-LISTS-PIPE-FRAGMENTS",
    findingCode: "WRD_PIPE_LIST_FRAGMENT",
    handlerId: "pipe_list_fragment",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Pipe-list fragment leaked into prose.",
    match: (t) => /\|/.test(t) && /\b(served|missing|referred)\b/i.test(t) && t.split("|").length >= 3,
  },
  {
    controlId: "MAA2-WRD-08-CAPITALISATION",
    findingCode: "WRD_HOSTILE_CAPS",
    handlerId: "hostile_caps",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Hostile/shouting capitalisation in solicitor-visible text.",
    match: (t) => /\b[A-Z]{6,}\b/.test(t) && /\b(GUILTY|LIAR|OBVIOUSLY|MUST\s+CONVICT)\b/.test(t),
  },
  {
    controlId: "MAA2-WRD-09-PROTECTED-ACRONYMS",
    findingCode: "WRD_PROTECTED_ACRONYM_CORRUPT",
    handlerId: "protected_acronym_corrupt",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Protected legal acronym corrupted.",
    match: (t) => /\b(mG11|Mg5|cCtv|Cps\b|BwV)\b/.test(t),
  },
  {
    controlId: "MAA2-WRD-13-WARNINGS-WITH-ACTIONS",
    findingCode: "WRD_WARNING_WITHOUT_ACTION",
    handlerId: "warning_without_action",
    engineId: "professional_wording",
    candidateClass: "unresolved",
    plainEnglish: "Warning without accompanying action cue.",
    match: (t) =>
      /\bunsafe\s+risk\b/i.test(t) &&
      /\bdo\s+not\s+state\b/i.test(t) &&
      !/\b(instead|obtain|chase|confirm|qualify)\b/i.test(t),
  },
  {
    controlId: "MAA2-WRD-14-NO-EXCESS-DISCLAIMERS",
    findingCode: "WRD_EXCESS_DISCLAIMERS",
    handlerId: "excess_disclaimers",
    engineId: "professional_wording",
    candidateClass: "candidate_defect",
    plainEnglish: "Excess stacked disclaimers obscuring substance.",
    match: (t) =>
      ((t.match(/\b(disclaimer|not\s+legal\s+advice|solicitor\s+review\s+required)\b/gi) ?? [])
        .length >= 3),
  },
  {
    controlId: "MAA2-AUD-01-SOLICITOR-COMPLETE",
    findingCode: "AUD_SOLICITOR_SURFACE_INCOMPLETE",
    handlerId: "solicitor_incomplete",
    engineId: "audience_context",
    candidateClass: "unresolved",
    plainEnglish: "Solicitor-facing surface marked incomplete.",
    match: (t) =>
      /\b(solicitor)\b/i.test(t) &&
      /\b(incomplete\s+for\s+solicitor|solicitor\s+view\s+incomplete)\b/i.test(t),
  },
  {
    controlId: "MAA2-XEX-03-ATTRIBUTION-LIMIT-ATTACHED",
    findingCode: "XEX_ATTRIBUTION_LIMIT_DETACHED",
    handlerId: "attribution_limit_detached",
    engineId: "cross_output_completeness",
    candidateClass: "candidate_defect",
    plainEnglish: "Attribution limitation not attached to the attributed claim.",
    match: (t) =>
      /\b(attribution\s+limited|source\s+limited)\b/i.test(t) &&
      /\b(see\s+elsewhere|generally|overall)\b/i.test(t) &&
      !/\b(attached\s+to|for\s+this\s+(claim|row|exhibit))\b/i.test(t),
  },
  {
    controlId: "MAA2-XEX-05-INFERRED-DATE-QUALIFIED",
    findingCode: "XEX_INFERRED_DATE_UNQUALIFIED",
    handlerId: "inferred_date_unqualified",
    engineId: "cross_output_completeness",
    candidateClass: "candidate_defect",
    plainEnglish: "Inferred date presented without qualification.",
    match: (t) =>
      /\binferred\s+date\b/i.test(t) &&
      !/\b(estimated|approximate|not\s+confirmed|qualified\s+as)\b/i.test(t),
  },
  {
    controlId: "MAA2-PRI-02-NO-PRIORITY-BURIAL",
    findingCode: "PRI_PRIORITY_BURIED",
    handlerId: "priority_buried",
    engineId: "cross_output_completeness",
    candidateClass: "candidate_defect",
    plainEnglish: "Priority item buried under lower-priority prose.",
    match: (t) =>
      /\b(critical|priority|urgent)\b/i.test(t) &&
      /\b(buried|footer\s+only|see\s+end)\b/i.test(t),
  },
  {
    controlId: "MAA2-PRI-03-PRIORITY-CHECKLIST",
    findingCode: "PRI_CHECKLIST_MISSING",
    handlerId: "priority_checklist_missing",
    engineId: "cross_output_completeness",
    candidateClass: "unresolved",
    plainEnglish: "Priority checklist referenced but absent.",
    match: (t) =>
      /\bpriority\s+checklist\b/i.test(t) &&
      /\b(missing|absent|not\s+generated)\b/i.test(t),
  },
  {
    controlId: "MAA2-CTX-01-CLASSIFY-CONTRADICTIONS",
    findingCode: "CTX_CONTRADICTION_UNCLASSIFIED",
    handlerId: "contradiction_unclassified",
    engineId: "contradiction_perspective",
    candidateClass: "unresolved",
    plainEnglish: "Contradiction noted without classification.",
    match: (t) =>
      /\b(contradict|inconsisten)\w*\b/i.test(t) &&
      !/\b(material|immaterial|timing|identity|service)\s+contradiction\b/i.test(t) &&
      !/\bclassified\s+as\b/i.test(t),
  },
  {
    controlId: "MAA2-CTX-02-RANK-HIGH-OVER-LOW",
    findingCode: "CTX_LOW_OVER_HIGH",
    handlerId: "low_over_high",
    engineId: "contradiction_perspective",
    candidateClass: "candidate_defect",
    plainEnglish: "Low-rank contradiction elevated over high-rank material issue.",
    match: (t) =>
      /\b(minor|immaterial)\s+contradiction\b/i.test(t) &&
      /\b(overrides|instead\s+of|more\s+important\s+than)\b/i.test(t) &&
      /\b(material|identity|service)\b/i.test(t),
  },
  {
    controlId: "MAA2-DEF-02-NO-CONCLUSION-PRESENTATION",
    findingCode: "DEF_CONCLUSION_AS_PRESENTATION",
    handlerId: "conclusion_as_presentation",
    engineId: "contradiction_perspective",
    candidateClass: "candidate_defect",
    plainEnglish: "Defence conclusion presented as neutral presentation.",
    match: (t) =>
      /\b(defence\s+conclusion|we\s+conclude\s+innocent)\b/i.test(t) &&
      /\b(neutral\s+summary|objective\s+presentation)\b/i.test(t),
  },
];

export function evaluateBatch3Wording(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  for (const w of includedWordingLeaves(ctx.leaves)) {
    for (const rule of WORDING_RULES) {
      if (!rule.match(w.text, w.ref)) continue;
      hits.push(
        hit({
          engineId: rule.engineId,
          handlerId: rule.handlerId,
          controlId: rule.controlId,
          findingCode: rule.findingCode,
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: rule.candidateClass,
          plainEnglish: rule.plainEnglish,
          evidenceRefs: [w.ref],
        }),
      );
    }
  }
  return hits;
}

/** Structured evidenceStates / fiveAnswers rules. */
export function evaluateBatch3Structured(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const states = arr(ctx.output.evidenceStates);
  const five = arr(ctx.output.fiveAnswersEvidenceRows);

  // BND-01: inventory collapse — evidence rows claim "complete inventory" while any missing
  for (let i = 0; i < states.length; i++) {
    const label = str(states[i].label);
    const exist = str(states[i].existenceLabel ?? states[i].inferredSourceState);
    const note = str(states[i].note ?? states[i].evidenceAnchor);
    const blob = `${label} ${exist} ${note}`;
    if (/\bcomplete\s+(source\s+)?(doc(ument)?\s+)?inventory\b/i.test(blob) && /\b(missing|absent)\b/i.test(blob)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "source_doc_inventory_collapse",
          controlId: "MAA2-BND-01-SOURCE-DOC-INVENTORY",
          findingCode: "BND_INVENTORY_COLLAPSE",
          occurrenceRef: `/evidenceStates/${i}`,
          exactWording: blob,
          candidateClass: "candidate_defect",
          plainEnglish: "Complete inventory claimed while missing items present.",
          evidenceRefs: [`/evidenceStates/${i}`],
        }),
      );
    }
    // EVS-04 reason taxonomy — unknown/unclear without classified reason token
    if (
      /\b(unknown|unclear)\b/i.test(exist) &&
      (/\bunknown\s+reason\b/i.test(blob) ||
        /\breason\s*:\s*unknown\b/i.test(blob) ||
        (!/\b(because|pending|awaiting|not\s+served|referred|taxonomy)\b/i.test(blob) &&
          /\bstate\s+unknown\b/i.test(blob)))
    ) {
      hits.push(
        hit({
          engineId: "evidence_attribution",
          handlerId: "reason_taxonomy_missing",
          controlId: "MAA2-EVS-04-REASON-TAXONOMY",
          findingCode: "EVS_REASON_TAXONOMY_MISSING",
          occurrenceRef: `/evidenceStates/${i}`,
          exactWording: blob,
          candidateClass: "unresolved",
          plainEnglish: "Unknown state without taxonomy reason.",
          evidenceRefs: [`/evidenceStates/${i}`],
        }),
      );
    }
  }

  // CHS-01 also: empty copySuggestion on chase while label present
  const gaps = (ctx.output.warningsAndGaps ?? {}) as Record<string, unknown>;
  const chase = arr(gaps.chaseItems);
  for (let i = 0; i < chase.length; i++) {
    const label = str(chase[i].label);
    const copy = str(chase[i].copySuggestion);
    if (label && !copy.trim()) {
      hits.push(
        hit({
          engineId: "chase_actionability",
          handlerId: "five_part_incomplete",
          controlId: "MAA2-CHS-01-FIVE-PART-FINDING",
          findingCode: "CHS_FIVE_PART_INCOMPLETE",
          occurrenceRef: `/warningsAndGaps/chaseItems/${i}`,
          exactWording: label,
          candidateClass: "candidate_defect",
          plainEnglish: "Chase item label present with empty copySuggestion.",
          evidenceRefs: [`/warningsAndGaps/chaseItems/${i}`],
        }),
      );
    }
  }

  // fiveAnswers: BND-01 inventory on five rows
  for (let i = 0; i < five.length; i++) {
    const blob = `${str(five[i].label)} ${str(five[i].note)} ${str(five[i].existence)}`;
    if (/\bcomplete\s+inventory\b/i.test(blob) && /\bmissing\b/i.test(blob)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "source_doc_inventory_collapse",
          controlId: "MAA2-BND-01-SOURCE-DOC-INVENTORY",
          findingCode: "BND_INVENTORY_COLLAPSE",
          occurrenceRef: `/fiveAnswersEvidenceRows/${i}`,
          exactWording: blob,
          candidateClass: "candidate_defect",
          plainEnglish: "Complete inventory claimed while missing items present.",
          evidenceRefs: [`/fiveAnswersEvidenceRows/${i}`],
        }),
      );
    }
  }

  return hits;
}

export function evaluateAllBatch3(ctx: Stage150EvalContext): Stage150Hit[] {
  return [...evaluateBatch3Wording(ctx), ...evaluateBatch3Structured(ctx)];
}

/** Finding codes registered for Batch-3 (for registry generation). */
export const BATCH3_FINDING_BY_CONTROL: Record<
  string,
  { findingCode: string; handlerId: string; engineId: SharedEngineId }
> = Object.fromEntries(
  [
    ...WORDING_RULES.map(
      (r) =>
        [
          r.controlId,
          { findingCode: r.findingCode, handlerId: r.handlerId, engineId: r.engineId },
        ] as const,
    ),
    [
      "MAA2-BND-01-SOURCE-DOC-INVENTORY",
      {
        findingCode: "BND_INVENTORY_COLLAPSE",
        handlerId: "source_doc_inventory_collapse",
        engineId: "document_relationship" as SharedEngineId,
      },
    ] as const,
    [
      "MAA2-EVS-04-REASON-TAXONOMY",
      {
        findingCode: "EVS_REASON_TAXONOMY_MISSING",
        handlerId: "reason_taxonomy_missing",
        engineId: "evidence_attribution" as SharedEngineId,
      },
    ] as const,
  ],
);
