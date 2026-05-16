/**
 * Bulk eval / Golden sweep UI scoring — honest Pass vs Weak vs Fail for DefencePlanBox.
 * Heuristic only (no bundle text on client); does not change server answer generation.
 * Final quality and blocking issue are derived together via {@link computeBulkEvalRowPresent}
 * so weak/fail rows always carry a non-empty issue; optional advisory hints never force weak alone.
 * “Collapse” weak rows align with {@link semanticCollapseByQuestion} for the semantic label; other
 * repeat heuristics use distinct issue strings and {@link BulkEvalPresentOutcome.collapse_rule}.
 */

import { fingerprintAnswer, semanticCollapseByQuestion, type EvalMetaV1 } from "@/lib/eval-observability";
import { isEvalWeakAnswer, TIMEOUT_OR_ABORT_ANSWER_RE } from "@/lib/eval-run-metadata";
import {
  GOLDEN_FALLBACK_ROUTE_TAGS,
  GOLDEN_STRICT_EXPECTED_ROUTE,
  isAcceptedStrictRoute,
  isSuspiciouslyShortAnswer,
} from "@/lib/eval-sweep-review";

export type BulkEvalRunRowInput = {
  caseId: string;
  questionNo: number;
  answer: string;
  error?: string;
  ok: boolean;
  http_status: number;
  weak: boolean;
  route_tag: string | null;
  eval_meta?: EvalMetaV1 | null;
};

export type EvalRunLabel = "ok" | "timeout" | "error" | "skipped";

export type EvalQualityLabel = "pass" | "weak" | "fail" | "timeout" | "error";

const OFFENCE_OR_CASE_MARKERS =
  /\b(robbery|burglary|dwell|theft|snatch|assault|ABH|GBH|wound|battery|fraud|weapon|blade|knife|driv|drug|supply|possess|affray|damage|criminal damage|public order|handling|perverting|kidnap|rape|coercive|stalk|harass|manslaughter|murder|s\.?\s*47|s\.?\s*20|s\.?\s*18|pwits|grievous|bodily|harm)\b/i;

/** Charge / statutory shape (Q1 “offence wording” beyond a single generic token). */
const CHARGE_OR_PARTICULARS_RE =
  /\b(contrary\s+to|contrary\s+to\s+section|section\s*\d+|s\.?\s*\d+\s*of\s*the|count\s*\d|on\s+the\s+\d{1,2}(st|nd|rd|th)?\s+day\s+of|particulars|statement\s+of\s+offence|indictment|charge\s+sheet)\b/i;

/**
 * Temporal preamble shape commonly used on real charge sheets / particulars.
 *
 *   "On 14/05/2024 at 22:30 …"           — numeric date, optional `at` time
 *   "On 14 May 2024 …"                   — month-name date
 *   "Between 01/01/2024 and 31/01/2024 …" / "Between January and March …"
 *   "During / Throughout … 2024 …"
 *   "Some time in/on/between/during …"
 *
 * No trailing `at` required — a charge that opens "On 14 May 2024 dishonestly received
 * stolen electronic property…" is still real charge wording.
 */
const CHARGE_TEMPORAL_PREAMBLE_RE =
  /\b(?:On\s+\d{1,2}(?:st|nd|rd|th)?(?:[\s\/.\-]\d{1,2}[\s\/.\-]\d{2,4}|\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})|Between\s+[^\n,]{2,}\s+(?:and|to)\s+[^\n]{2,}|During\s+[^\n]{3,}|Throughout\s+[^\n]{3,}|Some\s+time\s+(?:in|on|between|during)\s+[^\n]{3,})\b/i;

/**
 * Conduct / property / person wording typically printed in particulars when the
 * statutory offence label is omitted. Covers communications, dishonesty/fraud,
 * burglary, driving, drugs, and the standard violence/property verbs.
 */
const CONDUCT_PROPERTY_PERSON_RE =
  /\b(sent\s+(?:electronic|grossly\s+offensive|menacing|indecent|threatening|harass(?:ing)?|malicious)\s+(?:messages?|communications?)|electronic\s+messages?|grossly\s+offensive\s+(?:messages?|communications?)|menacing\s+(?:messages?|communications?)|indecent\s+(?:images?|photographs?|videos?)|dishonestly\s+(?:received|retained|appropriated|obtained|made\s+off|used|withheld|converted|handled)|by\s+deception|made\s+a\s+false\s+representation|entered\s+(?:a\s+dwelling|premises|[a-z\s]+)\s+(?:as\s+a\s+trespasser|with\s+intent)|aggravated\s+burglary|stole(?:n)?|stealing|robbed|drove\s+(?:a\s+(?:motor\s+)?vehicle|whilst|while|without)|drove\s+(?:whilst|while)\s+(?:disqualified|over|having\s+consumed|unfit)|drove\s+(?:dangerously|carelessly|without\s+insurance|without\s+a\s+licence|without\s+due\s+care)|possession\s+of\s+(?:a\s+(?:bladed|controlled|class\s+[A-C]))|in\s+possession\s+of\s+(?:a\s+(?:bladed|controlled|class\s+[A-C]))|possessing\s+(?:a\s+controlled|class\s+[A-C]|with\s+intent\s+to\s+supply)|supplying\s+(?:a\s+controlled|class\s+[A-C])|assault(?:ed|ing)?\s+(?:[A-Z][a-z]+|a\s+constable|an?\s+officer|a\s+police|her|him|them|the\s+complainant)|caused\s+(?:actual|grievous)\s+bodily\s+harm|inflict(?:ed|ing)\s+(?:grievous|actual)\s+bodily\s+harm|punched|kicked|struck|threatened|coerced|controlled|stalked|harassed|damaged\s+(?:property|a\s+window|a\s+vehicle|a\s+door))\b/i;

/**
 * Broad Q1 charge-particulars conduct/phrase set. Used by the Q1 "printed
 * allegation" scoring rescue so terse but unambiguous charge particulars
 * ("On 24/06/2026 stole electronic property…", "On 01/07/2026 had with him
 * in public a sharply pointed article without good reason.") are not marked
 * weak just because the statutory label is omitted or the sentence is short.
 *
 * Deliberately keeps single-word verbs (`stole`, `robbed`) for the bare
 * "On <date> <verb>…" shape, plus multi-word indictment phrases
 * (`pursued (a) course of conduct`, `had with him/her/them`, `by deception`).
 */
const Q1_CHARGE_CONDUCT_RE =
  /\b(?:stole|stolen|stealing|robbed|robbing|appropriated|withheld|converted|handled|dishonestly|obtained|obtaining|defrauded|deceived|impersonated|forged|altered|by\s+(?:false\s+representation|deception)|made\s+(?:a\s+)?(?:false|fraudulent|threatening|menacing|grossly\s+offensive|indecent|sexual)|received|retained|assault(?:ed|ing)?|attack(?:ed|ing)?|punched|kicked|struck|wounded|inflict(?:ed|ing)|caused\s+(?:actual|grievous|bodily)|threatened|coerced|controlled|stalked|stalking|harassed|harassment|pursued\s+(?:a\s+)?course\s+of\s+conduct|course\s+of\s+conduct|damaged|destroy(?:ed|ing)?|defaced|vandalised|vandalized|set\s+fire(?:\s+to)?|burnt|burned|punctured|possess(?:ed|ing)?|in\s+possession|had\s+with\s+(?:him|her|them)|carried|carrying|drove|driving|supplied|distributed|sent|entered|trespass(?:ed|ing)?|broke\s+into|forced\s+entry|burgled|used\s+threatening|used\s+violence)\b/i;

