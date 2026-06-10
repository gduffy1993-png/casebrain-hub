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
  | "medical"
  | "interview"
  | "mg6_unused"
  | "phone"
  | "forensic"
  | "bank_financial";

export type FamilySupport = "mentioned" | "negated" | "absent";

const MENTION_RES: Record<ChaseGateFamily, RegExp> = {
  cctv: /\bcctv\b|video\s+footage|camera\s+footage|dashcam|master\s+footage|\bfootage\b/i,
  bwv: /\bbwv\b|body[-\s]?worn/i,
  cad_999: /\b999\b|\bcad\b|command\s+(?:and\s+)?(?:control|dispatch)|control[-\s]?room\s+log|dispatch\s+log|emergency\s+call/i,
  medical: /\bmedical\b|hospital|a\s*&\s*e\b|ambulance|paramedic|\bgp\s+records?\b|\bfme\b|pathology|injury\s+report/i,
  interview: /\binterview\b|\bpace\b|custody\s+record/i,
  mg6_unused: /\bmg6\b|unused\s+material|disclosure\s+schedule|schedule\s+of\s+(?:unused|non[-\s]?sensitive)/i,
  phone: /\bphone\b|\bmobile\b|handset|device\s+download|device\s*\/\s*login|login\s+audit|ip\s*\/\s*access|\bsim\b|\bimei\b|subscriber|phone\s+attribution|phone\s+extraction/i,
  forensic: /forensic|\bdna\b|fingerprint|\bswab\b/i,
  bank_financial:
    /\bbank\b|banking|account\s+control|transaction|statement|poca|source.of.funds|mailbox|email\s+(?:export|source)|bookkeeper|accountant/i,
};

const NEGATION_RES: Record<ChaseGateFamily, RegExp> = {
  cctv: /\bno\s+cctv\b|cctv\s+(?:is|was)?\s*not\s+available|without\s+cctv|no\s+(?:cctv|camera)\s+(?:footage|coverage)|no\s+footage\s+(?:exists|available|was)|cctv\s+does\s+not\s+exist|no\s+cctv\s+(?:was\s+)?(?:recovered|obtained|seized|in\s+operation)/i,
  bwv: /\bno\s+bwv\b|bwv\s+(?:is|was)?\s*not\s+(?:available|activated|worn)|no\s+body[-\s]?worn/i,
  cad_999: /no\s+999\s+call|no\s+cad\s+(?:log|record|entry)|999\s+call\s+not\s+(?:made|available)/i,
  medical: /no\s+medical\s+(?:evidence|records?|notes?|report|treatment)|did\s+not\s+(?:seek|require)\s+medical/i,
  interview: /no\s+interview\s+(?:was\s+)?(?:conducted|held)|declined\s+interview|interview\s+not\s+(?:conducted|recorded)/i,
  mg6_unused: /no\s+(?:mg6|unused\s+material|disclosure\s+schedule)\s+(?:exists|available|served|prepared)/i,
  phone: /no\s+(?:phone|mobile|handset|device)\s+(?:was\s+)?(?:seized|recovered|examined)/i,
  forensic: /no\s+forensic\s+(?:evidence|material|examination)|no\s+dna\s+(?:was\s+)?(?:recovered|found|obtained)/i,
  bank_financial: /no\s+(?:bank|banking|account)\s+(?:records?|statements?|material)|no\s+financial\s+records?/i,
};

const CHASE_VERB_RE = /\b(chase|obtain|request|provide|serve|secure|pursue|outstanding|awaiting|not\s+(?:yet\s+)?served)\b/i;

const GATE_FAMILIES = Object.keys(MENTION_RES) as ChaseGateFamily[];

export function familySupport(family: ChaseGateFamily, sourceText: string): FamilySupport {
  if (NEGATION_RES[family].test(sourceText)) return "negated";
  if (MENTION_RES[family].test(sourceText)) return "mentioned";
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
  medical: "medical evidence",
  interview: "interview material",
  mg6_unused: "MG6/unused material",
  phone: "phone/device material",
  forensic: "forensic material",
  bank_financial: "bank/financial material",
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
 * Gate disclosure/material lines that name a family but may omit chase verbs
 * (workflow profile labels, MG6 chase bullets, assistant lists).
 */
export function gateMaterialLine(line: string, sourceText: string | null | undefined): ChaseLineGateResult {
  if (!sourceText?.trim()) return { action: "keep" };
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
