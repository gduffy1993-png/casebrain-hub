/**
 * Chase source gate — a chase recommendation must be backed by the source file.
 *
 * Rules:
 *  - "mentioned": the bundle mentions the material family (incl. synonyms) → chase allowed.
 *  - "negated":  the bundle explicitly says the material does not exist → do NOT chase;
 *                use confirm-none wording instead (absence may itself be strategic).
 *  - "absent":   the bundle never mentions the family → drop the templated chase line.
 *
 * Sweep 2 (2026-06-10) measured templated over-chase on 96/120 eval cases, including
 * 7 cases chasing CCTV the file explicitly negated. This gate removes that class.
 */

export type ChaseGateFamily =
  | "cctv"
  | "bwv"
  | "cad_999"
  | "custody_pace"
  | "medical"
  | "interview"
  | "mg6_unused"
  | "phone"
  | "forensic"
  | "bank_financial";

export type FamilySupport = "mentioned" | "negated" | "absent";

const MENTION_RES: Record<ChaseGateFamily, RegExp> = {
  cctv: /\bcctv\b|video\s+footage|camera\s+footage|dashcam|master\s+footage|\bfootage\b/i,
  // Schedule glue: MG6C/004BWV — digit/letter join kills \b before BWV.
  bwv: /(?:^|[^A-Za-z])BWV(?![A-Za-z])|body[-\s]?worn/i,
  // Never treat bare "999" (page numbers / schedule noise) as CAD establishment.
  cad_999:
    /\bcad\b|CAD\s*\/\s*999|999\s+(?:audio|call|recording)|command\s+(?:and\s+)?(?:control|dispatch)|control[-\s]?room\s+log|dispatch\s+log|emergency\s+call/i,
  custody_pace:
    /\b(?:custody\s+(?:record|log|sheet)|detention\s+log|PACE\s+(?:material|record|clock|Code\s+C|interview)|safeguards?\s+checklist|risk\s+assessment)\b/i,
  medical: /\bmedical\b|hospital|a\s*&\s*e\b|ambulance|paramedic|\bgp\s+records?\b|\bfme\b|pathology|injury\s+report/i,
  interview: /\binterview\s+(?:recording|transcript|audio|video)\b|\bpace\s+interview\b|interview\s+recording|interview\s+transcript/i,
  // Unused/MG6C schedule — not a plain MG6 extract presence alone.
  mg6_unused: /\bmg6c\b|unused\s+material|unused\s+schedule|schedule\s+of\s+(?:unused|non[-\s]?sensitive)|mg6\s*\/\s*unused|schedule\s+clarification/i,
  // Require digital-evidence phone signals — not property-of-theft "stolen a phone".
  phone:
    /(?:full\s+)?phone\s+(?:extraction|download|attribution)|phone\s+download|source\s+export|device\s+download|device\s*\/\s*login|login\s+audit|ip\s*\/\s*access|\bsim\b|\bimei\b|subscriber|handset|cellebrite|\bufed\b|mobile\s+(?:extraction|download)/i,
  forensic: /forensic|\bdna\b|fingerprint|\bswab\b/i,
  bank_financial:
    /\bbank(?:ing)?\b|account\s+control|account\s+ownership|transaction(?:s)?|bank\s+statements?|account\s+statements?|financial\s+records?|financial\s+statements?|poca|source.of.funds|mailbox|email\s+(?:export|source)|bookkeeper|accountant/i,
};

const NEGATION_RES: Record<ChaseGateFamily, RegExp> = {
  // "No CCTV master/continuity" is modality-specific absence — not whole-family CCTV negation
  // (stills may still be served; invent mute must drop master/continuity, not invent "no CCTV").
  cctv: /\bno\s+cctv\b(?!\s+(?:master|continuity|provenance|full\s+window|stills?))|cctv\s+(?:is|was)?\s*not\s+available|without\s+cctv|no\s+(?:cctv|camera)\s+(?:footage|coverage)|no\s+footage\s+(?:exists|available|was)|cctv\s+does\s+not\s+exist|no\s+cctv\s+(?:was\s+)?(?:recovered|obtained|seized|in\s+operation)/i,
  bwv: /\bno\s+bwv\b|bwv\s+(?:is|was)?\s*not\s+(?:available|activated|worn)|no\s+body[-\s]?worn/i,
  cad_999: /no\s+999\s+call|no\s+cad\s+(?:log|record|entry)|999\s+call\s+not\s+(?:made|available)/i,
  custody_pace:
    /no\s+(?:custody\s+(?:record|log|sheet)|detention\s+log|PACE\s+(?:material|record)|safeguards?\s+checklist|risk\s+assessment)\s+(?:exists|available|served|prepared)|custody\s+record\s+not\s+(?:available|held)/i,
  medical: /no\s+medical\s+(?:evidence|records?|notes?|report|treatment)|did\s+not\s+(?:seek|require)\s+medical/i,
  interview: /no\s+interview\s+(?:was\s+)?(?:conducted|held)|declined\s+interview|interview\s+not\s+(?:conducted|recorded)|interview\s+recording\s+not\s+mentioned|interview\s+transcript\s+not\s+mentioned/i,
  mg6_unused: /no\s+(?:mg6|unused\s+material|disclosure\s+schedule)\s+(?:exists|available|served|prepared)/i,
  phone: /no\s+(?:phone|mobile|handset|device)\s+(?:was\s+)?(?:seized|recovered|examined)/i,
  forensic: /no\s+forensic\s+(?:evidence|material|examination)|no\s+dna\s+(?:was\s+)?(?:recovered|found|obtained)/i,
  bank_financial: /no\s+(?:bank|banking|account)\s+(?:records?|statements?|material)|no\s+financial\s+records?/i,
};