/**
 * Wording that disqualifies an answer from being treated as printed allegation
 * particulars (strategy / friction / MG6 weakness / defence stance / generic
 * legal commentary). Q1 must read like a charge sheet line, not a brief.
 */
const Q1_NON_ALLEGATION_NOISE_RE =
  /\b(?:grounds\s+for\s+dispute|primary\s+eval\s+hook|MG6\s+weakness|defence\s+strategy|strategy\s+focus|friction\s*\(fiction\)|client\s+strategy|tactical\s+focus|risk\s+register|pressure\s+map|recorded\s+defence|defence\s+stance|defence\s+position|disputed\s+facts|interview\s+account|interview\s+summary|in\s+broad\s+terms|generally\s+speaking|typically\s+the|the\s+(?:crown|prosecution)\s+must\s+prove\s+each|elements\s+of\s+the\s+offence\s+include|beyond\s+(?:a\s+)?reasonable\s+doubt|burden\s+of\s+proof|criminal\s+standard|prima\s+facie)\b/i;

/**
 * True if `text` reads like printed allegation / charge particulars:
 *   1. Starts (after an optional Charge: / Particulars: / Statement of offence: /
 *      Indictment: / Count N: / Allegation: heading) with a temporal preamble.
 *   2. Contains at least one charge-style conduct word/phrase.
 *   3. Does not contain strategy / friction / MG6 / generic legal commentary
 *      wording.
 *
 * Scoped to Q1 strict_primary_allegation rows via the caller; never used for
 * other questions.
 */
function looksLikePrintedQ1Allegation(text: string): boolean {
  const t = (text ?? "").trim();
  if (t.length < 25) return false;
  if (Q1_NON_ALLEGATION_NOISE_RE.test(t)) return false;

  const head = t.slice(0, 320);
  const headHasPreamble =
    /(?:^|\n)\s*(?:[-*•>]\s*)?(?:(?:Charge|Particulars(?:\s+of\s+offence)?|Statement\s+of\s+offence|Indictment|Count\s*\d[^:]{0,24}|Allegation)\s*[:\-]?\s*)?(?:On|Between|During|Throughout|Some\s+time\s+(?:in|on|between|during))\b/i.test(
      head
    );
  if (!headHasPreamble) return false;

  return Q1_CHARGE_CONDUCT_RE.test(t);
}

/** Exhibit / disclosure / procedural anchors (PART D). Source duplicated so tests don’t share `/g` lastIndex. */
const CASE_ANCHOR_PATTERN =
  "EX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+|NS-CPS-\\d{4}-\\d{4}|CB-(?:TRAP|GOLD|TEST)-\\d{4}-\\d{4}|CB-[A-Z][A-Z0-9]{1,15}-\\d{4}-\\d{3,4}|\\bMG\\s*\\d+\\b|\\bCAD\\b|\\b999\\b|\\bCCTV\\b|\\bBWV\\b|\\bPACE\\b|interview|witness|continuity|disclosure schedule|served|outstanding|awaited|partial extract|count\\s*\\d|indictment|charge sheet|next listing|next hearing|procedural step|current\\s+stage|\\bPTPH\\b|sending\\s+hearing|plea\\s+hearing|first\\s+appearance|trial\\s+(?:date|listed|fixed|fix)|appropriate\\s+adult|intermediary|special\\s+measures|fitness\\s+to\\s+(?:plead|stand)|ABE\\s+interview|achieving\\s+best\\s+evidence|file[- ]named\\s+safeguard|file\\s+tension|named\\s+conflict|named\\s+tension|stage\\s+conflict|date\\s+mismatch|offence\\s+label\\s+mismatch";
const CASE_ANCHOR_RE_ANY = new RegExp(`(?:${CASE_ANCHOR_PATTERN})`, "i");

/**
 * Strict file-unique anchor: identifies tokens that are case-unique by
 * construction OR explicitly file-named markers that builders only emit when
 * the file publishes the line verbatim:
 *   - CB-X-YYYY-NNNN, NS-CPS ref, exhibit code with digits.
 *   - charge temporal preamble + conduct (Q1 printed allegation shape).
 *   - "File-named safeguard:" / "Further file-named safeguard:" prefix
 *     (Pack F vulnerability/safeguard lines, verbatim file wording).
 *   - explicit stage / next-listing prefix.
 *   - explicit document-type / heading / source variation markers
 *     (Pack J document-variation lines, only emitted from file wording).
 *   - explicit named conflict/tension/mismatch markers (Packs F/G/H/J Q6
 *     conflict lines, only emitted from file wording).
 *   - explicit missing-material markers: builder-emitted prefixes
 *     ("Missing material:" / "Missing material on the file" / "Interview
 *     wording missing on the file:" / "Defence-side material gap:") AND
 *     verbatim file-named missing-material lines (MG5/MG6/MG11 missing,
 *     interview record missing, CCTV/CAD/999 not served, thin bundle,
 *     partial extract, client account limited).
 *
 * Used to rescue semantic-fingerprint / same-answer-different-route collapses
 * where the answer demonstrably carries a file-unique anchor — the scorer
 * otherwise treats those as flat collapses.
 *
 * Generic anchors (MG6 / CCTV / served / outstanding alone) do NOT trigger
 * the rescue; only the specific named-line markers above do.
 */
