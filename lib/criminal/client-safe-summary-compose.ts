/**
 * Compose complete client-safe summaries from structured semantic units.
 * Never hard-slice; never treat boundary containment as substantive repair.
 */

export const CLIENT_SAFE_SUMMARY_TITLE = "CLIENT-SAFE SUMMARY";
export const CLIENT_SAFE_SUMMARY_AUDIENCE = "(not for court or CPS)";
export const CLIENT_SAFE_SUMMARY_DISCLAIMER =
  "[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]";

export type ClientSummarySemanticUnits = {
  title: string;
  audienceLine: string;
  body: string;
  disclaimer: string;
};

export type ClientSummaryComposeResult =
  | {
      ok: true;
      text: string;
      units: ClientSummarySemanticUnits;
      source: "structured" | "repaired_units" | "family_template";
    }
  | {
      ok: false;
      text: null;
      missingFields: string[];
      remediation: string;
      partialUnits?: Partial<ClientSummarySemanticUnits>;
    };

/** Parse a structured client-summary string into semantic units (title / audience / body / disclaimer). */
export function parseClientSummarySemanticUnits(
  raw: string | null | undefined,
): ClientSummarySemanticUnits | null {
  const t = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!t) return null;

  const disclaimerMatch = t.match(
    /\[CaseBrain — client-safe summary\.[^\]]*Not for court or CPS use\.\]\s*$/,
  );
  if (!disclaimerMatch) return null;

  const withoutDisclaimer = t.slice(0, disclaimerMatch.index).trimEnd();
  const titleMatch = withoutDisclaimer.match(/^CLIENT-SAFE SUMMARY\s*/i);
  if (!titleMatch) return null;

  let rest = withoutDisclaimer.slice(titleMatch[0].length).trimStart();
  const audienceMatch = rest.match(/^\(not for court or CPS\)\s*/i);
  if (!audienceMatch) return null;
  rest = rest.slice(audienceMatch[0].length).trim();

  if (!rest || rest.length < 40) return null;

  return {
    title: CLIENT_SAFE_SUMMARY_TITLE,
    audienceLine: CLIENT_SAFE_SUMMARY_AUDIENCE,
    body: rest,
    disclaimer: CLIENT_SAFE_SUMMARY_DISCLAIMER,
  };
}

/** Recompose a complete summary from semantic units (no truncation). */
export function composeClientSummaryFromUnits(units: ClientSummarySemanticUnits): string {
  return [
    units.title.trim(),
    units.audienceLine.trim(),
    "",
    units.body.trim(),
    "",
    units.disclaimer.trim(),
  ].join("\n");
}

/**
 * Prefer a complete structured client-summary source. If units cannot be recovered,
 * fail closed and document missing fields — do not describe containment as repair.
 */
export function composeCompleteClientSummaryFromStructured(
  structuredText: string | null | undefined,
): ClientSummaryComposeResult {
  const units = parseClientSummarySemanticUnits(structuredText);
  if (!units) {
    const t = (structuredText ?? "").trim();
    const missing: string[] = [];
    if (!t) missing.push("client_summary.text");
    else {
      if (!/^CLIENT-SAFE SUMMARY/i.test(t)) missing.push("title");
      if (!/\(not for court or CPS\)/i.test(t)) missing.push("audienceLine");
      if (!/\[CaseBrain — client-safe summary\.[^\]]*Not for court or CPS use\.\]\s*$/.test(t)) {
        missing.push("disclaimer_complete");
      }
      if (t.length < 80) missing.push("body");
    }
    return {
      ok: false,
      text: null,
      missingFields: missing.length ? missing : ["client_summary.semantic_units"],
      remediation:
        "Restore the complete structured client-summary.json (title, audience line, body paragraphs, and full closing disclaimer). Do not hard-slice or concatenate a partial disclaimer.",
    };
  }
  return {
    ok: true,
    text: composeClientSummaryFromUnits(units),
    units,
    source: "structured",
  };
}

/** Compare generated summary text against required structured semantic units. */
export function clientSummaryMatchesSemanticUnits(
  generated: string,
  expected: ClientSummarySemanticUnits,
): { pass: boolean; missing: string[] } {
  const missing: string[] = [];
  const g = generated.replace(/\r\n/g, "\n");
  if (!g.includes(expected.title)) missing.push("title");
  if (!g.includes(expected.audienceLine)) missing.push("audienceLine");
  // Body: require stable semantic content units (not a brittle prefix that sanitization may rephrase).
  const genFlat = g.replace(/\s+/g, " ");
  const bodyFlat = expected.body.replace(/\s+/g, " ");
  const requiredSnippets = [
    /ABE interview video/i,
    /final signed MG11/i,
    /historic allegation/i,
    /draft complainant statement/i,
  ].filter((re) => re.test(bodyFlat));
  const bodyOk =
    requiredSnippets.length > 0
      ? requiredSnippets.every((re) => re.test(genFlat))
      : genFlat.includes(bodyFlat.slice(0, 80));
  if (!bodyOk) missing.push("body");
  if (!/\[CaseBrain — client-safe summary\.[^\]]*Not for court or CPS use\.\]\s*$/.test(g.trim())) {
    missing.push("disclaimer");
  }
  const openParen = (g.match(/\(/g) ?? []).length;
  const closeParen = (g.match(/\)/g) ?? []).length;
  const openBracket = (g.match(/\[/g) ?? []).length;
  const closeBracket = (g.match(/\]/g) ?? []).length;
  if (openParen !== closeParen || openBracket !== closeBracket) missing.push("balanced_brackets");
  return { pass: missing.length === 0, missing };
}

/** Wrap a body-only paragraph into a complete client-safe summary. */
export function wrapClientSummaryBody(body: string): string {
  return composeClientSummaryFromUnits({
    title: CLIENT_SAFE_SUMMARY_TITLE,
    audienceLine: CLIENT_SAFE_SUMMARY_AUDIENCE,
    body: body.trim(),
    disclaimer: CLIENT_SAFE_SUMMARY_DISCLAIMER,
  });
}