const CHASE_VERB_RE = /\b(chase|obtain|request|provide|serve|secure|pursue|outstanding|awaiting|not\s+(?:yet\s+)?served)\b/i;

const GATE_FAMILIES = Object.keys(MENTION_RES) as ChaseGateFamily[];

/**
 * Trap-style invent advisories name CCTV/BWV/forensics only to forbid invention.
 * Those hits must not establish the family for chase / overview promotion.
 */
const DO_NOT_INVENT_ADVISORY_RE =
  /\b(?:do\s+not|should\s+not)\b[^.!?\n]{0,100}?\b(?:invent|assume|strengthen(?:ed)?)\b[^.!?\n]{0,100}?\b(?:cctv|bwv|footage|forensic)|(?:assuming|do\s+not\s+assume)\s+missing\s+(?:cctv|bwv|footage|forensic(?:\s+evidence)?)/i;

const FAMILIES_AFFECTED_BY_INVENT_ADVISORY = new Set<ChaseGateFamily>(["cctv", "bwv", "forensic"]);

/**
 * Strip do-not-invent advisory clauses before testing whether a family is established.
 *
 * The clause is found by splitting on sentence ends rather than by asking one pattern to reach out to
 * them. A bundle flattened out of a PDF can run thousands of characters without a full stop, and a
 * pattern that opens by consuming to the sentence edge has to retry every one of those lengths at
 * every position: on the case with the most papers that single match cost 49 of the board's 55
 * seconds. Splitting first bounds what the pattern ever looks at to one clause.
 */
export function stripDoNotInventAdvisory(text: string): string {
  const cached = strippedCache.get(text);
  if (cached !== undefined) return cached;
  const stripped = !DO_NOT_INVENT_ADVISORY_RE.test(text)
    ? text
    : text
        .split(/(?<=[.!?\n])/)
        .map((clause) => (DO_NOT_INVENT_ADVISORY_RE.test(clause) ? " " : clause))
        .join("");
  rememberStripped(text, stripped);
  return stripped;
}

/**
 * The last few texts stripped, because the pipeline asks the same question of the same papers.
 *
 * Every gate strips the advisory before it looks for its family, every card is gated separately, and
 * the pipeline gates repeatedly as the list is built: on the case with the most papers that came to
 * 859 strips reading 110 million characters, all of it the same handful of texts. The answer depends
 * on nothing but the text, so it is worth keeping. Bounded to a few entries — a case builds its board
 * from one bundle, and holding onto whole bundles is how a server runs out of memory.
 */
const STRIPPED_CACHE_LIMIT = 8;
const strippedCache = new Map<string, string>();

function rememberStripped(text: string, stripped: string): void {
  if (strippedCache.size >= STRIPPED_CACHE_LIMIT) {
    const oldest = strippedCache.keys().next().value;
    if (oldest !== undefined) strippedCache.delete(oldest);
  }
  strippedCache.set(text, stripped);
}

/**
 * Thin schedule/review CCTV/BWV language is not master / full-window / continuity establishment.
 * Grant-style "Review whether listed CCTV/BWV has been served" must not promote invents.
 */
const THIN_LISTED_CCTV_BWV_RE =
  /review\s+whether\s+listed\s+cctv\s*\/?\s*bwv[^.!\n]*|listed\s+cctv\s*\/\s*bwv/gi;

/** Product checklist labels that must not circularly establish master/full-window. */
const PRODUCT_CCTV_INVENT_LABEL_RE =
  /CCTV Full Window|CCTV Continuity|CCTV full window\s*\/\s*master footage|CCTV \(full window[^)]*\)/gi;