const STRICT_UNIQUE_ANCHOR_RE = new RegExp(
  [
    // Case-unique by construction.
    "EX-[A-Z][A-Z0-9]+-\\d{2,}",
    "EX-K-[A-Z0-9]+(?:-[A-Z0-9]+)*(?:-\\d{2,})?",
    "EX-M-[A-Z0-9]+(?:-[A-Z0-9]+)*(?:-\\d{2,})?",
    "NS-CPS-\\d{4}-\\d{4}",
    "CB-[A-Z][A-Z0-9]{1,15}-\\d{4}-\\d{3,4}",
    // Additional Northshire-style case-file tokens (case-specific by file
    // convention — interview record refs, custody/chain refs, classic
    // CPS-style NS/YYYY/NNNNN refs). Used by the Pack G / Pack H Q8 builder
    // when CB-* / EX-* are not present on the bundle. Each pattern requires
    // structural markers + digit groups so plain "001" never matches.
    "NS-IR-\\d{4}-\\d{4}-\\d{3,6}",
    "NS-CR-\\d{4}-\\d{4}(?:-\\d{3,6})?",
    "CR-FP-\\d{3,6}",
    "CR-CHAIN-\\d{3,6}",
    "NS\\/\\d{4}\\/\\d{4,6}",
    // Builder-emitted file-named safeguard prefix (Pack F).
    "(?:Further\\s+)?[Ff]ile[\\s-]?named\\s+safeguard(?:\\s*/\\s*vulnerability)?\\s*:",
    // Builder-emitted stage / next-listing prefix.
    "Stage\\s*/\\s*next\\s+listing\\s*:",
    // Pack J document-type / source variation lines (file wording).
    "Document\\s+heading\\s+mismatch",
    "Mixed\\s+document\\s+type",
    "Missing\\s+(?:page|section|index)",
    "Unclear\\s+source\\s+document",
    "Exhibit\\s+(?:label|source)\\s+(?:issue|conflict|mismatch)",
    "Document\\s+(?:type|format)\\s+(?:mismatch|variation)",
    // Named conflict / tension / mismatch lines (file wording).
    "MG5\\s*/\\s*MG6\\s+mismatch",
    "Date\\s+mismatch",
    "Offence\\s+label\\s+mismatch",
    "Stage\\s+conflict",
    "Procedural\\s+conflict",
    "Route\\s+conflict",
    "Safeguard\\s+(?:conflict|tension|procedure\\s+conflict)",
    "Procedure\\s+(?:conflict|tension|mismatch)",
    "Interview\\s+conflict",
    "Continuity\\s+(?:broken|mismatch|error)",
    "Redaction\\s+(?:inconsistency|conflict|error|mismatch)",
    // Builder-emitted explicit missing-material prefixes (Packs F Q3 / Q4 /
    // Q9). Only emitted when the file publishes the missing-material line.
    "Missing\\s+material(?:\\s+on\\s+the\\s+file)?\\s*[—:]",
    "Missing\\s+material\\s+\\(file\\s+wording\\)\\s*:",
    "Interview\\s+wording\\s+missing\\s+on\\s+the\\s+file\\s*:",
    "Defence[-\\s]?side\\s+material\\s+gap(?:\\s+on\\s+the\\s+file)?\\s*[—:]",
    // Pack F Q4 belt-and-braces CB-ref tag emitted by the strict-interview
    // augmentation when no safeguard/interview-missing line is published.
    "\\[Case\\s+CB-[A-Z][A-Z0-9]{1,15}-\\d{4}-\\d{3,4}\\]",
    // Pack F Q4 ultra-narrow replacement (empty strict-interview fallback).
    // Only emitted alongside a verbatim CB-* reference and a file-published
    // interview-position line (or an honest "no interview record served"
    // marker). Pairs with CB-* / NS-CPS for rescue.
    "File\\s+reference\\s*:\\s*(?:CB-(?!GOLD\\b|TRAP\\b|TEST\\b)[A-Z][A-Z0-9]{1,15}-\\d{4}-\\d{3,4}|NS-CPS-\\d{4}-\\d{4}|EX-[A-Z][A-Z0-9]+-\\d{2,})",
    "Interview\\s+position\\s+on\\s+the\\s+file\\s+is",
    "Interview\\s+position\\s+on\\s+the\\s+file\\s*:",
    "Interview/custody\\s+wording\\s+on\\s+this\\s+file\\s*[—:]",
    "Source\\s+discipline\\s*[—:]",
    "Stance\\s+markers\\s+on\\s+file\\s*:",
    "Exhibit\\s+code\\(s\\)\\s+referenced\\s+on\\s+file\\s*:",
    "Further\\s+interview\\s+wording\\s*:",
    // Pack F Q9 thin-bundle safety-net marker (file does not publish a
    // separate defence-weakness section; weakness framed as the inability to
    // overcommit on a thin file). Both the legacy ("inability to
    // overcommit") and new ("unsafe overcommitment") wordings.
    "Defence-side\\s+weakness\\s+is\\s+the\\s+inability\\s+to\\s+overcommit",
    "defence\\s+weakness\\s+is\\s+unsafe\\s+overcommitment",
    // Pack G / Pack H Q8 builder markers (only emitted when the file
    // publishes the chaos / conditional anchor or alongside a CB-* ref).
    "Crown\\s+weakness\\s+on\\s+this\\s+file\\s+is\\s+(?:an?\\s+)?(?:evidence-handling\\s+tension|document-type|source-anchor)",
    "on\\s+the\\s+file\\s+wording,\\s+this\\s+would\\s+put\\s+pressure\\s+on\\s+the\\s+Crown\\s+route\\s+if\\s+proved",
    "Crown\\s+proof\\s+would\\s+come\\s+under\\s+conditional\\s+pressure\\s+on\\s+the\\s+file\\s+wording",
    "Pressure\\s+runs\\s+against\\s+continuity\\s*/\\s*order",
    // Pack G chaos / conflict wording (only fires when the file publishes
    // these specific labelled phrasings — not generic "conflict" mentions).
    "MG\\s*5\\s*/\\s*MG\\s*6\\s+mismatch",
    "MG\\s*6\\s*/\\s*MG\\s*5\\s+mismatch",
    "Witness\\s+(?:conflict|mismatch|contradiction)",
    "Unclear\\s+(?:source|exhibit)\\s+(?:label|reference|document)",
    "Inconsistent\\s+(?:statement|exhibit|evidence|log|entry)",
    "Source\\s+conflict",
    "Duplicate\\s+(?:page|exhibit|entry|log)",
    "Out\\s+of\\s+(?:sequence|order)",
    // Pack H pressure / route labels — only the file-printed colon-labelled
    // forms (covered above by "Pressure point:", "Crown pressure:", etc.)
    // and the named route-pressure phrasings count. "would put pressure on"
    // / "if proved" / "would weaken" by themselves are deliberately NOT
    // listed: they are common LLM boilerplate and the scorer must keep
    // those weak. The Q8 builder emits CB-* and the labelled "Crown
    // weakness on this file is" / "on the file wording, this would put
    // pressure on the Crown route if proved" — those already rescue via
    // CB-* + the builder phrasings above.
    "Prosecution\\s+route\\s+pressure",
    "Route\\s+pressure\\s+on\\s+the\\s+file",
    "Disclosure\\s+(?:gap|delay|outstanding)\\s+on\\s+the\\s+file",
    "Crown\\s+proof\\s+under\\s+pressure\\s+on\\s+the\\s+file",
    // Pack K messy-real-world structured-eval builders (verbatim file lines
    // only in Core; these markers pair with CB-* / EX-K-* in the answer).
    "the\\s+prosecution\\s+weakness\\s+is\\s+that\\s+the\\s+messy\\s+bundle\\s+leaves\\s+the\\s+Crown\\s+route\\s+dependent\\s+on",
    "missing/incomplete\\s+material\\s+is",
    "the\\s+live\\s+inconsistency/conflict\\s+is",
    "Duplicate\\s+MG\\s*6",
    "Low\\s*quality\\s+extract",
    "Partial\\s+exhibit\\s+list",
    "Pack\\s+K\\s+exhibit\\s+codes\\s+on\\s+file\\s*:",
    "EX-K\\s+exhibit\\s+codes\\s+on\\s+file\\s*:",
    // Pack M multi-defendant / multi-count builders (verbatim file lines in
    // Core/Evidence; these phrases only appear with the Pack M structured path).
    "the\\s+prosecution\\s+weakness\\s+is\\s+defendant/count\\s+attribution\\s*:",
    "missing/incomplete\\s+material\\s+is\\s+defendant/count-specific\\s*:",
    "File-published\\s+multi-defendant\\s*/\\s*count\\s+lines\\s*:",
    "Conflict\\s*/\\s*co-defendant\\s*/\\s*count\\s+lines\\s*:",
    "EX-M\\s+exhibit\\s+codes\\s+on\\s+file\\s*:",
    "Map\\s+each\\s+prosecution\\s+weakness\\s+to\\s+the\\s+correct\\s+defendant\\s+and\\s+count",
    "do\\s+not\\s+blend\\s+co-defendant\\s+evidence\\s+or\\s+count\\s+evidence",
    "Resolve\\s+that\\s+named\\s+conflict\\s+per\\s+defendant\\s+and\\s+per\\s+count\\s+before\\s+fixing\\s+trial\\s+theory",
    "do\\s+not\\s+infer\\s+extra\\s+contradictions\\s+or\\s+blend\\s+defendants",
    // Packs L / N / O / P / Q / R / S / T structured-eval builders (narrow
    // phrases only emitted from those pack-gated paths).
    "EX-(?:L|N|O|P|Q|R|S|T|U|V|W|X)-[A-Z0-9]+(?:-[A-Z0-9]+)*(?:-\\d{2,})?",
    "EX-[LNOPQRSTUVWX]\\s+exhibit\\s+codes\\s+on\\s+file\\s*:",
    "prosecution\\s+weakness\\s+is\\s+stage/procedure\\s+pressure\\s*:",
    "prosecution\\s+weakness\\s+is\\s+safeguard/procedure\\s+pressure\\s*:",
    "prosecution\\s+weakness\\s+is\\s+the\\s+file-published\\s+instruction\\s+conflict\\s*:",
    "prosecution\\s+weakness\\s+for\\s+solicitor\\s+output\\s+is\\s+the\\s+file-published\\s+unresolved\\s+evidence/disclosure\\s+caveat\\s*:",
    "conditional\\s+source-integrity\\s*/\\s*document-instruction\\s+contamination\\s+pressure",
    "missing/outstanding\\s+material\\s+and\\s+CPS/defence-pressure\\s+context",
    "no\\s+safe\\s+contradiction\\s+can\\s+be\\s+finalised\\s+on\\s+this\\s+thin\\s+file",
    "solicitor\\s+review\\s+readiness\\s+on\\s+the\\s+file\\s+is\\s+limited\\s+by",
    "missing/incomplete\\s+material\\s+and\\s+document-integrity\\s+context",
    // Pack U OCR/scanned eval builders (verbatim file lines in Evidence; phrases only from Pack U path).
    "Core\\s+allegation\\s*:",
    "Charge\\s*/\\s*visual-proof\\s+lines\\s*:",
    "Interview/client-account\\s+lines\\s*:",
    "Visual/source\\s+limitation\\s+lines\\s*:",
    "no\\s+reliable\\s+interview/client\\s+account\\s+wording",
    "interview/client\\s+account\\s+on\\s+the\\s+file\\s+is",
    "prosecution\\s+weakness\\s+is\\s+the\\s+visual/source\\s+limitation\\s*:",
    "defence\\s+weakness\\s+is\\s+unsafe\\s+overreliance\\s+on\\s+visual\\s+material",
    // Pack V leverage eval builders (verbatim file lines; Pack V path only).
    "Charge\\s*/\\s*proof\\s*/\\s*leverage\\s+lines\\s*:",
    "leverage\\s+point\\s+remains\\s+conditional\\s*:",
    "Charge\\s*/\\s*proof\\s+line\\s*:",
    "MG5\\s*/\\s*Crown\\s+version\\s+line\\s*:",
    "Leverage\\s+line\\s*:",
    "Further\\s+leverage\\s+line\\s*:",
    "Source/outstanding\\s+line\\s*:",
    "This\\s+may\\s+assist\\s+the\\s+Crown\\s+because",
    "This\\s+may\\s+assist\\s+the\\s+defence\\s+because",
    "This\\s+creates\\s+pressure\\s+if\\s+proved",
    "This\\s+is\\s+only\\s+useful\\s+if",
    "This\\s+point\\s+collapses\\s+if",
    "the\\s+live\\s+inconsistency\\s*/\\s*procedure\\s+tension\\s+on\\s+the\\s+file\\s+is",
    // Pack W timeline / sequence / alibi eval (verbatim file lines; Pack W path only).
    "Charge\\s*/\\s*proof\\s*/\\s*timing\\s+lines\\s*:",
    "Interview\\/client-account\\/timing\\s+lines\\s*:",
    "Timing-account\\/source\\s+lines\\s*:",
    "Timeline\\/source\\s+conflict\\s+lines\\s*:",
    "interview/client\\s+timing\\s+account\\s+on\\s+the\\s+file\\s+is",
    "timing\\s+sequence\\s+remains\\s+conditional\\s*:",
    "Timeline\\s+pressure\\s*:",
    "Key\\s+timing\\s+conflict\\s*:",
    "not\\s+a\\s+safe\\s+alibi\\s+unless",
    "source\\s+time\\s+may\\s+differ",
    "At\\s+the\\s+file-published\\s+stage\\s+\\(",
    "Stage\\s+/\\s+listing\\s+lines\\s*:",
    "Conflict\\s+/\\s+stage\\s+/\\s+proof-route\\s+lines\\s*:",
    "Thin\\s+/\\s+no-safe\\s+/\\s+missing\\s+lines\\s*:",
    "Missing\\s+/\\s+integrity\\s+lines\\s*:",
    "Missing\\s+/\\s+review\\s+caveat\\s+lines\\s*:",
    // Pack X hearing / court move / disclosure eval (verbatim file lines; Pack X path only).
    "Charge\\s*/\\s*proof\\s*/\\s*hearing\\s+lines\\s*:",
    "Hearing/disclosure/source\\s+lines\\s*:",
    "Defence/hearing\\s+risk\\s+lines\\s*:",
    "Interview/client/hearing-position\\s+lines\\s*:",
    "interview/client/hearing\\s+position\\s+on\\s+the\\s+file\\s+is",
    "the\\s+Crown\\s+must\\s+still\\s+prove\\s+the\\s+printed\\s+allegation",
    "hearing\\s+move\\s+remains\\s+conditional",
    "court[-\\s]?facing\\s+issue",
    "disclosure\\s+hearing\\s+move",
    "possible\\s+hearing\\s+move",
    "ask\\s+the\\s+court\\s+to\\s+record\\s+outstanding\\s+disclosure",
    "set\\s+a\\s+timetable",
    "preserve\\s+adjournment",
    "final\\s+advice\\s+depends\\s+on\\s+source\\s+material",
    "do\\s+not\\s+overstate",
    "prosecution\\s+weakness\\s+is\\s+the\\s+court/disclosure/source-material\\s+gap\\s*:",
    "prosecution\\s+weakness\\s+is\\s+provisional\\s+pressure\\s+caused\\s+by\\s+source/disclosure\\s+limits",
    "defence\\s+weakness\\s+is\\s+that\\s+the\\s+hearing/strategy\\s+position\\s+is\\s+provisional\\s*:",
    // Named pressure / weakness lines on a file (these are FILE-printed
    // labels, not generic builder boilerplate; only used when the file's
    // weakness or pressure block has been quoted verbatim).
    "Pressure\\s+point\\s*:",
    "Crown\\s+pressure\\s*:",
    "Strategy\\s+pressure\\s*:",
    "Disclosure\\s+pressure\\s*:",
    "Conditional\\s+pressure\\s*:",
    "Crown\\s+weakness\\s*:",
    "Prosecution\\s+weakness\\s*:",
    // Verbatim file-named interview lines (only fire when the file actually
    // contains the specific phrasings — not generic mentions of "interview").
    "Interview\\s+cannot\\s+be\\s+safely\\s+assessed",
    "Unsafe\\s+to\\s+assess\\s+interview",
    "Interview\\s+(?:delay|delayed|postponed|rearranged|rescheduled)",
    "Bundle\\s+(?:too\\s+thin|thin)\\s+(?:for|to\\s+assess)\\s+interview",
    // Verbatim file-named missing-material lines (only fire when the file
    // actually contains these specific phrasings — not generic "missing").
    "(?:Full\\s+)?MG\\s*5\\s+(?:missing|incomplete|partial|not\\s+served)",
    "MG\\s*6\\s+(?:missing|incomplete|partial|not\\s+served)",
    "MG\\s*11\\s+(?:missing|incomplete|partial|not\\s+served)",
    "Interview\\s+(?:record|summary|note)\\s+(?:missing|incomplete|partial|not\\s+yet\\s+(?:held|conducted|provided))",
    "PACE\\s+interview\\s+(?:missing|not\\s+yet\\s+(?:held|conducted)|incomplete)",
    "No[-\\s]?comment\\s+interview",
    "Limited\\s+disclosure\\s+interview",
    "Thin\\s+bundle",
    "Bundle\\s+(?:thin|limited|partial|incomplete|minimal|sparse)",
    "Partial\\s+extract",
    "Bundle\\s+discipline",
    "Client\\s+account\\s+limited",
    "Account\\s+limited\\s+by\\s+(?:missing|incomplete)",
    "CCTV\\s+(?:not\\s+(?:served|identified|recovered)|missing|unavailable)",
    "(?:CAD|999)\\s+(?:not\\s+(?:served|identified|recovered)|missing|unavailable)",
    "BWV\\s+(?:not\\s+(?:served|identified|recovered)|missing|unavailable)",
  ].join("|"),
  "i"
);

function hasFileUniqueAnchor(text: string): boolean {
  if (!text) return false;
  if (STRICT_UNIQUE_ANCHOR_RE.test(text)) return true;
  if (CHARGE_TEMPORAL_PREAMBLE_RE.test(text) && CONDUCT_PROPERTY_PERSON_RE.test(text)) return true;
  if (CHARGE_TEMPORAL_PREAMBLE_RE.test(text) && Q1_CHARGE_CONDUCT_RE.test(text)) return true;
  return false;
}

/**
 * Stronger case-specific anchor signal used to downgrade collapse/stem weak rows.
 * Combines structured anchors (EX-/MG-/CAD/CCTV/999, served/outstanding, next listing)
 * with a Q1-style charge preamble + conduct phrase. A long answer carrying any of
 * these is treated as case-specific enough to stop a "repeat fingerprint pair" or
 * "stem clustering" weak label.
 */
function hasCaseSpecificAnchor(text: string): boolean {
  if (!text) return false;
  if (CASE_ANCHOR_RE_ANY.test(text)) return true;
  if (OFFENCE_OR_CASE_MARKERS.test(text)) return true;
  if (CHARGE_OR_PARTICULARS_RE.test(text)) return true;
  if (CHARGE_TEMPORAL_PREAMBLE_RE.test(text) && CONDUCT_PROPERTY_PERSON_RE.test(text)) return true;
  if (CHARGE_TEMPORAL_PREAMBLE_RE.test(text) && Q1_CHARGE_CONDUCT_RE.test(text)) return true;
  return false;
}