/** Affirmative master / full-window establishment on the papers (not thin listed CCTV/BWV). */
export function isCctvMasterEstablished(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = stripDoNotInventAdvisory(sourceText)
    .replace(THIN_LISTED_CCTV_BWV_RE, " ")
    .replace(PRODUCT_CCTV_INVENT_LABEL_RE, " ")
    // Witness/review "not the full CCTV…" is not master establishment (Court tip invent residual).
    .replace(/not\s+the\s+full\s+cctv\b[^.\n]{0,80}/gi, " ")
    .replace(/not\s+full\s+cctv\b[^.\n]{0,80}/gi, " ")
    .replace(/shown\s+some\s+material\s+but\s+not\s+the\s+full\s+cctv\b[^.\n]{0,80}/gi, " ")
    // Pack boilerplate: "Full CCTV master outstanding or not verified, where applicable."
    // is not a schedule cell naming master (Beck stills-only).
    .replace(
      /(?:^|[.\n])[^\n.]{0,40}\bfull\s+cctv\s+master\b[^.!\n]{0,80}\bwhere\s+applicable\b/gi,
      " ",
    )
    // Explicit negation / absence lines must not establish (Dunn invent mute).
    .replace(/\bno\s+cctv\s+master\b[^.\n]{0,40}/gi, " ")
    .replace(/\bno\s+(?:full\s+)?(?:cctv\s+)?(?:time\s+)?window\b[^.\n]{0,40}/gi, " ")
    .replace(/\bno\s+master\s+footage\b[^.\n]{0,40}/gi, " ");
  // Affirmative master / full-window naming (including "full window missing" outstanding).
  // Do not treat bare "full CCTV or BWV sequence" after negation-strip leftovers as master.
  return (
    /CCTV master|full CCTV master|master footage|full master/i.test(hay) ||
    /\bfull\s*(?:time\s+)?window\b/i.test(hay) ||
    /\bfull\s+cctv\s+(?:master|window)\b/i.test(hay)
  );
}

/**
 * Affirmative CCTV continuity establishment — bare "officer continuity" or thin listed CCTV/BWV
 * is not enough. Require continuity *tied to CCTV/footage* in the same phrase/window.
 * Document-wide co-occurrence of "CCTV stills" + unrelated "forensic continuity" must NOT establish.
 */
export function isCctvContinuityEstablished(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = stripDoNotInventAdvisory(sourceText)
    .replace(THIN_LISTED_CCTV_BWV_RE, " ")
    .replace(PRODUCT_CCTV_INVENT_LABEL_RE, " ")
    .replace(/\bno\s+cctv\s+continuity\b[^.\n]{0,60}/gi, " ")
    .replace(/\bno\s+continuity\s+record\b[^.\n]{0,40}/gi, " ");

  // Explicit CCTV-continuity naming.
  if (
    /\bcctv\s+continuity\b/i.test(hay) ||
    /\bcontinuity\s+(?:of\s+)?(?:the\s+)?(?:cctv|footage|video)\b/i.test(hay) ||
    /\b(?:cctv|footage|video)\s+continuity\s+(?:statement|log|record|note)\b/i.test(hay)
  ) {
    return true;
  }

  // Same-sentence / near-window only — never whole-document "CCTV" + "continuity".
  const windowHit =
    /\b(?:cctv|footage|master|video)\b[^.\n]{0,80}\bcontinuity\s+(?:statement|log|record|note|of\s+sources)?\b/i.test(
      hay,
    ) ||
    /\bcontinuity\s+(?:statement|log|record|note)\b[^.\n]{0,80}\b(?:cctv|footage|master|video)\b/i.test(
      hay,
    );

  if (!windowHit) return false;
  return true;
}