function rowText(r: BulkEvalRunRowInput): string {
  return (r.answer || r.error || "").trim();
}

export function bulkEvalRunLabel(r: Pick<BulkEvalRunRowInput, "ok" | "http_status" | "error">): EvalRunLabel {
  if (!r.ok && r.http_status === 0) {
    const e = (r.error || "").toLowerCase();
    if (/timed out|abort|timeout|browser limit|signal is aborted|aborted without reason/i.test(e)) return "timeout";
    return "error";
  }
  if (!r.ok) return "error";
  return "ok";
}

/** Transport + strict route + legacy weak flag (before issue-based downgrade). */
export function bulkEvalBaseQualityLabel(r: BulkEvalRunRowInput, sweepMode: "golden_10" | "manual" | null): EvalQualityLabel {
  const run = bulkEvalRunLabel(r);
  if (run === "timeout") return "timeout";
  if (run === "error") return "error";
  const text = r.answer || r.error || "";
  if (TIMEOUT_OR_ABORT_ANSWER_RE.test(text)) return "timeout";
  const tag = (r.route_tag ?? "").trim();
  if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) return "fail";
  if (sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if (exp && !isAcceptedStrictRoute(r.questionNo, tag)) return "fail";
  }
  if (r.weak || isEvalWeakAnswer(text, { route_tag: r.route_tag })) {
    // Q1 printed-allegation rescue: a well-formed charge particulars line
    // (date preamble + conduct phrase, no friction / strategy / MG6 / generic
    // commentary noise) is real allegation wording. Don't downgrade to weak
    // just because the line is short.
    if (
      sweepMode === "golden_10" &&
      r.questionNo === 1 &&
      isAcceptedStrictRoute(1, tag) &&
      looksLikePrintedQ1Allegation(text)
    ) {
      return "pass";
    }
    return "weak";
  }
  return "pass";
}

function evalFingerprintForRow(r: BulkEvalRunRowInput): string {
  return r.eval_meta?.answer_fingerprint ?? fingerprintAnswer(rowText(r));
}

function fingerprintCountKey(r: BulkEvalRunRowInput): string {
  return `${r.questionNo}|${evalFingerprintForRow(r)}`;
}

function buildQuestionFingerprintCounts(rows: BulkEvalRunRowInput[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = fingerprintCountKey(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Mirrors `sweep_observability.semantic_collapse_by_question` (eval-observability thresholds). */
function buildSemanticCollapseWarningByQuestion(rows: BulkEvalRunRowInput[]): Map<number, boolean> {
  const prepared = rows.map((r) => ({
    question_no: r.questionNo,
    answer_fingerprint: evalFingerprintForRow(r),
  }));
  const m = new Map<number, boolean>();
  for (const row of semanticCollapseByQuestion(prepared)) {
    m.set(row.question_no, row.collapse_warning);
  }
  return m;
}

/** Weak only when semantic collapse_warning is true for that Q (same fingerprint cluster as observability). */
function buildSemanticFingerprintCollapseRowKeys(
  rows: BulkEvalRunRowInput[],
  warnByQ: Map<number, boolean>
): Set<string> {
  const counts = buildQuestionFingerprintCounts(rows);
  const out = new Set<string>();
  for (const r of rows) {
    if (!warnByQ.get(r.questionNo)) continue;
    if ((counts.get(fingerprintCountKey(r)) ?? 0) >= 2) {
      out.add(`${r.caseId}:${r.questionNo}`);
    }
  }
  return out;
}

/**
 * Same answer fingerprint across ≥2 cases but distinct route tags — only when semantic collapse_warning is false.
 */
function buildSameAnswerDifferentRouteRowKeys(
  rows: BulkEvalRunRowInput[],
  warnByQ: Map<number, boolean>
): Set<string> {
  const counts = buildQuestionFingerprintCounts(rows);
  const routesByFpKey = new Map<string, Set<string>>();
  const rowKeysByFpKey = new Map<string, string[]>();

  for (const r of rows) {
    const qn = r.questionNo;
    if (warnByQ.get(qn)) continue;
    const fk = fingerprintCountKey(r);
    if ((counts.get(fk) ?? 0) < 2) continue;
    const tag = (r.route_tag ?? "").trim() || "";
    const rt = tag.length ? tag : "—";
    const routeSet = routesByFpKey.get(fk) ?? new Set<string>();
    routeSet.add(rt);
    routesByFpKey.set(fk, routeSet);
    const arr = rowKeysByFpKey.get(fk) ?? [];
    arr.push(`${r.caseId}:${qn}`);
    rowKeysByFpKey.set(fk, arr);
  }

  const out = new Set<string>();
  for (const [fk, routeSet] of routesByFpKey) {
    if (routeSet.size < 2) continue;
    for (const k of rowKeysByFpKey.get(fk) ?? []) out.add(k);
  }
  return out;
}

/** ≥2 cases share fingerprint; semantic collapse_warning false; not already “different route” split. */
function buildRepeatFingerprintPairRowKeys(
  rows: BulkEvalRunRowInput[],
  warnByQ: Map<number, boolean>,
  sameAnswerDifferentRouteRowKeys: Set<string>
): Set<string> {
  const counts = buildQuestionFingerprintCounts(rows);
  const out = new Set<string>();
  for (const r of rows) {
    const qn = r.questionNo;
    if (warnByQ.get(qn)) continue;
    const rowKey = `${r.caseId}:${qn}`;
    if (sameAnswerDifferentRouteRowKeys.has(rowKey)) continue;
    if ((counts.get(fingerprintCountKey(r)) ?? 0) >= 2) {
      out.add(rowKey);
    }
  }
  return out;
}

function openingStem(text: string, len: number): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase().slice(0, len);
}

/** Same opening stem on Q3/Q8/Q9/Q10 across ≥3 cases → repeated template (PART C). */
export function bulkEvalStemClusterKeys(rows: BulkEvalRunRowInput[], sweepMode: "golden_10" | "manual" | null): Set<string> {
  const out = new Set<string>();
  if (sweepMode !== "golden_10") return out;
  const targetQ = new Set([3, 8, 9, 10]);
  for (const qn of targetQ) {
    const stemCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.questionNo !== qn) continue;
      const t = rowText(r);
      if (t.length < 45) continue;
      const stem = openingStem(t, 95);
      if (stem.length < 28) continue;
      stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
    }
    for (const [stem, n] of stemCounts) {
      if (n < 3) continue;
      for (const r of rows) {
        if (r.questionNo !== qn) continue;
        const t = rowText(r);
        if (openingStem(t, 95) === stem) out.add(`${r.caseId}:${r.questionNo}`);
      }
    }
  }
  return out;
}

function anchorHitCount(text: string): number {
  return [...text.matchAll(new RegExp(CASE_ANCHOR_PATTERN, "gi"))].length;
}

/** Enough anchors that a known-bad stem might still be redeemed (PART C tail). */
function hasStrongCaseAnchoring(text: string): boolean {
  if (text.length >= 260 && anchorHitCount(text) >= 2) return true;
  if (anchorHitCount(text) >= 4) return true;
  return false;
}

function goldenGenericStemIssue(qn: number, text: string): string | null {
  const t = text;
  if (qn === 1) {
    if (
      /matching the offence tag|Crown say events unfolded|At a Northshire location matching|offence tag\b/i.test(t) &&
      !hasStrongCaseAnchoring(t)
    ) {
      return "generic template";
    }
    const hasOffenceOrChargeWording =
      OFFENCE_OR_CASE_MARKERS.test(t) ||
      CHARGE_OR_PARTICULARS_RE.test(t) ||
      CASE_ANCHOR_RE_ANY.test(t) ||
      // Charge sheet wording like "On 14/05/2024 dishonestly received…" — the
      // statutory label is omitted but the temporal preamble plus conduct/property
      // /person wording is unambiguously allegation text and must not be marked weak.
      (CHARGE_TEMPORAL_PREAMBLE_RE.test(t) && CONDUCT_PROPERTY_PERSON_RE.test(t)) ||
      // Broader printed-allegation shape: temporal preamble + any Q1 charge-conduct
      // word/phrase, with no strategy / friction / MG6 / generic-commentary noise.
      // Catches terse particulars like "On 24/06/2026 stole electronic property…"
      // or "On 01/07/2026 had with him in public a sharply pointed article…".
      looksLikePrintedQ1Allegation(t);
    if (t.length > 35 && !hasOffenceOrChargeWording) {
      return "missing offence wording";
    }
    if (
      t.length > 120 &&
      /\b(in general|typically|generic case|without reviewing the bundle|not case-specific)\b/i.test(t) &&
      !hasStrongCaseAnchoring(t)
    ) {
      return "missing offence wording";
    }
  }
  if (qn === 2) {
    if (
      /check\s+mg6|refer to\s+mg6|see\s+mg6/i.test(t) &&
      !/served|outstanding|awaited|partial|extract|schedule row|mg6 table/i.test(t) &&
      t.length < 220
    ) {
      return "generic MG6 answer";
    }
  }
  if (qn === 3) {
    if (
      /Disclosure or outstanding items are flagged in the bundle text\.?\s*Check MG6/i.test(t) &&
      !hasStrongCaseAnchoring(t)
    ) {
      return "generic disclosure stem";
    }
  }
  if (qn === 4) {
    if (
      t.length > 0 &&
      t.length < 110 &&
      !/interview|PACE|prepared statement|no comment|den(y|ial)|admission|accept(ed)?|account|alibi|intoxicat/i.test(t)
    ) {
      return "thin interview summary";
    }
  }
  if (qn === 6) {
    if (
      /there may be inconsistencies|possible inconsistencies|inconsistencies may exist/i.test(t) &&
      !CASE_ANCHOR_RE_ANY.test(t) &&
      t.length < 200
    ) {
      return "generic inconsistency answer";
    }
  }
  if (qn === 7) {
    if (
      /beyond reasonable doubt|criminal standard|crown must prove|prosecution must prove/i.test(t) &&
      !OFFENCE_OR_CASE_MARKERS.test(t) &&
      anchorHitCount(t) < 2 &&
      t.length < 320
    ) {
      return "generic burden answer";
    }
  }
  if (qn === 8) {
    if (/disclosure gaps or incomplete scheduling may/i.test(t) && !hasStrongCaseAnchoring(t)) {
      return "generic prosecution weakness";
    }
  }
  if (qn === 9) {
    if (/narrative gaps or thin positive account/i.test(t) && !hasStrongCaseAnchoring(t)) {
      return "generic defence weakness";
    }
  }
  if (qn === 10) {
    const concreteNextSteps =
      /\b(999|master\s+audio|cad|cctv|continuity|engineer|mg\s*11|signed\s+mg11|lab\s+report|gp\s+records|proof\s+map|plea|element\s+chart|client\s+instructions|mg6\s+schedule|outstanding\s+cell|disclosure\s+request|hearing\s+note|charge\s+wording)\b/i.test(
        t
      );
    if (/Secure disclosure reconciliation/i.test(t) && !hasStrongCaseAnchoring(t) && !concreteNextSteps) {
      return "generic next steps";
    }
  }
  return null;
}

/**
 * Missing EX/MG-style anchors on long-form golden questions: blocking vs advisory-only
 * (advisory does not downgrade pass — surfaced via `bulkEvalAdvisoryNote`).
 */