/** Confirmation-only CCTV continuity language must not become an asserted outstanding chase. */
export function isCctvContinuityConfirmationOnly(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = stripDoNotInventAdvisory(sourceText)
    .replace(THIN_LISTED_CCTV_BWV_RE, " ")
    .replace(PRODUCT_CCTV_INVENT_LABEL_RE, " ");
  if (!/\bcctv\b/i.test(hay) || !/\bcontinuity\b/i.test(hay)) return false;
  const confirmationOnly =
    /\bcontinuity\s+of\s+cctv\s+sources\s*:\s*to\s+be\s+checked\b/i.test(hay) ||
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

/** True when a chase/material line is a CCTV master / full-window invent surface. */
export function lineClaimsCctvMasterOrFullWindow(line: string): boolean {
  return /CCTV master|master footage|full CCTV master|CCTV Full Window|full\s*(?:time\s+)?window|CCTV full window/i.test(
    line,
  );
}

/** True when a chase/material line is a CCTV continuity invent surface. */
export function lineClaimsCctvContinuity(line: string): boolean {
  return /CCTV Continuity|CCTV continuity|cctv[^.\n]{0,40}continuity|continuity[^.\n]{0,40}cctv/i.test(
    line,
  );
}

/** True when a chase/material line invents ID / VIPER / parade procedure. */
export function lineClaimsIdentificationProcedure(line: string): boolean {
  return /\b(?:id\s+procedure|identification\s+procedure|viper|vipers|id\s+parade|video\s+identification|parade\s+identification)\b/i.test(
    line,
  );
}

/**
 * Affirmative ID / VIPER / parade establishment on the papers.
 * Robbery pack must not invent ID procedure without this.
 */
export function isIdentificationProcedureEstablished(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = stripDoNotInventAdvisory(sourceText)
    .replace(/\bno\s+(?:id|identification)\s+procedure\b[^.\n]{0,40}/gi, " ")
    .replace(/\bno\s+(?:viper|vipers|id\s+parade|video\s+identification)\b[^.\n]{0,40}/gi, " ");
  return (
    /\b(?:id\s+procedure|identification\s+procedure|viper|vipers|id\s+parade|video\s+identification|parade\s+identification)\b/i.test(
      hay,
    ) || /\bcode\s+d\b[^.\n]{0,40}\b(?:identification|parade|viper)\b/i.test(hay)
  );
}

/**
 * Affirmative BWV full-export / clip / incident-window establishment.
 * Dunn-style "BWV stills Served" alone must not establish a full-export chase.
 */
export function isBwvFullExportEstablished(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = stripDoNotInventAdvisory(sourceText).replace(THIN_LISTED_CCTV_BWV_RE, " ");

  const stillsServedOnly =
    /\bbwv\s+stills?\s+served\b|\bs\d+\s*bwv\s+stills?\b/i.test(hay) &&
    !/\b(?:full\s+bwv|bwv\s+(?:full\s+)?export|bwv\s+footage|bwv\s+clip|full\s+(?:bwv\s+)?incident\s+window|body[- ]?worn[^.\n]{0,50}(?:full\s+export|outstanding|not\s+served|not\s+attached))\b/i.test(
      hay,
    ) &&
    !/\bbwv\b(?![^.!\n]{0,20}stills)[^.\n]{0,60}(?:outstanding|not\s+served|not\s+attached|referred(?:\s+only)?|full\s+export)/i.test(
      hay,
    );
  if (stillsServedOnly) return false;

  return (
    /\bfull\s+bwv(?:\s+(?:export|footage|sequence|incident(?:\s+window)?))?\b/i.test(hay) ||
    /\bbwv\s+(?:full\s+)?export\b/i.test(hay) ||
    /\bfull\s+(?:bwv\s+)?incident\s+window\b/i.test(hay) ||
    /\bbwv\s+clip\s+(?:outstanding|needed|not\s+served)\b/i.test(hay) ||
    /\bu\d+\s*bwv(?:\s+clip)?\s+outstanding\b/i.test(hay) ||
    // Schedule glue: MG6C/004BWV from … not servedMay (served glued into next word)
    /(?:^|[^A-Za-z])BWV(?![A-Za-z])[^.\n]{0,80}?(?:not\s+served|not\s+attached|referred(?:\s+only)?|outstanding)/i.test(
      hay,
    ) ||
    /\bbwv\b[^.\n]{0,60}(?:not\s+served|not\s+attached|referred(?:\s+only)?|outstanding)\b/i.test(hay) ||
    /\bbody[- ]?worn\b[^.\n]{0,60}(?:not\s+served|not\s+attached|referred(?:\s+only)?|outstanding|full\s+export)\b/i.test(
      hay,
    )
  );
}

/** True when a chase/material line is a BWV full-export invent surface. */
export function lineClaimsBwvFullExport(line: string): boolean {
  return (
    /\bfull\s+bwv\s+export\b|\bbwv\s+(?:full\s+)?export\b|\bfull\s+bwv\b|\bbwv\s+incident\s+window\b/i.test(
      line,
    ) ||
    (/\b(?:bwv|body[- ]?worn)\b/i.test(line) &&
      /\b(?:full\s+export|continuity|audit\s+trail)\b/i.test(line))
  );
}

/**
 * Affirmative phone *download / extraction / source-export* establishment.
 * SIM/IMEI/subscriber/handset alone must not establish a Full phone download chase
 * (Court invent_phone residual — Mercer-style attribution ≠ download).
 */
export function isPhoneDownloadEstablished(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = stripDoNotInventAdvisory(sourceText);
  const established =
    /(?:full\s+)?phone\s+download/i.test(hay) ||
    /phone\s+extraction/i.test(hay) ||
    /source\s+export/i.test(hay) ||
    /logical\s+download/i.test(hay) ||
    /handset\s+download/i.test(hay) ||
    /device\s+download/i.test(hay) ||
    /digital\s+extraction/i.test(hay) ||
    /original\s+download/i.test(hay) ||
    /download\s+report/i.test(hay) ||
    /\bcellebrite\b|\bufed\b/i.test(hay) ||
    /mobile\s+(?:extraction|download)/i.test(hay);
  const negated =
    /\bno\s+(?:full\s+)?phone\s+download\b/i.test(hay) ||
    /\bno\s+(?:phone\s+)?extraction\b/i.test(hay) ||
    /\bno\s+source\s+export\b/i.test(hay);
  return established && !negated;
}

/** True when a chase/material line claims phone download / extraction modality (not bare attribution). */
export function lineClaimsPhoneDownload(line: string): boolean {
  return (
    /\b(?:full\s+)?phone\s+download\b/i.test(line) ||
    /\bphone\s+extraction\b/i.test(line) ||
    /\bsource\s+export\b/i.test(line) ||
    /\blogical\s+download\b/i.test(line) ||
    /\bhandset\s+download\b/i.test(line) ||
    /\bdevice\s+download\b/i.test(line) ||
    /\bdigital\s+extraction\b/i.test(line) ||
    /\boriginal\s+download\b/i.test(line) ||
    /\bfull\s+phone\s+extraction\b/i.test(line) ||
    /\bmetadata\s*\/\s*source\s+download\b/i.test(line)
  );
}

/**
 * Affirmative CAD / 999-audio / control-room establishment.
 * Bare schedule "page 999" must not establish a CAD chase (Court C0.5 hop).
 */
export function isCad999Established(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const affirmativeHay = sourceText
    .replace(/\bno\s+cad\b[^.\n]{0,80}/gi, " ")
    .replace(/\bno\s+999\s+audio\b[^.\n]{0,40}/gi, " ")
    .replace(/\bno\s+999\s+call\b[^.\n]{0,40}/gi, " ");
  return (
    /\bcad\b/i.test(affirmativeHay) ||
    /\bCAD\s*\/\s*999\b/i.test(affirmativeHay) ||
    /\b999\s+(?:audio|call|recording)\b/i.test(affirmativeHay) ||
    /\bcommand\s+(?:and\s+)?(?:control|dispatch)\b/i.test(affirmativeHay) ||
    /\bcontrol[-\s]?room\s+log\b/i.test(affirmativeHay) ||
    /\bdispatch\s+log\b/i.test(affirmativeHay) ||
    /\bemergency\s+call\b/i.test(affirmativeHay)
  );
}

/**
 * Affirmative interview *recording* modality (not PACE interview / summary alone).
 * Court C0.5: "PACE interview conducted" must not invent "Interview recording" chase.
 */
export function isInterviewRecordingEstablished(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = sourceText;
  const established =
    /\binterview\s+recording\b/i.test(hay) ||
    /\bPACE\s+recording\b/i.test(hay) ||
    /\baudio[-\s]?visual\s+interview\b/i.test(hay) ||
    /\bROTI\b/i.test(hay) ||
    // Tobin-style modality split: recording state flagged while interview is on the papers.
    (/\binterview\b/i.test(hay) &&
      /\brecording\s+state\s+(?:not\s+safely\s+confirmed|outstanding|missing|unclear)\b/i.test(hay)) ||
    (/\binterview\b/i.test(hay) &&
      /\b(?:full\s+)?recording\b[^.\n]{0,48}\b(?:outstanding|not\s+served|not\s+attached|needed|not\s+safely\s+confirmed)\b/i.test(
        hay,
      ));
  const negated =
    /\bno\s+(?:pace\s+)?(?:interview\s+)?recording\b/i.test(hay) ||
    /\b(?:interview\s+)?recording\s+(?:not|never)\s+(?:made|taken|served|attached|mentioned)\b/i.test(hay);
  return established && !negated;
}

/** Affirmative interview transcript modality. */
export function isInterviewTranscriptEstablished(sourceText: string): boolean {
  if (!sourceText?.trim()) return false;
  const hay = sourceText;
  const established =
    /\binterview\s+transcript\b/i.test(hay) ||
    /\bPACE\s+transcript\b/i.test(hay) ||
    (/\binterview\b/i.test(hay) &&
      /\b(?:full\s+)?transcript\b[^.\n]{0,48}\b(?:outstanding|not\s+served|not\s+attached|needed|served|present)\b/i.test(
        hay,
      ));
  const negated =
    /\bno\s+(?:pace\s+)?(?:interview\s+)?transcript\b/i.test(hay) ||
    /\b(?:interview\s+)?transcript\s+(?:not|never)\s+(?:made|taken|served|attached|mentioned)\b/i.test(hay);
  return established && !negated;
}

function mentionHaystack(family: ChaseGateFamily, sourceText: string): string {
  if (!FAMILIES_AFFECTED_BY_INVENT_ADVISORY.has(family)) return sourceText;
  return stripDoNotInventAdvisory(sourceText);
}

export function familySupport(family: ChaseGateFamily, sourceText: string): FamilySupport {
  if (NEGATION_RES[family].test(sourceText)) return "negated";
  if (MENTION_RES[family].test(mentionHaystack(family, sourceText))) return "mentioned";
  return "absent";
}

/** Material families a single output line refers to. */
export function familiesInText(text: string): ChaseGateFamily[] {
  return GATE_FAMILIES.filter((f) => MENTION_RES[f].test(text));
}

const FAMILY_DISPLAY: Record<ChaseGateFamily, string> = {
  cctv: "CCTV",
  bwv: "body-worn video",
  cad_999: "CAD/999 material",
  custody_pace: "custody/PACE material",
  medical: "medical evidence",
  interview: "interview material",
  mg6_unused: "MG6/unused material",
  phone: "phone/device material",
  forensic: "forensic material",
  bank_financial: "banking and financial records",
};

const PROVISIONAL_NO_FAMILIES =
  "Position remains provisional on the current papers — listed material families are not safely confirmed in the bundle yet.";

export function familyDisplayName(family: ChaseGateFamily): string {
  return FAMILY_DISPLAY[family];
}

/** Confirm-none wording for explicitly negated material — never a chase. */
export function confirmNoneLine(family: ChaseGateFamily): string {
  const name = FAMILY_DISPLAY[family];
  return `The file indicates no ${name} is available — confirm in writing that none exists; absence may shift weight onto witness account quality and consistency.`;
}

export type ChaseLineGateResult =
  | { action: "keep" }
  | { action: "drop"; family: ChaseGateFamily }
  | { action: "replace"; family: ChaseGateFamily; replacement: string };

/**
 * Gate a single chase-style output line against the source bundle.
 * Non-chase lines and lines naming no known family always pass.
 * If sourceText is empty/unknown we cannot gate — pass through unchanged.
 */
export function gateChaseLine(line: string, sourceText: string | null | undefined): ChaseLineGateResult {
  if (!sourceText?.trim()) return { action: "keep" };
  if (!CHASE_VERB_RE.test(line)) return { action: "keep" };

  if (lineClaimsCctvMasterOrFullWindow(line)) {
    const cctvSupport = familySupport("cctv", sourceText);
    if (cctvSupport === "negated") {
      return { action: "replace", family: "cctv", replacement: confirmNoneLine("cctv") };
    }
    if (!isCctvMasterEstablished(sourceText)) {
      return { action: "drop", family: "cctv" };
    }
  } else if (lineClaimsCctvContinuity(line)) {
    const cctvSupport = familySupport("cctv", sourceText);
    if (cctvSupport === "negated") {
      return { action: "replace", family: "cctv", replacement: confirmNoneLine("cctv") };
    }
    if (!isCctvContinuityEstablished(sourceText)) {
      return { action: "drop", family: "cctv" };
    }
  } else if (lineClaimsPhoneDownload(line)) {
    const phoneSupport = familySupport("phone", sourceText);
    if (phoneSupport === "negated") {
      return { action: "replace", family: "phone", replacement: confirmNoneLine("phone") };
    }
    if (!isPhoneDownloadEstablished(sourceText)) {
      return { action: "drop", family: "phone" };
    }
  } else if (lineClaimsIdentificationProcedure(line)) {
    if (!isIdentificationProcedureEstablished(sourceText)) {
      return { action: "drop", family: "cctv" };
    }
  }

  const fams = familiesInText(line);
  if (!fams.length) return { action: "keep" };

  for (const family of fams) {
    const support = familySupport(family, sourceText);
    if (support === "negated") {
      return { action: "replace", family, replacement: confirmNoneLine(family) };
    }
    if (support === "absent") {
      return { action: "drop", family };
    }
  }
  return { action: "keep" };
}

/** Gate a list of chase lines; dedupes any confirm-none replacements. */
export function gateChaseLines(lines: string[], sourceText: string | null | undefined): string[] {
  const out: string[] = [];
  const seenReplacement = new Set<string>();
  for (const line of lines) {
    const res = gateChaseLine(line, sourceText);
    if (res.action === "keep") out.push(line);
    else if (res.action === "replace" && !seenReplacement.has(res.replacement)) {
      seenReplacement.add(res.replacement);
      out.push(res.replacement);
    }
  }
  return out;
}

/**
 * Expand compound battleboard chase templates into atomic family lines, then gate.
 * Prevents "Chase CAD + 999 + CCTV master" / "recording/transcript" from inventing
 * missing modalities when only one family (or a sibling modality) is on the papers.
 */
export function expandAndGateChaseLines(
  lines: string[],
  sourceText: string | null | undefined,
): string[] {
  const expanded = lines
    .flatMap((line) => expandCompoundChaseLine(line))
    .flatMap((line) => filterModalitySpecificChaseLine(line, sourceText));
  return gateChaseLines(expanded, sourceText);
}

function expandCompoundChaseLine(line: string): string[] {
  const t = line.trim();
  if (!t) return [];

  // Timeline lump: CAD + 999 + CCTV master
  if (/Chase CAD audit,\s*999 audio,\s*and CCTV master with continuity/i.test(t)) {
    return ["Chase CAD audit.", "Chase 999 audio.", "Chase CCTV master with continuity."];
  }
  if (/Chase CAD audit and 999 audio/i.test(t)) {
    return ["Chase CAD audit.", "Chase 999 audio."];
  }
  if (/Chase CCTV master and continuity/i.test(t)) {
    return ["Chase CCTV master with continuity."];
  }

  // Interview lump: recording/transcript (+ optional pre-interview disclosure)
  if (/Chase interview recording\s*\/\s*transcript and pre-interview disclosure/i.test(t)) {
    return [
      "Chase interview recording.",
      "Chase interview transcript.",
      "Chase pre-interview disclosure.",
    ];
  }
  if (/Chase interview recording\s*\/\s*transcript/i.test(t)) {
    return ["Chase interview recording.", "Chase interview transcript."];
  }

  return [t];
}

function filterModalitySpecificChaseLine(
  line: string,
  sourceText: string | null | undefined,
): string[] {
  const t = line.trim();
  if (!t || !sourceText?.trim()) return t ? [t] : [];

  // Drop CCTV *master* / full-window chase unless papers affirmatively establish that modality
  // (thin "listed CCTV/BWV" / review-whether-served must not keep a master invent line).
  if (lineClaimsCctvMasterOrFullWindow(t)) {
    if (!isCctvMasterEstablished(sourceText)) return [];
  }

  // Drop CCTV continuity chase unless papers affirmatively establish continuity (not officer continuity alone).
  if (lineClaimsCctvContinuity(t) && !lineClaimsCctvMasterOrFullWindow(t)) {
    if (!isCctvContinuityEstablished(sourceText)) return [];
  }

  // Drop BWV chase lines unless papers affirmatively establish full-export/clip/outstanding
  // (BWV stills served alone must not keep a full-export invent line).
  if (/\b(?:bwv|body[- ]?worn)\b/i.test(t)) {
    if (!isBwvFullExportEstablished(sourceText)) return [];
  }

  // Drop phone download / extraction chase unless papers establish download modality
  // (SIM/IMEI/subscriber alone must not keep a Full phone download invent line).
  if (lineClaimsPhoneDownload(t)) {
    if (!isPhoneDownloadEstablished(sourceText)) return [];
  }

  // Drop ID / VIPER / parade chase unless papers establish the procedure.
  if (lineClaimsIdentificationProcedure(t)) {
    if (!isIdentificationProcedureEstablished(sourceText)) return [];
  }

  // Drop interview *recording* chase unless recording modality is established
  // (PACE interview / transcript/summary alone must not keep a recording invent line).
  if (/\binterview recording\b/i.test(t) && !/\binterview transcript\b/i.test(t)) {
    if (!isInterviewRecordingEstablished(sourceText)) return [];
  }

  // CAD family — drop audit / 999-audio / lumped CAD chase from page-999 noise alone.
  if (
    /Chase CAD audit/i.test(t) ||
    /Chase 999 audio/i.test(t) ||
    /\bCAD\s*\/\s*999\b/i.test(t) ||
    /\bCAD\s*\/\s*999\s+audio\b/i.test(t)
  ) {
    if (!isCad999Established(sourceText)) return [];
    if (/Chase 999 audio/i.test(t)) {
      const audioEstablished =
        /999\s+audio|emergency\s+call\s+(?:recording|audio)|999\s+call\s+(?:recording|audio)/i.test(
          sourceText.replace(/\bno\s+999\s+audio\b[^.\n]{0,40}/gi, " "),
        );
      if (!audioEstablished) return [];
    }
  }

  return [t];
}

/**
 * Gate disclosure/material lines that name a family but may omit chase verbs
 * (workflow profile labels, MG6 chase bullets, assistant lists).
 */
export function gateMaterialLine(line: string, sourceText: string | null | undefined): ChaseLineGateResult {
  if (!sourceText?.trim()) return { action: "keep" };

  // Modality gate — listed CCTV/BWV alone must not keep Full Window / master / continuity labels.
  // Negated CCTV still becomes confirm-none (not a silent drop).
  if (lineClaimsCctvMasterOrFullWindow(line)) {
    const cctvSupport = familySupport("cctv", sourceText);
    if (cctvSupport === "negated") {
      return { action: "replace", family: "cctv", replacement: confirmNoneLine("cctv") };
    }
    if (!isCctvMasterEstablished(sourceText)) {
      return { action: "drop", family: "cctv" };
    }
  } else if (lineClaimsCctvContinuity(line)) {
    const cctvSupport = familySupport("cctv", sourceText);
    if (cctvSupport === "negated") {
      return { action: "replace", family: "cctv", replacement: confirmNoneLine("cctv") };
    }
    if (!isCctvContinuityEstablished(sourceText)) {
      return { action: "drop", family: "cctv" };
    }
  } else if (lineClaimsPhoneDownload(line)) {
    const phoneSupport = familySupport("phone", sourceText);
    if (phoneSupport === "negated") {
      return { action: "replace", family: "phone", replacement: confirmNoneLine("phone") };
    }
    if (!isPhoneDownloadEstablished(sourceText)) {
      return { action: "drop", family: "phone" };
    }
  } else if (lineClaimsIdentificationProcedure(line)) {
    if (!isIdentificationProcedureEstablished(sourceText)) {
      return { action: "drop", family: "cctv" };
    }
  }

  const fams = familiesInText(line);
  if (!fams.length) return { action: "keep" };
  for (const family of fams) {
    const support = familySupport(family, sourceText);
    if (support === "negated") {
      return { action: "replace", family, replacement: confirmNoneLine(family) };
    }
    if (support === "absent") {
      return { action: "drop", family };
    }
  }
  return { action: "keep" };
}

/** Gate material lines; dedupes confirm-none replacements. */
export function gateMaterialLines(lines: string[], sourceText: string | null | undefined): string[] {
  const out: string[] = [];
  const seenReplacement = new Set<string>();
  for (const line of lines) {
    const res = gateMaterialLine(line, sourceText);
    if (res.action === "keep") out.push(line);
    else if (res.action === "replace" && !seenReplacement.has(res.replacement)) {
      seenReplacement.add(res.replacement);
      out.push(res.replacement);
    }
  }
  return out;
}

/**
 * Gate compound solicitor prose (workflow case-wide lines, safe court lines)
 * so absent families drop out and negated families become confirm-none — never chase.
 */
export function gateProseAgainstSource(text: string, sourceText: string | null | undefined): string {
  if (!sourceText?.trim() || !text.trim()) return text;
  if (
    isCctvContinuityConfirmationOnly(sourceText) &&
    lineClaimsCctvContinuity(text) &&
    /\b(?:appears|remains)\s+outstanding\b/i.test(text)
  ) {
    return "CCTV continuity/provenance needs confirmation before the defence can rely on any CCTV point.";
  }
  const fams = familiesInText(text);
  if (!fams.length) return text;

  const mentioned: ChaseGateFamily[] = [];
  const negated: ChaseGateFamily[] = [];
  for (const family of fams) {
    const support = familySupport(family, sourceText);
    if (support === "mentioned") mentioned.push(family);
    else if (support === "negated") negated.push(family);
  }

  const confirmParts = negated
    .map((f) => confirmNoneLine(f))
    .filter((line, idx, arr) => arr.indexOf(line) === idx);

  if (!mentioned.length) {
    if (confirmParts.length) return confirmParts.join(" ");
    return PROVISIONAL_NO_FAMILIES;
  }

  const conditional = text.match(/^(.*?\bconditional on)\s+(.+)$/i);
  if (conditional) {
    const labels = mentioned.map((f) => familyDisplayName(f));
    const lead = conditional[1].trim();
    const gated = `${lead} served ${labels.join(", ")}.`;
    return confirmParts.length ? `${gated} ${confirmParts.join(" ")}` : gated;
  }

  if (confirmParts.length) return `${text} ${confirmParts.join(" ")}`;
  return text;
}