function classifyGoldenAnchorFinding(qn: number, text: string): "blocking" | "advisory" | null {
  if (![3, 6, 7, 8, 9, 10].includes(qn)) return null;
  if (text.length < 55) return null;
  if (CASE_ANCHOR_RE_ANY.test(text) || OFFENCE_OR_CASE_MARKERS.test(text)) return null;
  if (
    text.length >= 480 &&
    /\b(Crown|defence|defense|disclosure|trial|witness|evidence|jury|PACE|burden|bundle|prosecution)\b/i.test(text)
  ) {
    return "advisory";
  }
  return "blocking";
}

export type BulkEvalCollapseRule =
  | null
  | "semantic_fingerprint"
  | "same_answer_different_source"
  | "repeat_fingerprint_pair"
  | "stem_clustering";

export type BulkEvalPresentCtx = {
  sweepMode: "golden_10" | "manual" | null;
  rows: BulkEvalRunRowInput[];
  semanticCollapseWarningByQuestion: Map<number, boolean>;
  semanticFingerprintCollapseRowKeys: Set<string>;
  sameAnswerDifferentRouteRowKeys: Set<string>;
  repeatFingerprintPairRowKeys: Set<string>;
  stemClusterKeys: Set<string>;
};

export function buildBulkEvalPresentCtx(
  rows: BulkEvalRunRowInput[],
  sweepMode: "golden_10" | "manual" | null
): BulkEvalPresentCtx {
  const semanticCollapseWarningByQuestion = buildSemanticCollapseWarningByQuestion(rows);
  const semanticFingerprintCollapseRowKeys = buildSemanticFingerprintCollapseRowKeys(
    rows,
    semanticCollapseWarningByQuestion
  );
  const sameAnswerDifferentRouteRowKeys = buildSameAnswerDifferentRouteRowKeys(rows, semanticCollapseWarningByQuestion);
  const repeatFingerprintPairRowKeys = buildRepeatFingerprintPairRowKeys(
    rows,
    semanticCollapseWarningByQuestion,
    sameAnswerDifferentRouteRowKeys
  );
  return {
    sweepMode,
    rows,
    semanticCollapseWarningByQuestion,
    semanticFingerprintCollapseRowKeys,
    sameAnswerDifferentRouteRowKeys,
    repeatFingerprintPairRowKeys,
    stemClusterKeys: bulkEvalStemClusterKeys(rows, sweepMode),
  };
}

export type BulkEvalPresentOutcome = {
  quality: EvalQualityLabel;
  /** Blocking / primary label for UI & exports. */
  issue: string;
  /** Non-downgrading QA hint (e.g. sparse EX/MG lines on an otherwise strong narrative). */
  advisory: string | null;
  /** Which repeat/collapse heuristic fired (debug bundle); null if not a collapse-class issue. */
  collapse_rule: BulkEvalCollapseRule;
};

/**
 * Single source of truth for final quality + blocking issue (+ optional advisory).
 * Keeps pass/weak/fail aligned with the issue string (no weak + "—", no pass + blocking anchor).
 */
export function computeBulkEvalRowPresent(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): BulkEvalPresentOutcome {
  const run = bulkEvalRunLabel(r);
  const text = rowText(r);
  const raw = r.answer || r.error || "";
  const tag = (r.route_tag ?? "").trim();
  const rowKey = `${r.caseId}:${r.questionNo}`;

  if (run === "timeout" || TIMEOUT_OR_ABORT_ANSWER_RE.test(raw)) {
    return { quality: "timeout", issue: "timeout", advisory: null, collapse_rule: null };
  }
  if (run === "error") {
    return { quality: "error", issue: "error", advisory: null, collapse_rule: null };
  }

  if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) {
    return { quality: "fail", issue: "fallback", advisory: null, collapse_rule: null };
  }

  if (ctx.sweepMode === "golden_10") {
    const exp = GOLDEN_STRICT_EXPECTED_ROUTE[r.questionNo];
    if (exp && !isAcceptedStrictRoute(r.questionNo, tag)) {
      return { quality: "fail", issue: "wrong route", advisory: null, collapse_rule: null };
    }
  }

  if (ctx.semanticFingerprintCollapseRowKeys.has(rowKey)) {
    // Rescue: truly identical answers across cases that carry a file-unique
    // anchor (CB-X-YYYY-NNNN / NS-CPS-YYYY-NNNN / EX-* with digits / Q1
    // charge temporal preamble + conduct phrase). The scorer does NOT
    // downgrade purely on generic anchors like "MG6", "CCTV", "served" —
    // those stay weak because they appear in flat templates.
    if (hasFileUniqueAnchor(text)) {
      return {
        quality: "pass",
        issue: "—",
        advisory: "semantic-fingerprint collapse — file-unique anchor present (advisory)",
        collapse_rule: "semantic_fingerprint",
      };
    }
    return {
      quality: "weak",
      issue: "collapse/repeated answer (semantic fingerprint)",
      advisory: null,
      collapse_rule: "semantic_fingerprint",
    };
  }
  if (ctx.sameAnswerDifferentRouteRowKeys.has(rowKey)) {
    if (hasFileUniqueAnchor(text)) {
      return {
        quality: "pass",
        issue: "—",
        advisory: "same answer fingerprint, different route — file-unique anchor present (advisory)",
        collapse_rule: "same_answer_different_source",
      };
    }
    return {
      quality: "weak",
      issue: "same answer fingerprint, different route",
      advisory: null,
      collapse_rule: "same_answer_different_source",
    };
  }
  if (ctx.repeatFingerprintPairRowKeys.has(rowKey)) {
    // Case-specific anchors (offence/charge wording, EX-/MG-/CAD/CCTV/999/served-outstanding,
    // Q1 temporal preamble + conduct) override the digest-shaped collapse warning.
    if (hasCaseSpecificAnchor(text)) {
      return {
        quality: "pass",
        issue: "—",
        advisory: "repeated digest shape — case anchors present (advisory)",
        collapse_rule: "repeat_fingerprint_pair",
      };
    }
    return {
      quality: "weak",
      issue: "repeat source digest (≥2 cases)",
      advisory: null,
      collapse_rule: "repeat_fingerprint_pair",
    };
  }
  if (ctx.stemClusterKeys.has(rowKey)) {
    if (hasCaseSpecificAnchor(text)) {
      return {
        quality: "pass",
        issue: "—",
        advisory: "shared opening stem — case anchors present (advisory)",
        collapse_rule: "stem_clustering",
      };
    }
    return {
      quality: "weak",
      issue: "stem clustering",
      advisory: null,
      collapse_rule: "stem_clustering",
    };
  }

  if (isSuspiciouslyShortAnswer(text, r.route_tag)) {
    return { quality: "weak", issue: "too short", advisory: null, collapse_rule: null };
  }

  let advisory: string | null = null;

  if (ctx.sweepMode === "golden_10" && run === "ok") {
    const stemIssue = goldenGenericStemIssue(r.questionNo, text);
    if (stemIssue) return { quality: "weak", issue: stemIssue, advisory: null, collapse_rule: null };

    const anchorTier = classifyGoldenAnchorFinding(r.questionNo, text);
    if (anchorTier === "blocking") {
      return { quality: "weak", issue: "missing case-specific anchor", advisory: null, collapse_rule: null };
    }
    if (anchorTier === "advisory") {
      advisory = "sparse bundle anchors (advisory)";
    }
  }

  const weakNow = r.weak || isEvalWeakAnswer(text, { route_tag: r.route_tag });
  if (weakNow) {
    // Q1 printed-allegation rescue: short but well-formed charge particulars
    // (date preamble + conduct phrase, no strategy / friction / MG6 / generic
    // commentary wording) read as real allegation text and must stay pass.
    if (
      ctx.sweepMode === "golden_10" &&
      r.questionNo === 1 &&
      isAcceptedStrictRoute(1, tag) &&
      looksLikePrintedQ1Allegation(text)
    ) {
      return {
        quality: "pass",
        issue: "—",
        advisory: advisory ?? "Q1 printed-allegation shape (terse but grounded)",
        collapse_rule: null,
      };
    }
    let issue = "vague";
    if (ctx.sweepMode === "golden_10") {
      if ((r.questionNo === 1 || r.questionNo === 2) && isAcceptedStrictRoute(r.questionNo, tag)) {
        issue = "missing expected bundle wording";
      } else if (r.questionNo === 5) issue = "invented fact risk";
    }
    return { quality: "weak", issue, advisory, collapse_rule: null };
  }

  const base = bulkEvalBaseQualityLabel(r, ctx.sweepMode);
  if (base === "pass") {
    return { quality: "pass", issue: "—", advisory, collapse_rule: null };
  }

  if (base === "timeout") return { quality: "timeout", issue: "timeout", advisory: null, collapse_rule: null };
  if (base === "error") return { quality: "error", issue: "error", advisory: null, collapse_rule: null };
  if (base === "fail") {
    const issue = tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag) ? "fallback" : "wrong route";
    return { quality: "fail", issue, advisory: null, collapse_rule: null };
  }

  let issue = "vague";
  if (ctx.sweepMode === "golden_10") {
    if ((r.questionNo === 1 || r.questionNo === 2) && isAcceptedStrictRoute(r.questionNo, tag)) {
      issue = "missing expected bundle wording";
    } else if (r.questionNo === 5) issue = "invented fact risk";
  }
  return { quality: "weak", issue, advisory, collapse_rule: null };
}

/**
 * Single human-readable blocking issue (same priority as {@link computeBulkEvalRowPresent}).
 */
export function bulkEvalIssue(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string {
  return computeBulkEvalRowPresent(r, ctx).issue;
}

/** Optional advisory line when quality stays pass (does not imply weak). */
export function bulkEvalAdvisoryNote(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string | null {
  return computeBulkEvalRowPresent(r, ctx).advisory;
}

function resolvedIssueFromPresent(p: BulkEvalPresentOutcome, r: BulkEvalRunRowInput): string {
  if (p.quality === "weak" || p.quality === "fail") {
    if (p.issue !== "—" && p.issue.trim().length > 0) return p.issue;
    const tag = (r.route_tag ?? "").trim();
    if (p.quality === "fail") return tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag) ? "fallback" : "wrong route";
    return "vague";
  }
  return p.issue;
}

/**
 * Human-readable issue for exports; never `"—"` when quality is weak/fail.
 */
export function bulkEvalResolvedFinalIssue(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): string {
  return resolvedIssueFromPresent(computeBulkEvalRowPresent(r, ctx), r);
}

/** Final pass / weak / fail / timeout / error (same rules as {@link computeBulkEvalRowPresent}). */
export function bulkEvalQualityFinal(r: BulkEvalRunRowInput, ctx: BulkEvalPresentCtx): EvalQualityLabel {
  return computeBulkEvalRowPresent(r, ctx).quality;
}

export function bulkEvalPreviewShort(text: string, max = 88): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 32 ? cut.slice(0, sp) : cut) + "…";
}

export function bulkEvalSweepSummary(rows: BulkEvalRunRowInput[], ctx: BulkEvalPresentCtx) {
  let pass = 0;
  let weak = 0;
  let fail = 0;
  let timeoutError = 0;
  const snapshots = rows.map((r) => computeBulkEvalRowPresent(r, ctx));
  for (let i = 0; i < rows.length; i++) {
    const p = snapshots[i]!;
    if (p.quality === "pass") pass += 1;
    else if (p.quality === "weak") weak += 1;
    else if (p.quality === "fail") fail += 1;
    else timeoutError += 1;
  }

  let mainIssue = "None detected";
  if (rows.length === 0) mainIssue = "—";
  else {
    const issueRows = rows
      .map((r, i) => ({ r, iss: resolvedIssueFromPresent(snapshots[i]!, r) }))
      .filter((x) => x.iss !== "—");
    if (issueRows.length === 0) {
      mainIssue = "None detected";
    } else {
      const byIssue = new Map<string, { n: number; qs: Set<number> }>();
      for (const { r, iss } of issueRows) {
        const cur = byIssue.get(iss) ?? { n: 0, qs: new Set<number>() };
        cur.n += 1;
        cur.qs.add(r.questionNo);
        byIssue.set(iss, cur);
      }
      const severityOrder = [
        "wrong route",
        "fallback",
        "timeout",
        "error",
        "collapse/repeated answer (semantic fingerprint)",
        "same answer fingerprint, different route",
        "repeat source digest (≥2 cases)",
        "stem clustering",
        "invented fact risk",
        "generic template",
        "missing offence wording",
        "generic MG6 answer",
        "generic disclosure stem",
        "thin interview summary",
        "generic inconsistency answer",
        "generic burden answer",
        "generic prosecution weakness",
        "generic defence weakness",
        "generic next steps",
        "missing case-specific anchor",
        "missing expected bundle wording",
        "too short",
        "vague",
      ];
      let bestIssue = "";
      let bestN = -1;
      let bestQs = new Set<number>();
      let bestSev = 999;
      for (const [iss, v] of byIssue) {
        const sev = severityOrder.indexOf(iss);
        const rank = sev === -1 ? 500 : sev;
        if (v.n > bestN || (v.n === bestN && rank < bestSev)) {
          bestN = v.n;
          bestIssue = iss;
          bestQs = v.qs;
          bestSev = rank;
        }
      }
      const qsStr = [...bestQs].sort((a, b) => a - b).map((q) => `Q${q}`).join("/");
      mainIssue = `${bestIssue} (${bestN} rows on ${qsStr})`;
    }
  }

  return {
    total: rows.length,
    pass,
    weak,
    fail,
    timeoutError,
    mainIssue,
    final_pass_count: pass,
    final_weak_count: weak,
    final_fail_count: fail,
    final_timeout_error_count: timeoutError,
  };
}

export type BulkEvalFinalSummary = ReturnType<typeof bulkEvalSweepSummary>;

/** Augments eval rows with `final_quality` / `final_issue` / `final_collapse_rule` (same logic as Defence Plan UI). */
export function bulkEvalBuildAugmentedRows<T extends BulkEvalRunRowInput>(
  rows: T[],
  sweepMode: "golden_10" | "manual" | null
): {
  ctx: BulkEvalPresentCtx;
  final_summary: BulkEvalFinalSummary;
  rows_augmented: Array<T & { final_quality: EvalQualityLabel; final_issue: string; final_collapse_rule: BulkEvalCollapseRule }>;
} {
  const ctx = buildBulkEvalPresentCtx(rows, sweepMode);
  const final_summary = bulkEvalSweepSummary(rows, ctx);
  const rows_augmented = rows.map((r) => {
    const p = computeBulkEvalRowPresent(r, ctx);
    return {
      ...r,
      final_quality: p.quality,
      final_issue: resolvedIssueFromPresent(p, r),
      final_collapse_rule: p.collapse_rule,
    };
  });
  return { ctx, final_summary, rows_augmented };
}
